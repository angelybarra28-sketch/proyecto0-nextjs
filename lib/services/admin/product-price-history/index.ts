export {
  listProductPriceHistory,
  recordProductPriceChange,
} from './history.service';
export { fetchProductPriceHistory } from './history-client';
export type {
  PriceHistoryResponse,
  PriceHistorySummary,
  ProductPriceHistoryEntry,
  RecordProductPriceChangeInput,
} from './types';
