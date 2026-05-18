export interface Entry {
  id: number;
  srNo: number | null;
  serviceName: string;
  category: string | null;
  billingCompany: string | null;
  vendor: string | null;
  expiryDate: string | null;
  autoRenewal: boolean;
  owner: string | null;
  criticality: string | null;
  lastRenewalDate: string | null;
  renewalPeriod: number | null;
  annualCost: number | null;
  paymentMethod: string | null;
  invoiceRef: string | null;
  financeEmail: string | null;
  adminEmail: string | null;
  vendorEmail: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EntryFormData = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>;

export interface DashboardStats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  noExpiry: number;
  totalAnnualCost: number;
}
