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
  isVisibleToCustomer?: boolean;
  
  // Inventory tracking fields
  trackInventory?: boolean;
  inventoryCount?: number;
  lowStockAlert?: number;

  // Recipe and Ingredients fields
  recipe?: {
    ingredientId: string;
    quantity: number;
    unit?: string;
  }[];
  isIngredient?: boolean;
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

export interface Area {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface Table {
  id: string;
  name: string;
  status: 'available' | 'occupied' | 'reserved';
  qrCode?: string; // String encoded in QR, e.g., tableId
  currentOrderId?: string;
  capacity?: number;
  areaId?: string;
}

export interface Order {
  id: string;
  billCode: string;
  tableId?: string; // Link to table if it's a dine-in order
  tableName?: string; // Cached table name for easy display
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: string; // 'cod' | 'banking'
  items: OrderItem[];
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  depositAmount?: number;
  promoCodeUsed?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  note?: string;
  adminNote?: string;
  cancellationReason?: string;
  createdBy?: string; // Tên nhân viên hoặc "Khách"
  paidBy?: string; // Tên nhân viên thu tiền
}

export interface Staff {
  id: string;
  fullName: string;
  username: string;
  password: string;
  phone: string;
  birthYear: number;
  role: string;
  avatar: string;
  pin?: string;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  notifyNewOrder: boolean;
  notifyPayment: boolean;
  notifyCancel: boolean;
  notifySummaryEnabled: boolean;
  notifySummaryTime: string; // e.g., "22:00"
  lastSummarySentDate?: string;
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
  theme?: 'cyberpunk' | 'aura2026' | 'dai';
  useDynamicQrAmount?: boolean;
  adminPin?: string;
  staff?: Staff[];
  roles?: string[];
  telegram?: TelegramConfig;
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

export interface ActivityLog {
  id: string;
  staffUsername: string;
  action: string;
  details?: string;
  timestamp: number;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  role: 'admin' | 'cashier';
  isRead: boolean;
  createdAt: number;
  relatedUrl?: string;
}

export interface InventoryReceiptItem {
  productId: string;
  productName: string;
  quantityAdded: number;
  costOnReceipt: number;
  priceOnReceipt: number;
  reason?: string; // Reason for adjustment/audit discrepancies
}

export interface InventoryReceipt {
  id: string;
  receiptCode: string;
  createdAt: string;
  createdBy: string;
  items: InventoryReceiptItem[];
  totalCost: number;
  totalItems: number;
  notes?: string;
  isAdjustment?: boolean; // True if this receipt represents an inventory recount/audit adjustment
}

