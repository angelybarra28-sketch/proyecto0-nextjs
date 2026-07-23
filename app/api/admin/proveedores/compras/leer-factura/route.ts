import { NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { requireAdminUser } from '@/lib/auth/server';
import { errorResponse } from '@/lib/server/apiErrors';
import { createRequestContext, logServerError } from '@/lib/server/logging';
import { PaddleOCRReader } from '@/lib/invoice-reader/readers/paddle-ocr';
import { parseInvoice } from '@/lib/invoice-reader/parser';
import type { OcrResult } from '@/lib/invoice-reader/types';

const FIVE_MB = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const context = createRequestContext(request);
  let tempPath: string | null = null;

  try {
    const authError = await requireAdminUser();
    if (authError) return authError;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse(new Error('Archivo de imagen requerido'), context.requestId, 400);
    }

    if (!file.type.startsWith('image/')) {
      return errorResponse(new Error('Solo se admiten imágenes'), context.requestId, 400);
    }

    if (file.size > FIVE_MB) {
      return errorResponse(new Error('La imagen no puede superar los 5MB'), context.requestId, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() ?? 'png';
    tempPath = join(tmpdir(), `factura-${randomUUID()}.${ext}`);

    await writeFile(tempPath, buffer);

    const ocrTimeout = parseInt(process.env.OCR_TIMEOUT_MS ?? '', 10) || 30000;
    const reader = new PaddleOCRReader(ocrTimeout);
    const ocrResult: OcrResult = await reader.read(tempPath);

    const invoiceData = parseInvoice(ocrResult);

    return NextResponse.json(
      { success: true, data: invoiceData, ocrResult, tempPath },
      { headers: { 'x-request-id': context.requestId } },
    );
  } catch (error) {
    logServerError({ area: 'admin.leer-factura', action: 'ocr', requestId: context.requestId, error });
    return errorResponse(error, context.requestId, 500);
  } finally {
    if (tempPath) {
      unlink(tempPath).catch((err) =>
        console.warn('[leer-factura] No se pudo limpiar archivo temporal:', err),
      );
    }
  }
}
