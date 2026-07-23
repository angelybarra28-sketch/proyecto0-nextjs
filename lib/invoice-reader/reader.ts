import type { OcrResult } from './types';

// TODO v2.0: agregar método readFromBuffer(buffer: Buffer) para soportar readers
// que no requieren archivo temporal (OpenAI, LLM, APIs cloud)
// TODO v2.0: agregar método supportsMimeType(mime: string): boolean para
// que el router pueda elegir el reader según el formato (PDF, JPG, PNG)
export interface FacturaReader {
  read(imagePath: string): Promise<OcrResult>;
}
