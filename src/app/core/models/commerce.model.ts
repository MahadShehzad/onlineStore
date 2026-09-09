export interface CartLine {
  id: string;
  productId: string;
  name: string;
  image: string;
  slug: string;
  vendorId: string;
  storeName: string;
  variantId: string | null;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  stockAvailable: number;
}

export interface Cart {
  lines: CartLine[];
  subtotal: number;
  count: number;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, 'id'>;

export type OrderStatus =
  | 'Pending'
  | 'Accepted'
  | 'Shipped'
  | 'Delivered'
  | 'Rejected'
  | 'Cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  customerId: string;
  customerName: string;
  vendorId: string;
  storeName: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  commissionRate: number;
  commissionAmount: number;
  shippingAddress: Address | null;
  paymentMethod: string;
  paymentReference: string;
  createdAt: string;
  acceptedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: OrderItem[];
}

export interface Dispute {
  id: string;
  orderId: string;
  raisedByUserId: string;
  raisedByName: string;
  subject: string;
  description: string;
  status: 'Open' | 'Resolved' | 'Rejected';
  resolution: string;
  createdAt: string;
  resolvedAt: string | null;
}
