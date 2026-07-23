import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { platform } from 'os';
import type { FacturaReader } from '../reader';
import type { OcrResult } from '../types';

const execFileAsync = promisify(execFile);

const SCRIPT_PATH = resolve(process.cwd(), 'python/ocr/ocr_client.py');

const PYTHON_COMMANDS = platform() === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python'];

const DEFAULT_TIMEOUT_MS = 30_000;

const MAX_BUFFER = 50 * 1024 * 1024;

function logDebug(...args: unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[PaddleOCRReader]', ...args);
  }
}

export class PaddleOCRReader implements FacturaReader {
  private timeoutMs: number;

  constructor(timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  async read(imagePath: string): Promise<OcrResult> {
    const startTime = Date.now();
    console.log(`[PaddleOCRReader] Iniciando OCR: ${imagePath}`);

    let lastError: Error | null = null;

    for (const cmd of PYTHON_COMMANDS) {
      const startedAt = Date.now();
      console.log(`[PaddleOCRReader] Intentando con comando: ${cmd}`);

      try {
        const result = await this.tryExec(cmd, imagePath);
        const elapsed = Date.now() - startTime;
        console.log(`[PaddleOCRReader] OCR completado en ${elapsed}ms (comando: ${cmd}, exit code: 0)`);
        return result;
      } catch (err) {
        const elapsed = Date.now() - startedAt;
        lastError = err instanceof Error ? err : new Error(String(err));
        console.log(`[PaddleOCRReader] Falló con "${cmd}" tras ${elapsed}ms: ${lastError.message}`);

        if (lastError.message.startsWith('Python not found')) {
          console.log(`[PaddleOCRReader] Reintentando con otro comando...`);
          continue;
        }
        throw lastError;
      }
    }

    const totalElapsed = Date.now() - startTime;
    console.log(`[PaddleOCRReader] Todos los comandos fallaron tras ${totalElapsed}ms`);
    const commandsTried = PYTHON_COMMANDS.join(', ');
    if (!lastError || lastError.message.startsWith('Python not found')) {
      throw new Error(`No se encontró Python (intenté: ${commandsTried})`);
    }
    throw lastError;
  }

  private async tryExec(pythonCmd: string, imagePath: string): Promise<OcrResult> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, this.timeoutMs);

    try {
      const child = await execFileAsync(pythonCmd, [SCRIPT_PATH, imagePath], {
        maxBuffer: MAX_BUFFER,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (child.stderr) {
        console.warn('[PaddleOCRReader] stderr:', child.stderr);
      }

      logDebug(`stdout (primeros 200 chars): ${child.stdout.slice(0, 200)}`);

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(child.stdout);
      } catch {
        throw new Error(
          `La salida de PaddleOCR no es JSON válido: ${child.stdout.slice(0, 500)}`,
        );
      }

      if (parsed.error) {
        const detail = parsed.traceback
          ? String(parsed.traceback).split('\n').slice(-3).join('; ')
          : '';
        throw new Error(
          `PaddleOCR: ${parsed.error}${detail ? ` (${detail})` : ''}`,
        );
      }

      return {
        text: parsed.text as string,
        lines: parsed.lines as OcrResult['lines'],
        raw: parsed.raw as OcrResult['raw'],
      } satisfies OcrResult;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err?.name === 'AbortError' || err?.code === 'ABORT_ERR') {
        throw new Error(
          `La operación OCR excedió el tiempo máximo de ${this.timeoutMs / 1000}s. Verificá que la imagen sea legible e intentá de nuevo.`,
        );
      }

      if (err?.code === 'ENOENT') {
        throw new Error(`Python not found: ${pythonCmd}`);
      }

      const stderr = (err?.stderr ?? '') as string;
      if (
        stderr.includes('Microsoft Store') ||
        stderr.includes('App execution aliases') ||
        err?.message?.includes('Microsoft Store') ||
        err?.message?.includes('App execution aliases')
      ) {
        throw new Error(`Python not found: ${pythonCmd} (Microsoft Store redirector)`);
      }

      if (err?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
        throw new Error('PaddleOCR excedió el límite de memoria de salida (50MB)');
      }

      const stdout = (err?.stdout ?? '') as string;
      if (stdout) {
        try {
          const errorParsed = JSON.parse(stdout);
          if (errorParsed.error) {
            const detail = errorParsed.traceback
              ? String(errorParsed.traceback).split('\n').slice(-3).join('; ')
              : '';
            throw new Error(
              `PaddleOCR: ${errorParsed.error}${detail ? ` (${detail})` : ''}`,
            );
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message.startsWith('PaddleOCR:')) {
            throw parseErr;
          }
        }
      }

      const exitCode = err?.signal
        ? ` (señal: ${err.signal})`
        : '';
      throw new Error(
        `PaddleOCR falló${exitCode}: ${stderr || err?.message || 'Error desconocido'}`,
      );
    }
  }
}
