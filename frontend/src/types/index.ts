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
  // Active allocation (included in API responses)
  allocations?: {
    id: number;
    employee: { id: number; name: string; empId: string; department: string };
    allocatedAt: string;
  }[];
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
    asset: { id: number; serviceName: string; category: string | null; assetTag: string | null };
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

export interface TaskComment {
  id: number;
  taskId: number;
  author: string;
  content: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: number;
  taskId: number;
  filename: string;
  filesize: number | null;
  mimetype: string | null;
  createdAt: string;
}

export interface TaskActivity {
  id: number;
  taskId: number;
  action: string;
  details: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Task {
  id: number;
  taskName: string;
  projectName: string | null;
  location: string | null;
  department: string | null;
  description: string | null;
  assignedTo: string | null;
  startDate: string;
  endDate: string;
  priority: string;
  status: string;
  dependencyIds: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  notes: string | null;
  completionPct: number;
  milestone: boolean;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  activities: TaskActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: number;
  srNo: number | null;
  name: string;
  type: string;
  billingCompany: string | null;
  registrar: string | null;
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

export type SubscriptionFormData = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>;

export interface TaskStats {
  total: number;
  byStatus: Record<string, number>;
  byLocation: Record<string, number>;
  upcoming: number;
  delayed: number;
}


