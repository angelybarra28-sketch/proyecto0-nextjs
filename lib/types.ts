export interface Product {
  id: number;
  name: string;
  price: string;
  priceNumber: number;
  discount?: string;
  imageUrl?: string;
  carouselImages?: string[];
  description?: string;
  slug: string;
  categoria: string;
  stock: number;
  destacado: boolean;
  category?: string;
  specifications?: {
    size: string;
    material: string;
    firmness: string;
    withPillow: string;
    color: string;
  };
  features?: string[];
}

export interface ProductSection {
  title: string;
  products: Product[];
}

export interface NavLink {
  label: string;
  href: string;
  submenu?: NavLink[];
}

export interface ContactInfo {
  phone: string;
  email: string;
  whatsapp: string;
  address?: string;
}

// Tipos para autenticación de usuarios
export interface User {
  id: string;
  dni: string;
  nombreApellido: string;
  telefono: string;
  email: string;
  domicilio: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthLoading: boolean;
}

// Tipo para administración de usuarios (fuentes: auth.users + profiles)
export interface AdminUserView {
  id: string;
  email: string;
  nombreApellido: string;
  telefono: string;
  domicilio: string;
  dni: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  isActive: boolean;
  createdAt: string;
  hasProfile: boolean;
}

// ========================================
// TIPOS PARA SISTEMA DE FILTROS PROFESIONAL
// ========================================

/**
 * Interfaz para filtros de productos
 * Todos los campos son OPCIONALES para máxima flexibilidad
 * Permite filtros individuales o combinados
 */
export interface ProductFilters {
  // Filtros básicos
  categoria?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  discountOnly?: boolean;
  tags?: string[];
  
  // Filtros avanzados (futuros)
  searchQuery?: string;
  sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'popularity';
  page?: number;
  limit?: number;
}

/**
 * Opciones disponibles para UI de filtros
 * Contiene valores únicos y conteos para dropdowns/checkboxes
 */
export interface FilterOptions {
  categories: Array<{
    name: string;
    count: number;
  }>;
  priceRange: {
    min: number;
    max: number;
    step?: number;
  };
  discountPercentages: number[];
  tags: Array<{
    name: string;
    count: number;
  }>;
  totalProducts: number;
  filteredProducts: number;
}

/**
 * Resultado de búsqueda con filtros aplicados
 * Útil para UI que muestra resultados y opciones actualizadas
 */
export interface FilteredProductsResult {
  products: Product[];
  total: number;
  filters: ProductFilters;
  options: FilterOptions;
}

/**
 * Estadísticas de productos para cache y analytics
 */
export interface ProductStats {
  totalProducts: number;
  categoriesCount: Map<string, number>;
  priceRange: { min: number; max: number };
  discountedCount: number;
  availableCount: number;
  averagePrice: number;
  tagFrequency: Map<string, number>;
}

// ========================================
// TIPOS PARA CUENTA CORRIENTE (CRÉDITO)
// ========================================

export interface CreditAccount {
  id: string;
  customerId: string;
  operationNumber?: string | null;
  productName: string;
  quantity: number;
  installmentCount: number;
  installmentAmount: number;
  saleDate: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  originMonth?: number | null;
  originYear?: number | null;
}

export type CreditPaymentMethod = 'EFECTIVO' | 'MERCADO_PAGO' | 'TRANSFERENCIA' | 'OTRO';

export interface CreditPayment {
  id: string;
  creditAccountId: string;
  amount: number;
  paymentMethod: CreditPaymentMethod;
  paymentDate: string;
  notes: string;
  createdAt: string;
}

export interface CreditAccountItem {
  id: string;
  creditAccountId: string;
  productName: string;
  quantity: number;
  unitPrice?: number | null;
  createdAt: string;
}

export interface CreditAccountSummary extends CreditAccount {
  total: number;
  paid: number;
  remaining: number;
  paymentCount: number;
  customerName?: string;
  items?: CreditAccountItem[];
  lastPaymentDate?: string | null;
}

export interface MonthlyCreditMetric {
  month: string;
  collected: number;
}

export interface CreditDashboard {
  totalFinanced: number;
  totalCollected: number;
  totalPending: number;
  customerCount: number;
  customersWithDebt: number;
  activeAccounts: number;
  finishedAccounts: number;
  currentMonthCollected: number;
  previousMonthCollected: number;
  monthlyCollection: MonthlyCreditMetric[];
}

export interface CreateCreditAccountInput {
  customerId: string;
  operationNumber?: string;
  productName?: string;
  quantity?: number;
  items?: Array<{
    productName: string;
    quantity: number;
    unitPrice?: number;
  }>;
  installmentCount?: number;
  installmentAmount: number;
  saleDate?: string;
  notes?: string;
}

export interface RegisterCreditPaymentInput {
  amount: number;
  paymentMethod?: CreditPaymentMethod;
  paymentDate?: string;
  notes?: string;
}

// ========================================
// TIPOS PARA CRONOGRAMA DE CUOTAS Y COBRANZA
// ========================================

export interface CreditInstallment {
  id: string;
  creditAccountId: string;
  installmentNumber: number;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  createdAt: string;
  updatedAt: string;
}

export interface CreditPaymentAllocation {
  id: string;
  creditPaymentId: string;
  creditInstallmentId: string;
  amount: number;
  createdAt: string;
}

export interface CreditCollectionNote {
  id: string;
  creditAccountId: string;
  contactType: 'CALL' | 'WHATSAPP' | 'VISIT' | 'OTHER';
  result: 'NOTE' | 'PROMISE' | 'NO_CONTACT' | 'PARTIAL_PAYMENT' | 'PAID' | 'OTHER';
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface CreditAccountDetail extends CreditAccountSummary {
  customer: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  installments: CreditInstallment[];
  payments: CreditPayment[];
  collectionNotes: CreditCollectionNote[];
  items: CreditAccountItem[];
}

export interface CollectionRouteItem {
  creditAccountId: string;
  customerId: string;
  customerFullName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  operationNumber?: string | null;
  productName: string;
  totalDebt: number;
  overdueAmount: number;
  daysOverdue: number;
  firstOverdueDate: string;
  installmentCount: number;
  paidInstallments: number;
  overdueInstallments: number;
}

// ========================================
// TIPOS PARA IMPORTADOR DE CARTERA
// ========================================

export interface ImportPortfolioPayment {
  amount: number;
  paymentDate: string;
  paymentMethod?: CreditPaymentMethod;
  notes?: string;
}

export interface ImportPortfolioRow {
  operationNumber?: string | null;
  customerFullName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  betweenStreets?: string | null;
  productName: string;
  // TODO: leer quantity desde Excel cuando se defina la columna de importación
  quantity?: number;
  saleDate: string;
  installmentCount: number;
  installmentAmount: number;
  totalAmount: number;
  accumulatedPayment: number;
  remainingAmount: number;
  payments: ImportPortfolioPayment[];
  originMonth?: number | null;
  originYear?: number | null;
}

export interface ImportValidationError {
  rowIndex: number;
  message: string;
}

export interface ImportValidationWarning {
  rowIndex: number;
  message: string;
}

export interface ImportPortfolioStats {
  emptyProductCount: number;
  missingSaleDateCount: number;
  missingAddressCount: number;
  missingOperationNumberCount: number;
  missingNameCount: number;
  duplicateInFileCount: number;
  existingInDbCount: number;
  invalidCount: number;
  importableCount: number;
}

export interface ImportPortfolioPreview {
  rows: ImportPortfolioRow[];
  rowCount: number;
  uniqueCustomers: number;
  accountCount: number;
  totalPayments: number;
  totalFinanced: number;
  totalCollected: number;
  stats: ImportPortfolioStats;
  errors: ImportValidationError[];
  warnings: ImportValidationWarning[];
  missingColumns: string[];
}

export interface ImportPortfolioResult {
  imported: number;
  failed: number;
  skipped: number;
  details: { rowIndex: number; creditAccountId?: string; error?: string }[];
  skippedDetails?: { rowIndex: number; operationNumber?: string | null; reason: string }[];
}
