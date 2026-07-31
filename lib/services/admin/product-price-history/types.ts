export type ProductPriceHistoryEntry = {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string | null;
  changedByName: string | null;
  reason: string | null;
  createdAt: string;
};

export type PriceHistorySummary = {
  currentPrice: number;
  firstPrice: number | null;
  changeCount: number;
  lastChangeAt: string | null;
};

export type PriceHistoryResponse = {
  history: ProductPriceHistoryEntry[];
  summary: PriceHistorySummary;
};

export type RecordProductPriceChangeInput = {
  productId: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string | null;
  reason?: string | null;
};
