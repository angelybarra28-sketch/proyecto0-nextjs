export interface CustomerInsert {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
}

export interface CustomerRow extends CustomerInsert {
  id: string;
}

export interface SaleCustomerView {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
}
