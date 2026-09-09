import { ProductSummary } from './catalog.model';

export interface Vendor {
  id: string;
  userId: string;
  ownerName: string;
  ownerEmail: string;
  storeName: string;
  storeLogo: string;
  storeBanner: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason: string;
  commissionRate: number;
  productCount: number;
  createdAt: string;
}

export interface StoreSettingsInput {
  storeName: string;
  description: string;
  storeLogo: string;
  storeBanner: string;
}

export interface TimeSeriesPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface VendorAnalytics {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  productCount: number;
  commissionPaid: number;
  daily: TimeSeriesPoint[];
  monthly: TimeSeriesPoint[];
  topProducts: ProductSummary[];
}

export interface VendorLeaderRow {
  vendorId: string;
  storeName: string;
  revenue: number;
  orders: number;
}

export interface AdminAnalytics {
  gmv: number;
  commissionEarned: number;
  orderCount: number;
  customerCount: number;
  vendorCount: number;
  pendingVendorCount: number;
  productCount: number;
  openDisputeCount: number;
  monthly: TimeSeriesPoint[];
  topVendors: VendorLeaderRow[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Customer' | 'Vendor' | 'Admin';
  isBlocked: boolean;
  createdAt: string;
  orderCount: number;
  vendorStatus: string | null;
}

export interface PlatformSetting {
  defaultCommissionRate: number;
  shippingFlatFee: number;
  currencyCode: string;
  currencySymbol: string;
}
