import type { FacturaParser } from '../types';
import { GenericParser } from './generic.parser';
import { ZafiroParser } from './zafiro.parser';

// TODO v2.0: implementar detectParser basado en ML: usar embeddings de texto
// para clasificar factura por proveedor en lugar de keywords fijas.
// TODO v2.0: agregar parser autoadaptativo que almacene correcciones del usuario
// y ajuste sus reglas automáticamente (aprendizaje online).
const REGISTERED_PARSERS: FacturaParser[] = [
  new ZafiroParser(),
  new GenericParser(),
];

export function detectParser(lines: { text: string }[]): FacturaParser {
  for (const parser of REGISTERED_PARSERS) {
    if (parser.detect(lines as any)) {
      return parser;
    }
  }
  return REGISTERED_PARSERS[REGISTERED_PARSERS.length - 1];
}
