export interface Customer {                
  phone: string;
  firstName: string;
  totalOrders: number;
  totalSpent: number;
  address: string;
  debtOrders: number;
  debtAmount: number;
  notes: string[];
}                

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  cost?: number; // Added cost field
  image: string; // Emoji character or URL
  description: string;
  isAvailable: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Emoji character or Lucide icon name
  sortOrder?: number;
  type?: 'food' | 'drink';
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceOnOrder: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'debt';

export interface Order {
  id: string;
  billCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: string; // 'cod' | 'banking'
  items: OrderItem[];
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  promoCodeUsed?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  note?: string;
  adminNote?: string;
  cancellationReason?: string;
}

export interface StoreConfig {
  name: string;
  address: string;
  phone: string;
  zaloHotline: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  openHours: string;
  customQrCodeUrl?: string;
  logoUrl?: string;
  theme?: 'standard' | 'vista' | 'cyberpunk' | 'win11';
}

export interface Promotion {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // e.g. 10 for percentage, 20000 for fixed
  minOrderValue: number;
  isActive: boolean;
  maxUsageCount?: number; // 0 or undefined for no limit
  startDate?: string; // ISO datetime string
  endDate?: string; // ISO datetime string
}

export interface CustomerCookieData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: string;
}
