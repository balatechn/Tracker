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
  // Physical asset fields
  assetTag: string | null;
  serialNumber: string | null;
  location: string | null;
  condition: string | null;
  assetStatus: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  warrantyYears: number | null;
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

export interface Employee {
  id: number;
  empId: string;
  name: string;
  email: string;
  department: string;
  designation: string | null;
  phone: string | null;
  manager: string | null;
  status: string;
  joiningDate: string | null;
  exitDate: string | null;
  allocations?: {
    id: number;
    asset: { id: number; serviceName: string; category: string | null };
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Allocation {
  id: number;
  assetId: number;
  asset: {
    id: number;
    serviceName: string;
    category: string | null;
    assetTag: string | null;
    serialNumber: string | null;
    location: string | null;
  };
  employeeId: number;
  employee: {
    id: number;
    name: string;
    empId: string;
    department: string;
    email: string;
  };
  allocatedAt: string;
  returnedAt: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetRequest {
  id: number;
  requestType: string;
  requestedBy: string;
  assetId: number | null;
  description: string;
  status: string;
  approvalStage: string;
  approvedBy: string | null;
  rejectedBy: string | null;
  comments: string | null;
  priority: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  entityName: string | null;
  userId: string;
  details: string | null;
  createdAt: string;
}

