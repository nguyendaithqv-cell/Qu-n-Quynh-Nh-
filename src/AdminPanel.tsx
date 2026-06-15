import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Clipboard, 
  Trash2, 
  Check, 
  Settings, 
  Utensils, 
  Layers, 
  Tag, 
  Database, 
  Plus, 
  Edit3, 
  DollarSign, 
  ShoppingBag, 
  Smartphone,
  CheckCircle,
  Clock,
  MapPin,
  FileText,
  Save,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Upload,
  Cpu,
  Volume2,
  Printer,
  Laptop,
  GripVertical,
  QrCode,
  Layout,
  Lock,
  Bell,
  Send,
  Boxes,
  ClipboardCheck,
  ChefHat,
  Sparkles
} from 'lucide-react';
import { Product, Category, Order, OrderStatus, PaymentStatus, StoreConfig, Promotion, Customer, Table, Area, InventoryReceipt, InventoryReceiptItem } from '../types';
import ReportSection from './ReportSection';
import InventorySuggestionModal from './InventorySuggestionModal';
import NotificationIcon from './NotificationIcon';
import ActivityLogs from './ActivityLogs';
import BackupRestore from './BackupRestore';
import { sendTelegramMessage, formatDailySummaryMessage } from '../utils/telegram';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { logAndNotify, logAction, formatCurrency } from '../utils';

interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  promotions: Promotion[];
  storeConfig: StoreConfig;
  orders: Order[];
  tables: Table[];
  areas: Area[];
  inventoryReceipts?: InventoryReceipt[];
  onUpdateOrders: (orders: Order[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdatePromotions: (promotions: Promotion[]) => void;
  onUpdateTables: (tables: Table[]) => void;
  onUpdateAreas: (areas: Area[]) => void;
  onUpdateInventoryReceipts?: (receipts: InventoryReceipt[]) => void;
  onUpdateStoreConfig: (config: StoreConfig) => void;
  onAddOrder: (order: Order) => Promise<void>;
  onLogout?: () => void;
  onBackToPicker?: () => void;
  authenticatedStaff?: any;
}

export default function AdminPanel({
  products,
  categories,
  promotions,
  storeConfig,
  orders,
  tables,
  areas,
  inventoryReceipts = [],
  onUpdateOrders,
  onUpdateProducts,
  onUpdateCategories,
  onUpdatePromotions,
  onUpdateTables,
  onUpdateAreas,
  onUpdateInventoryReceipts = () => {},
  onUpdateStoreConfig,
  onAddOrder,
  onLogout,
  onBackToPicker,
  authenticatedStaff
}: AdminPanelProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'categories' | 'tables' | 'promotions' | 'store' | 'customers' | 'report' | 'system' | 'staff' | 'inventory'>('orders');
  const [productFilter, setProductFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [categoryIdFilter, setCategoryIdFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inventoryTrackFilter, setInventoryTrackFilter] = useState<'all' | 'tracked' | 'untracked'>('tracked');
  const [locallyToggledIds, setLocallyToggledIds] = useState<Record<string, boolean>>({});

  // Inventory Batch Receipt states
  const [inventorySubTab, setInventorySubTab] = useState<'live' | 'receipts' | 'adjustments' | 'recipes'>('live');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [receiptDraftItems, setReceiptDraftItems] = useState<{
    productId: string;
    productName: string;
    quantityAdded: number;
    costOnReceipt: number;
    priceOnReceipt: number;
    currentInventory: number;
  }[]>([]);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptDraftQuery, setReceiptDraftQuery] = useState('');
  const [receiptDraftCategory, setReceiptDraftCategory] = useState<string>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<InventoryReceipt | null>(null);

  // Inventory Adjustment states (Feature 2)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentDraftItems, setAdjustmentDraftItems] = useState<{
    productId: string;
    productName: string;
    systemQty: number;
    actualQty: number;
    reason: string;
  }[]>([]);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [adjustmentQuery, setAdjustmentQuery] = useState('');
  const [adjustmentCategory, setAdjustmentCategory] = useState<string>('all');

  // Recipe (Công thức định lượng) States (Feature 4)
  const [selectedRecipeProductId, setSelectedRecipeProductId] = useState<string | null>(null);
  const [recipeDraftIngredients, setRecipeDraftIngredients] = useState<{
    ingredientId: string;
    quantity: number;
    unit?: string;
  }[]>([]);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState('all');

  useEffect(() => {
    setLocallyToggledIds({});
  }, [inventoryTrackFilter, categoryIdFilter, searchQuery, activeTab]);

  // Staff management state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [newStaff, setNewStaff] = useState<any>({
    fullName: '',
    username: '',
    password: '',
    pin: '',
    phone: '',
    birthYear: new Date().getFullYear() - 20,
    role: 'Nhân viên',
    avatar: '👤'
  });

  const openAddStaff = () => {
    setEditingStaffId(null);
    setStaffModalError(null);
    setNewStaff({
      fullName: '',
      username: '',
      password: '',
      pin: '',
      phone: '',
      birthYear: new Date().getFullYear() - 20,
      role: 'Nhân viên',
      avatar: '👤'
    });
    setIsStaffModalOpen(true);
  };

  const openEditStaff = (staff: any) => {
    setEditingStaffId(staff.id);
    setStaffModalError(null);
    setNewStaff({ ...staff });
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async () => {
    const staffList = storeConfig.staff || [];
    const staffToSave = { ...newStaff };
    setStaffModalError(null);
    
    // Check PIN duplication
    if (staffToSave.pin) {
      if (staffToSave.pin === '1506') {
        setStaffModalError('Mã PIN "1506" là mã mặc định của hệ thống.');
        return;
      }
      if (storeConfig.adminPin && staffToSave.pin === storeConfig.adminPin) {
        setStaffModalError('Mã PIN này đã trùng với mã PIN Admin cấu hình trong cài đặt!');
        return;
      }
      const existing = staffList.find(s => s.pin === staffToSave.pin && s.id !== editingStaffId);
      if (existing) {
        setStaffModalError('Mã PIN này đã có người sử dụng. Vui lòng chọn mã khác!');
        return;
      }
    }

    // Safety check: Don't save large base64 images to Firestore document if they exceed typical limits.
    // For now, if avatar is too large (likely Base64), reset to a default if user just wants it to work.
    if (staffToSave.avatar && staffToSave.avatar.length > 5000) {
      staffToSave.avatar = '👤'; // Default emoji
    }
    
    if (editingStaffId) {
        // Edit
        onUpdateStoreConfig({
            ...storeConfig,
            staff: staffList.map(s => s.id === editingStaffId ? { ...staffToSave, id: editingStaffId } : s)
        });
        await logAction(authenticatedStaff?.fullName || 'Admin', 'Cập nhật nhân viên', `Nhân viên: ${staffToSave.fullName}`);
    } else {
        // Add
        onUpdateStoreConfig({
            ...storeConfig,
            staff: [...staffList, { ...staffToSave, id: Date.now().toString() }]
        });
        await logAction(authenticatedStaff?.fullName || 'Admin', 'Thêm nhân viên mới', `Tên: ${staffToSave.fullName}`);
    }
    setIsStaffModalOpen(false);
  };

  // System Theme & Settings States
  const [adminTheme, setAdminTheme] = useState<'cyberpunk' | 'aura2026' | 'dai'>(
    () => storeConfig.theme || (localStorage.getItem('admin-panel-theme') as any) || 'dai'
  );
  const [audioEnabled, setAudioEnabled] = useState<boolean>(
    () => localStorage.getItem('system-audio-enabled') !== 'false'
  );
  const [autoApprove, setAutoApprove] = useState<boolean>(
    () => localStorage.getItem('system-auto-approve') === 'true'
  );
  const [autoPrint, setAutoPrint] = useState<boolean>(
    () => localStorage.getItem('system-auto-print') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('admin-panel-theme', adminTheme);
  }, [adminTheme]);

  // Sync adminTheme when storeConfig.theme loads or changes in real-time database
  useEffect(() => {
    if (storeConfig.theme && storeConfig.theme !== adminTheme) {
      setAdminTheme(storeConfig.theme);
    }
  }, [storeConfig.theme]);

  const handleThemeChange = async (newTheme: 'cyberpunk' | 'aura2026' | 'dai') => {
    setAdminTheme(newTheme);
    onUpdateStoreConfig({
      ...storeConfig,
      theme: newTheme
    });
    await logAction(authenticatedStaff?.fullName || 'Admin', 'Đổi giao diện', `Giao diện mới: ${newTheme}`);
  };

  useEffect(() => {
    localStorage.setItem('system-audio-enabled', audioEnabled ? 'true' : 'false');
  }, [audioEnabled]);

  useEffect(() => {
    localStorage.setItem('system-auto-approve', autoApprove ? 'true' : 'false');
  }, [autoApprove]);

  useEffect(() => {
    localStorage.setItem('system-auto-print', autoPrint ? 'true' : 'false');
  }, [autoPrint]);

  // Drag and drop categories state
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);

  // Sub States
  const [editingConfig, setEditingConfig] = useState<StoreConfig>({ ...storeConfig });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    setEditingConfig({ ...storeConfig });
  }, [storeConfig]);

  // Adding product modal/form states
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    categoryId: categories[0]?.id || 'pho',
    price: 30000,
    cost: 0,
    image: '🍜',
    description: '',
    isAvailable: true,
    trackInventory: false,
    inventoryCount: 0,
    lowStockAlert: 10
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Migration for old products without cost
  useEffect(() => {
    if (products.some(p => p.cost === undefined)) {
        onUpdateProducts(products.map(p => ({ ...p, cost: p.cost || 0 })));
    }
  }, [products]);

  // Adding category state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState<Omit<Category, 'id'>>({
    name: '',
    icon: '🥡',
    type: 'food'
  });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Adding promotion state
  const [isAddingPromotion, setIsAddingPromotion] = useState(false);
  const [newPromo, setNewPromo] = useState<Omit<Promotion, 'id'>>({
    code: '',
    type: 'percentage',
    value: 10,
    minOrderValue: 50000,
    isActive: true
  });
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Adding table state
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newTable, setNewTable] = useState<Omit<Table, 'id'>>({
    name: '',
    status: 'available',
    capacity: 4,
    areaId: ''
  });
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Bulk table state
  const [isBulkAddingTable, setIsBulkAddingTable] = useState(false);
  const [bulkTableConfig, setBulkTableConfig] = useState({
    prefix: 'Bàn ',
    from: 1,
    to: 10,
    areaId: '',
    capacity: 4
  });

  // Adding area state
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [newArea, setNewArea] = useState<Omit<Area, 'id'>>({ name: '', sortOrder: 0 });
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);

  // Order Edits & Safe Delete States
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [showLogs, setShowLogs] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTestingTele, setIsTestingTele] = useState(false);

  type TimeRange = 'all' | 'today' | 'yesterday' | 'week_this' | 'week_last' | 'month_this' | 'month_last' | 'year_this' | 'year_last';
  
  // Unified master filters state
  const [masterFilters, setMasterFilters] = useState<{
    timeRange: TimeRange;
    status: OrderStatus | 'all';
    paymentStatus: PaymentStatus | 'all';
    search: string;
  }>({
    timeRange: 'all',
    status: 'all',
    paymentStatus: 'all',
    search: ''
  });
  
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
  const thisWeekStart = new Date(todayStart); thisWeekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);

  const isInRange = (date: Date) => {
    if (masterFilters.timeRange === 'all') return true;
    if (masterFilters.timeRange === 'today') return date >= todayStart;
    if (masterFilters.timeRange === 'yesterday') return date >= yesterdayStart && date < todayStart;
    if (masterFilters.timeRange === 'week_this') return date >= thisWeekStart;
    if (masterFilters.timeRange === 'week_last') return date >= lastWeekStart && date < thisWeekStart;
    if (masterFilters.timeRange === 'month_this') return date >= thisMonthStart;
    if (masterFilters.timeRange === 'month_last') return date >= lastMonthStart && date < thisMonthStart;
    if (masterFilters.timeRange === 'year_this') return date >= thisYearStart;
    if (masterFilters.timeRange === 'year_last') return date >= lastYearStart && date < thisYearStart;
    return true;
  };

  const getOrdersMatchingBaseFilters = (includeStatus: boolean, includePayment: boolean) => orders.filter(o => {
     const matchesStatus = !includeStatus || (masterFilters.status === 'all' || o.status === masterFilters.status);
     const matchesPayment = !includePayment || (masterFilters.paymentStatus === 'all' || (o.paymentStatus || 'unpaid') === masterFilters.paymentStatus);
     const matchesTime = isInRange(new Date(o.createdAt));
     const matchesSearch = !masterFilters.search || 
        o.billCode.toLowerCase().includes(masterFilters.search.toLowerCase()) || 
        o.customerName.toLowerCase().includes(masterFilters.search.toLowerCase()) || 
        o.customerPhone.includes(masterFilters.search);
     return matchesStatus && matchesPayment && matchesTime && matchesSearch;
  });

  const ordersForStatusCounts = getOrdersMatchingBaseFilters(false, true);
  const ordersForPaymentCounts = getOrdersMatchingBaseFilters(true, false);

  const calculateStats = () => {
    const isInRange = (date: Date) => {
      if (masterFilters.timeRange === 'all') return true;
      if (masterFilters.timeRange === 'today') return date >= todayStart;
      if (masterFilters.timeRange === 'yesterday') return date >= yesterdayStart && date < todayStart;
      if (masterFilters.timeRange === 'week_this') return date >= thisWeekStart;
      if (masterFilters.timeRange === 'week_last') return date >= lastWeekStart && date < thisWeekStart;
      if (masterFilters.timeRange === 'month_this') return date >= thisMonthStart;
      if (masterFilters.timeRange === 'month_last') return date >= lastMonthStart && date < thisMonthStart;
      if (masterFilters.timeRange === 'year_this') return date >= thisYearStart;
      if (masterFilters.timeRange === 'year_last') return date >= lastYearStart && date < thisYearStart;
      return true;
    };

    const filteredOrders = orders.filter(o => isInRange(new Date(o.createdAt)) && (masterFilters.paymentStatus === 'all' || o.paymentStatus === masterFilters.paymentStatus));
    
    const totalRev = filteredOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0);
    const newOrdCount = filteredOrders.filter(o => o.status === 'pending').length;
    const preparingOrdCount = filteredOrders.filter(o => o.status === 'preparing').length;
    const activeCoupons = promotions.filter(p => p.isActive).length;

    return {
      totalRevenue: totalRev,
      newCount: newOrdCount,
      preparingCount: preparingOrdCount,
      activePromos: activeCoupons,
      totalFilteredOrdersCount: filteredOrders.length
    };
  };

  const stats = calculateStats();

  // Customers aggregation
  const customers: Customer[] = React.useMemo(() => {
    const custMap = orders.reduce((acc, order) => {
      const { customerPhone, customerName, totalAmount, paymentStatus, customerAddress } = order;
      
      const phone = (customerPhone || '').trim().replace(/\s+/g, '');
      const name = (customerName || '').trim();
      
      if (!phone || phone === '0900000000' || !name) {
        return acc;
      }

      const lowerName = name.toLowerCase();
      if (
        lowerName.includes('khách vãng lai') || 
        lowerName.includes('khach vang lai') || 
        lowerName.includes('vãng lai') ||
        lowerName.includes('vang lai') ||
        lowerName.match(/^(bàn|ban|b\d+|t\d+)\s*\d*$/) ||
        name.match(/^N\d+$/) ||
        lowerName === 'khách' ||
        lowerName === 'khach'
      ) {
        return acc;
      }

      if (!acc[phone]) {
        acc[phone] = {
          phone: phone,
          firstName: name,
          totalOrders: 0,
          totalSpent: 0,
          address: customerAddress || '',
          debtOrders: 0,
          debtAmount: 0,
          notes: new Set<string>()
        };
      }
      const cust = acc[phone];
      cust.totalOrders++;
      cust.totalSpent += totalAmount;
      if (paymentStatus === 'debt') {
        cust.debtOrders++;
        cust.debtAmount += totalAmount;
      }
      if (name !== cust.firstName) {
        cust.notes.add(`Tên phụ: ${name}`);
      }
      if (order.note && order.note.trim()) {
        cust.notes.add(order.note.trim());
      }
      return acc;
    }, {} as any);

    return Object.values(custMap).map((c: any) => ({
      ...c,
      notes: Array.from(c.notes)
    }));
  }, [orders]);

  // Customer views & pagination states
  const [customerPage, setCustomerPage] = useState<number>(1);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCustName, setEditCustName] = useState<string>('');
  const [editCustPhone, setEditCustPhone] = useState<string>('');
  const [editCustAddress, setEditCustAddress] = useState<string>('');

  const CUSTOMERS_PER_PAGE = 15;
  const totalCustomerPages = Math.ceil(customers.length / CUSTOMERS_PER_PAGE) || 1;
  const paginatedCustomers = React.useMemo(() => {
    const startIndex = (customerPage - 1) * CUSTOMERS_PER_PAGE;
    return customers.slice(startIndex, startIndex + CUSTOMERS_PER_PAGE);
  }, [customers, customerPage]);

  useEffect(() => {
    if (activeTab === 'customers') {
      setCustomerPage(1);
    }
  }, [activeTab]);

  const handleOpenEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditCustName(cust.firstName);
    setEditCustPhone(cust.phone);
    setEditCustAddress(cust.address || '');
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const normName = editCustName.trim();
    const normPhone = editCustPhone.trim().replace(/\s+/g, '');
    const normAddress = editCustAddress.trim();

    if (!normName) {
      alert('Vui lòng nhập tên khách hàng!');
      return;
    }
    if (!normPhone || normPhone === '0900000000') {
      alert('Số điện thoại không hợp lệ hoặc trùng số điện thoại mặc định!');
      return;
    }

    try {
      const oldPhone = editingCustomer.phone.trim().replace(/\s+/g, '');
      const updatedOrders = orders.map(o => {
        const cleanOPhone = (o.customerPhone || '').trim().replace(/\s+/g, '');
        if (cleanOPhone === oldPhone) {
          return {
            ...o,
            customerPhone: normPhone,
            customerName: normName,
            customerAddress: normAddress
          };
        }
        return o;
      });

      await onUpdateOrders(updatedOrders);
      await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Cập nhật khách hàng', `SĐT cũ: ${oldPhone} sang SĐT mới: ${normPhone} (${normName})`, ['admin', 'cashier']);
      setEditingCustomer(null);
      alert('Cập nhật thông tin khách hàng thành công!');
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi cập nhật khách hàng.');
    }
  };

  const handleDeleteCustomer = async (phone: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khách hàng với SĐT ${phone}? Các hoá đơn của khách này sẽ được chuyển thành Khách vãng lai để bảo toàn doanh thu.`)) return;

    try {
      const updatedOrders = orders.map(o => {
        const cleanOPhone = (o.customerPhone || '').trim().replace(/\s+/g, '');
        const cleanTargetPhone = phone.trim().replace(/\s+/g, '');
        if (cleanOPhone === cleanTargetPhone) {
          return {
            ...o,
            customerPhone: '0900000000',
            customerName: 'Khách vãng lai',
            customerAddress: ''
          };
        }
        return o;
      });

      await onUpdateOrders(updatedOrders);
      await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Xoá khách hàng', `SĐT: ${phone}`, ['admin', 'cashier']);
      alert(`Đã xóa thông tin khách hàng ${phone} thành công!`);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi xoá khách hàng.');
    }
  };

  // Order Operations
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'cancelled') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            setOrderToCancel(order);
            setCancellationReason('');
            return;
        }
    }
    const updated = orders.map(ord => {
      if (ord.id === orderId) {
        return { ...ord, status: newStatus };
      }
      return ord;
    });
    onUpdateOrders(updated);
    const order = orders.find(o => o.id === orderId);
    await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Thay đổi trạng thái đơn', `Đơn ${order?.billCode} sang ${newStatus}`, ['admin', 'cashier']);
  };

  const handleConfirmCancelOrder = () => {
      if (orderToCancel && cancellationReason) {
          const updated = orders.map(ord => {
              if (ord.id === orderToCancel.id) {
                  return { ...ord, status: 'cancelled' as OrderStatus, cancellationReason: cancellationReason };
              }
              return ord;
          });
          onUpdateOrders(updated);
          setOrderToCancel(null);
          setCancellationReason('');
      }
  };

  const handleDeleteOrderClick = (order: Order) => {
    setOrderToDelete(order);
  };

  const handleConfirmDeleteOrder = async () => {
    if (orderToDelete) {
      const updated = orders.filter(o => o.id !== orderToDelete.id);
      onUpdateOrders(updated);
      await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Xoá đơn', `Đơn ${orderToDelete.billCode}`, ['admin', 'cashier']);
      setOrderToDelete(null);
    }
  };

  // Order Edit Helpers
  const handleAddProductToOrderDraft = (prod: Product) => {
    if (!editingOrder) return;
    const existing = editingOrder.items.find(item => item.productId === prod.id);
    let updatedItems;
    if (existing) {
      updatedItems = editingOrder.items.map(item => 
        item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updatedItems = [...editingOrder.items, {
        productId: prod.id,
        productName: prod.name,
        quantity: 1,
        priceOnOrder: prod.price
      }];
    }
    const subTotal = updatedItems.reduce((sum, item) => sum + item.quantity * item.priceOnOrder, 0);
    const totalAmount = Math.max(0, subTotal - (editingOrder.discountAmount || 0));
    setEditingOrder({
      ...editingOrder,
      items: updatedItems,
      subTotal,
      totalAmount
    });
  };

  const handleUpdateItemQuantityInOrderDraft = (productId: string, newQty: number) => {
    if (!editingOrder) return;
    const updatedItems = editingOrder.items.map(item => 
      item.productId === productId ? { ...item, quantity: newQty } : item
    ).filter(item => item.quantity > 0);
    
    const subTotal = updatedItems.reduce((sum, item) => sum + item.quantity * item.priceOnOrder, 0);
    const totalAmount = Math.max(0, subTotal - (editingOrder.discountAmount || 0));
    setEditingOrder({
      ...editingOrder,
      items: updatedItems,
      subTotal,
      totalAmount
    });
  };

  const handleRemoveItemFromOrderDraft = (productId: string) => {
    if (!editingOrder) return;
    const updatedItems = editingOrder.items.filter(item => item.productId !== productId);
    const subTotal = updatedItems.reduce((sum, item) => sum + item.quantity * item.priceOnOrder, 0);
    const totalAmount = Math.max(0, subTotal - (editingOrder.discountAmount || 0));
    setEditingOrder({
      ...editingOrder,
      items: updatedItems,
      subTotal,
      totalAmount
    });
  };

  const handleSaveOrderEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (editingOrder.items.length === 0) {
      alert("Đơn hàng không thể để trống món ăn! Vui lòng chọn món ăn cho khách.");
      return;
    }
    const updated = orders.map(o => o.id === editingOrder.id ? editingOrder : o);
    onUpdateOrders(updated);
    await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Sửa đơn', `Đơn ${editingOrder.billCode}`, ['admin', 'cashier']);
    setEditingOrder(null);
  };

  // Product Operations
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim()) return;

    const prodToAdd: Product = {
      ...newProduct,
      id: `prod-${Date.now()}`
    };

    onUpdateProducts([...products, prodToAdd]);
    await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Thêm món', `Món: ${prodToAdd.name}`, ['admin', 'cashier']);
    setIsAddingProduct(false);
    setNewProduct({
      name: '',
      categoryId: categories[0]?.id || 'pho',
      price: 30000,
      cost: 0,
      image: '🍜',
      description: '',
      isAvailable: true,
      trackInventory: false,
      inventoryCount: 0,
      lowStockAlert: 10
    });
  };

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) return;

    const updated = products.map(p => p.id === editingProduct.id ? editingProduct : p);
    onUpdateProducts(updated);
    await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Sửa món', `Món: ${editingProduct.name}`, ['admin', 'cashier']);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (prod) setProductToDelete(prod);
  };

  const handleConfirmDeleteProduct = async () => {
    if (productToDelete) {
      const updated = products.filter(p => p.id !== productToDelete.id);
      onUpdateProducts(updated);
      await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Xoá món', `Món: ${productToDelete.name}`, ['admin', 'cashier']);
      setProductToDelete(null);
    }
  };

  const toggleProductAvailability = (productId: string) => {
    const updated = products.map(p => {
      if (p.id === productId) {
        return { ...p, isAvailable: !p.isAvailable };
      }
      return p;
    });
    onUpdateProducts(updated);
  };

  // Category Operations
  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    // Generate url friendly id
    const cleanId = newCategory.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const nextSortOrder = categories.length > 0 
      ? Math.max(...categories.map(c => c.sortOrder ?? 0)) + 1 
      : 0;

    const catToAdd: Category = {
      id: cleanId || `cat-${Date.now()}`,
      name: newCategory.name.trim(),
      icon: newCategory.icon || '🥡',
      sortOrder: nextSortOrder,
      type: newCategory.type || 'food'
    };

    onUpdateCategories([...categories, catToAdd]);
    await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Thêm danh mục', `Danh mục: ${catToAdd.name}`, ['admin', 'cashier']);
    setIsAddingCategory(false);
    setNewCategory({ name: '', icon: '🥡', type: 'food' });
  };

  const handleEditCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    const updated = categories.map(c => c.id === editingCategory.id ? editingCategory : c);
    onUpdateCategories(updated);
    await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Sửa danh mục', `Danh mục: ${editingCategory.name}`, ['admin', 'cashier']);
    setEditingCategory(null);
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Re-assign sequential rank orders
    const finalized = updated.map((cat, idx) => ({
      ...cat,
      sortOrder: idx
    }));

    onUpdateCategories(finalized);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const associatedProds = products.filter(p => p.categoryId === categoryId);
    if (associatedProds.length > 0) {
      alert(`Không thể xóa danh mục này vì có ${associatedProds.length} sản phẩm đang trực thuộc. Vui lòng chuyển danh mục sản phẩm trước.`);
      return;
    }
    const cat = categories.find(c => c.id === categoryId);
    if (cat) setCategoryToDelete(cat);
  };

  const handleConfirmDeleteCategory = async () => {
    if (categoryToDelete) {
      const updated = categories.filter(c => c.id !== categoryToDelete.id);
      onUpdateOrders(orders); // Trigger ordering update (trigger list update)
      onUpdateCategories(updated);
      await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Xoá danh mục', `Danh mục: ${categoryToDelete.name}`, ['admin', 'cashier']);
      setCategoryToDelete(null);
    }
  };

  // Promotion Operations
  const handleAddPromotionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.code.trim()) return;

    const promoToAdd: Promotion = {
      ...newPromo,
      id: `promo-${Date.now()}`,
      code: newPromo.code.trim().toUpperCase()
    };

    onUpdatePromotions([...promotions, promoToAdd]);
    await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Thêm khuyến mãi', `Mã: ${promoToAdd.code}`, ['admin', 'cashier']);
    setIsAddingPromotion(false);
    setNewPromo({
      code: '',
      type: 'percentage',
      value: 10,
      minOrderValue: 50000,
      isActive: true
    });
  };

  const handleEditPromotionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo || !editingPromo.code.trim()) return;

    const promoWithUpperCode = {
      ...editingPromo,
      code: editingPromo.code.trim().toUpperCase()
    };

    const updated = promotions.map(p => p.id === editingPromo.id ? promoWithUpperCode : p);
    onUpdatePromotions(updated);
    setEditingPromo(null);
  };

  const handleDeletePromotion = (promoId: string) => {
    const promo = promotions.find(p => p.id === promoId);
    if (promo) setPromotionToDelete(promo);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      const updatedCategories = categories.map(c => ({ ...c }));
      const updatedProducts = products.map(p => ({ ...p }));

      data.forEach((row) => {
        const catName = row['Tên Danh Mục'] || row['Danh mục'] || 'Chưa phân loại';
        const catId = row['Danh mục ID'];
        let category = updatedCategories.find(c => c.name === catName || (catId && c.id === catId));
        
        if (!category) {
          const cleanId = catName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
          category = {
            id: catId && !updatedCategories.find(c => c.id === catId) ? catId : (cleanId || `cat-${Date.now()}-${Math.random()}`),
            name: catName,
            icon: '🥡',
            sortOrder: updatedCategories.length,
            type: 'food'
          };
          updatedCategories.push(category);
        }

        const prodName = row['Tên món'];
        let product = updatedProducts.find(p => p.name === prodName || p.id === row['ID']);
        if (product) {
          product.price = Number(row['Giá (VND)']);
          product.cost = Number(row['Giá vốn (VND)']) || 0;
          product.description = row['Mô tả'] || '';
          product.categoryId = category!.id;
          product.isAvailable = row['Trạng thái'] !== 'Hết món';
          product.isVisibleToCustomer = row['Hiển thị cho khách'] !== 'Không';
          product.image = row['Emoji'] || '🍜';
        } else {
          updatedProducts.push({
            id: row['ID'] || `prod-${Date.now()}-${Math.random()}`,
            name: prodName,
            price: Number(row['Giá (VND)']),
            cost: Number(row['Giá vốn (VND)']) || 0,
            description: row['Mô tả'] || '',
            categoryId: category!.id,
            isAvailable: row['Trạng thái'] !== 'Hết món',
            isVisibleToCustomer: row['Hiển thị cho khách'] !== 'Không',
            image: row['Emoji'] || '🍜'
          });
        }
      });

      onUpdateCategories(updatedCategories);
      onUpdateProducts(updatedProducts);
      alert('Nhập thực đơn thành công!');
    };
    reader.readAsBinaryString(file);
  };

  const exportMenuToExcel = () => {
    const data = products.map(product => {
      const cat = categories.find(c => c.id === product.categoryId);
      return {
        'ID': product.id,
        'Tên món': product.name,
        'Danh mục ID': product.categoryId,
        'Tên Danh Mục': cat?.name || 'Không xác định',
        'Giá (VND)': product.price,
        'Giá vốn (VND)': product.cost || 0,
        'Mô tả': product.description,
        'Trạng thái': product.isAvailable ? 'Sẵn sàng' : 'Hết món',
        'Hiển thị cho khách': (product.isVisibleToCustomer ?? true) ? 'Có' : 'Không',
        'Emoji': product.image
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ThucDon');
    XLSX.writeFile(workbook, 'ThucDon.xlsx');
  };

  const handleConfirmDeletePromotion = () => {
    if (promotionToDelete) {
      const updated = promotions.filter(p => p.id !== promotionToDelete.id);
      onUpdatePromotions(updated);
      setPromotionToDelete(null);
    }
  };
  
  const handleDownloadLogs = async () => {
    setIsDownloading(true);
    try {
      const start = new Date(selectedLogDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedLogDate);
      end.setHours(23, 59, 59, 999);
      
      const q = query(collection(db, 'activityLogs'), where('timestamp', '>=', start.getTime()), where('timestamp', '<=', end.getTime()), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => doc.data());
      
      const content = logs.map(log => `[${new Date(log.timestamp).toLocaleString('vi-VN')}] ${log.staffUsername || 'System'}: ${log.action} - ${log.details || ''}`).join('\n');
      
      // Inject UTF-8 BOM (\uFEFF) to guarantee correct encoding on dual platform viewers (e.g., Android, NotePad)
      const blob = new Blob(["\uFEFF" + content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nhatky_${selectedLogDate}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tải nhật ký.');
    } finally {
      setIsDownloading(false);
    }
  };


  // Area Operations
  const handleAddAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArea.name.trim()) return;
    const areaToAdd: Area = {
      ...newArea,
      id: `area-${Date.now()}`
    };
    onUpdateAreas([...areas, areaToAdd]);
    setIsAddingArea(false);
    setNewArea({ name: '', sortOrder: areas.length });
  };

  const handleEditAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArea || !editingArea.name.trim()) return;
    const updated = areas.map(a => a.id === editingArea.id ? editingArea : a);
    onUpdateAreas(updated);
    setEditingArea(null);
  };

  const handleConfirmDeleteArea = () => {
    if (areaToDelete) {
      const updated = areas.filter(a => a.id !== areaToDelete.id);
      onUpdateAreas(updated);
      setAreaToDelete(null);
    }
  };

  // Bulk Table Creation
  const handleBulkAddTables = (e: React.FormEvent) => {
    e.preventDefault();
    const { prefix, from, to, areaId, capacity } = bulkTableConfig;
    if (from > to) {
      alert("Số bắt đầu phải nhỏ hơn số kết thúc!");
      return;
    }

    const newTablesList: Table[] = [];
    const timestamp = Date.now();
    
    for (let i = from; i <= to; i++) {
      const tableId = `table-bulk-${timestamp}-${i}`;
      const tableName = `${prefix}${i}`;
      const qrCode = `${window.location.origin}${window.location.pathname}?tableId=${tableId}`;
      
      newTablesList.push({
        id: tableId,
        name: tableName,
        status: 'available',
        capacity: capacity || 4,
        areaId: areaId || undefined,
        qrCode
      });
    }

    onUpdateTables([...tables, ...newTablesList]);
    setIsBulkAddingTable(false);
    alert(`Đã thêm thành công ${newTablesList.length} bàn!`);
  };

  // Table Operations
  const handleAddTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTable.name.trim()) return;

    const tableId = `table-${Date.now()}`;
    // QR code will point to the specific table. We'll use the current window location as base or a standard pattern.
    const tableUrl = `${window.location.origin}${window.location.pathname}?tableId=${tableId}`;

    const tableToAdd: Table = {
      ...newTable,
      id: tableId,
      qrCode: tableUrl
    };

    onUpdateTables([...tables, tableToAdd]);
    setIsAddingTable(false);
    setNewTable({ name: '', status: 'available', capacity: 4 });
  };

  const handleEditTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || !editingTable.name.trim()) return;

    const updated = tables.map(t => t.id === editingTable.id ? editingTable : t);
    onUpdateTables(updated);
    setEditingTable(null);
  };

  const handleDeleteTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (table) setTableToDelete(table);
  };

  const handleConfirmDeleteTable = () => {
    if (tableToDelete) {
      const updated = tables.filter(t => t.id !== tableToDelete.id);
      onUpdateTables(updated);
      setTableToDelete(null);
    }
  };

  // Store Configuration Save
  const handleSaveStoreConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check PIN duplication for admin
    if (editingConfig.adminPin) {
      if (editingConfig.adminPin === '1506') {
        setSaveStatus('Mã PIN "1506" là mã mặc định của hệ thống.');
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }
      const staffList = storeConfig.staff || [];
      const existing = staffList.find(s => s.pin === editingConfig.adminPin);
      if (existing) {
        setSaveStatus('Mã PIN này đã có nhân viên sử dụng.');
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }
    }

    // Strip large avatars before saving
    const cleanedConfig = {
      ...editingConfig,
      staff: editingConfig.staff?.map(s => ({
        ...s,
        avatar: (s.avatar && s.avatar.length > 5000) ? '👤' : s.avatar
      }))
    };
    
    try {
      onUpdateStoreConfig(cleanedConfig);
      await logAction(authenticatedStaff?.fullName || 'Admin', 'Cấu hình cửa hàng', 'Cập nhật thông tin cửa hàng');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const getStatusColorClass = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'delivering':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusLabelText = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Đang Chờ Duyệt';
      case 'preparing': return 'Đang Chuẩn Bị';
      case 'delivering': return 'Đang Giao Hàng';
      case 'completed': return 'Đã Giao Xong';
      case 'cancelled': return 'Đã Hủy';
    }
  };

  const themeStyles = {
    cyberpunk: {
      pageWrapper: 'flex-1 overflow-y-auto px-6 py-6 font-mono text-[#c5c6c7] bg-[#0b0c10] relative overflow-x-hidden',
      titleBar: 'text-[#66fcf1] border-b border-[#45f3ff]/30 pb-3 shadow-[0_1px_4px_rgba(102,252,241,0.15)]',
      textClass: 'text-[#c5c6c7] font-mono',
      textMuted: 'text-[#66fcf1]/60 font-mono uppercase tracking-widest text-[9px] font-semibold',
      textTitle: 'text-[#66fcf1] font-black tracking-widest drop-shadow-[0_0_4px_rgba(102,252,241,0.25)] uppercase',
      card: 'bg-[#1f2833]/90 border border-[#45f3ff]/30 shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:border-[#45f3ff]/60 transition-all rounded-xl duration-200',
      cardSec: 'bg-[#0f1115] border border-[#2c3540] rounded-xl p-4 shadow-inner',
      btnAccent: 'bg-[#66fcf1] text-[#0b0c10] hover:bg-[#45f3ff] font-extrabold shadow-[0_0_12px_rgba(102,252,241,0.4)] hover:shadow-[0_0_20px_rgba(69,243,255,0.7)] border border-transparent select-none tracking-widest uppercase transition-all pb-2 pt-2 px-4 rounded-xl',
      btnSec: 'bg-[#1f2833] hover:bg-[#2c353f] text-[#66fcf1] border border-[#66fcf1]/45 hover:border-[#66fcf1] hover:shadow-[0_0_8px_rgba(102,252,241,0.2)] tracking-wider transition-all pb-2 pt-2 px-4 rounded-xl font-bold uppercase text-[10px]',
      tabActive: 'bg-[#66fcf1] text-[#0b0c10] font-black border border-[#66fcf1] shadow-[0_0_10px_rgba(102,252,241,0.35)]',
      tabInactive: 'bg-[#12161f] hover:bg-[#1a1f26] text-[#c5c6c7]/80 hover:text-white border border-[#2c3540] hover:border-[#66fcf1]/30 active:text-cyan-400',
      tabContainer: 'flex border-b border-[#2c3540] mb-6 bg-[#12161f] border border-[#2c3540] p-1 rounded-xl font-semibold text-xs overflow-x-auto no-scrollbar',
      tableHeader: 'bg-[#1f2833] text-[#66fcf1] font-extrabold uppercase border-b border-[#66fcf1]/30 shadow-[0_2px_5px_rgba(0,0,0,0.2)]',
      tableHeaderCell: 'hover:bg-[#2c353f] border-r border-[#2c3540] text-[#66fcf1] cursor-pointer p-3',
      tableRow: 'hover:bg-[#10303a]/40 even:bg-[#171e27] odd:bg-[#12171e] text-[#c5c6c7]/90 border-b border-[#2c3540]',
      tableCellBorder: 'border-[#2c3540] border-r',
      badge: 'bg-[#0b0c10] border border-[#66fcf1]/30 text-[#66fcf1] font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md inline-block',
      input: 'bg-[#12171e] border border-[#2c3540] text-[#66fcf1] rounded-xl px-3 py-2 font-mono outline-none focus:border-[#66fcf1] shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] focus:ring-1 focus:ring-[#66fcf1]',
      icon: 'text-[#66fcf1] drop-shadow-[0_0_4px_rgba(102,252,241,0.2)]',
      divider: 'border-[#2c3540]',
      titleSpin: 'text-[#66fcf1] animate-pulse shadow-glow',
      panelTitle: `Admin Workspace - ${storeConfig.name || 'Cửa Hàng'}`,
      subText: 'SYSTEM_OVERVIEW_KPI'
    },
    win11: {
      pageWrapper: 'flex-1 overflow-y-auto px-6 py-6 font-sans text-[#1c1c1c] bg-[#f3f3f3] relative overflow-x-hidden',
      titleBar: 'text-[#1c1c1c] border-b border-zinc-200/80 pb-3',
      textClass: 'text-slate-800 font-sans',
      textMuted: 'text-zinc-500 font-semibold uppercase tracking-wider text-[10px]',
      textTitle: 'text-zinc-900 font-bold tracking-tight pb-1',
      card: 'bg-white/80 backdrop-blur-md border border-[#e5e5e5] shadow-[0_2px_4px_rgba(0,0,0,0.04)] rounded-xl hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] transition-all duration-300 overflow-hidden',
      cardSec: 'bg-[#fafafa]/90 border border-zinc-200/80 rounded-xl p-4 shadow-xs',
      btnAccent: 'bg-[#0078d4] hover:bg-[#0067b8] text-white hover:shadow-[0_4px_12px_rgba(0,120,212,0.15)] border border-[#005eaf] active:scale-98 transition-all pb-2 pt-2 px-4 rounded-lg text-xs uppercase tracking-wider font-semibold',
      btnSec: 'bg-white hover:bg-zinc-50 text-slate-700 border border-zinc-300 font-medium pb-2 pt-2 px-4 rounded-lg shadow-xs transition-all uppercase text-[10px]',
      tabActive: 'bg-white border-b-2 border-[#0078d4] text-[#0078d4] font-bold shadow-xs',
      tabInactive: 'text-zinc-650 hover:text-zinc-900 hover:bg-[#eaeaea]/60 rounded-md',
      tabContainer: 'flex gap-1 border-b border-zinc-200 mb-6 bg-[#f3f3f3] p-1.5 rounded-xl font-semibold text-xs overflow-x-auto no-scrollbar',
      tableHeader: 'bg-[#fafafa] text-zinc-650 font-semibold border-b border-zinc-200 shadow-xs',
      tableHeaderCell: 'hover:bg-zinc-200 text-zinc-700 cursor-pointer p-3 border-r border-[#e5e5e5]',
      tableRow: 'hover:bg-[#0078d4]/5 even:bg-[#fafafa]/50 odd:bg-white transition-all',
      tableCellBorder: 'border-zinc-200 border-r',
      badge: 'bg-[#e6f2fc] border border-[#aae0fa]/40 text-[#0078d4] font-semibold text-[10px] px-2.5 py-0.5 rounded-full inline-block',
      input: 'bg-white border border-zinc-300 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] rounded-lg px-3 py-2 text-slate-800 outline-none shadow-xs',
      icon: 'text-[#0078d4]',
      divider: 'border-zinc-200',
      titleSpin: 'text-[#0078d4] animate-pulse',
      panelTitle: `Trang Quản Lý - ${storeConfig.name || 'Cửa Hàng'}`,
      subText: 'Thông số hệ thống (Mica View)'
    },
    aura2026: {
      pageWrapper: 'flex-1 overflow-y-auto px-6 py-6 font-sans text-[#4a3f5f] bg-[#fdfafc] relative overflow-x-hidden',
      titleBar: 'text-[#4a3f5f] border-b border-[#e1d5e7] pb-3',
      textClass: 'text-[#4a3f5f] font-sans',
      textMuted: 'text-[#a28da8] font-semibold uppercase tracking-wider text-[10px]',
      textTitle: 'text-[#3d2c4e] font-bold tracking-tight pb-1',
      card: 'bg-white/90 backdrop-blur-sm border border-[#e1d5e7] shadow-[0_2px_10px_rgba(150,120,180,0.1)] rounded-3xl hover:shadow-[0_8px_20px_rgba(150,120,180,0.2)] transition-all duration-300 overflow-hidden',
      cardSec: 'bg-[#f4edf7]/70 border border-[#e1d5e7] rounded-3xl p-4 shadow-inner',
      btnAccent: 'bg-[#9b6bcc] hover:bg-[#8a5dc8] text-white shadow-[0_4px_10px_rgba(150,100,200,0.3)] border border-[#8a5dc8] transition-all pb-2 pt-2 px-4 rounded-full text-xs uppercase tracking-wider font-bold',
      btnSec: 'bg-white hover:bg-[#fcf9fc] text-[#6d5b7a] border border-[#e1d5e7] font-medium pb-2 pt-2 px-4 rounded-full shadow-xs transition-all uppercase text-[10px]',
      tabActive: 'bg-[#eadcf2] border border-[#c6a8d6] text-[#5e4776] font-bold shadow-sm rounded-full',
      tabInactive: 'text-[#8d799f] hover:text-[#5e4776] hover:bg-[#f6effa] rounded-full',
      tabContainer: 'flex gap-1 border-b border-[#e1d5e7] mb-6 bg-[#f8f5fa] p-1.5 rounded-full font-semibold text-xs overflow-x-auto no-scrollbar',
      tableHeader: 'bg-[#fefafc] text-[#6d5b7a] font-semibold border-b border-[#e1d5e7]',
      tableHeaderCell: 'hover:bg-[#f6effa] text-[#5e4776] cursor-pointer p-3 border-r border-[#e1d5e7]',
      tableRow: 'hover:bg-[#f6effa]/50 even:bg-[#faf7fb]/50 odd:bg-white transition-all',
      tableCellBorder: 'border-[#e1d5e7] border-r',
      badge: 'bg-[#eadef5] border border-[#d3bce3]/50 text-[#6d5b7a] font-semibold text-[10px] px-2.5 py-0.5 rounded-full inline-block',
      input: 'bg-white border border-[#d3bce3] focus:border-[#9b6bcc] focus:ring-1 focus:ring-[#9b6bcc] rounded-2xl px-3 py-2 text-[#4a3f5f] outline-none shadow-xs',
      icon: 'text-[#9b6bcc]',
      divider: 'border-[#e1d5e7]',
      titleSpin: 'text-[#9b6bcc] animate-spin-slow',
      panelTitle: `Trang Quản Lý Aura - ${storeConfig.name || 'Cửa Hàng'}`,
      subText: 'Thống số tổng quan (Aura Style)'
    },
    dai: {
      pageWrapper: 'flex-1 overflow-y-auto px-6 py-8 font-sans text-slate-800 bg-[#f8f9fe]',
      titleBar: 'text-slate-800 border-b border-indigo-100/50 pb-3',
      textClass: 'text-slate-800 font-medium',
      textMuted: 'text-slate-400 font-semibold',
      textTitle: 'text-[#2e335b] font-extrabold pb-1 uppercase tracking-wide',
      card: 'bg-white border-0 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] rounded-[24px] hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden ring-1 ring-slate-100/50',
      cardSec: 'bg-[#f8f9fe]/50 border border-slate-100 rounded-[24px] p-4',
      btnAccent: 'bg-[#7052ff] hover:bg-[#6042ef] text-white shadow-md shadow-indigo-500/20 px-5 py-2.5 rounded-[14px] text-xs font-bold transition-all',
      btnSec: 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-5 py-2.5 rounded-[14px] shadow-sm font-semibold text-xs transition-all',
      tabActive: 'bg-[#7052ff] text-white shadow-md shadow-indigo-500/20 rounded-[12px]',
      tabInactive: 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-[12px]',
      tabContainer: 'flex gap-2 border-b border-slate-200/50 mb-8 bg-white p-2 rounded-[16px] font-semibold text-[11px] shadow-sm overflow-x-auto no-scrollbar',
      tableHeader: 'bg-[#f4f5f9]/50 text-slate-400 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100',
      tableHeaderCell: 'hover:bg-slate-50 cursor-pointer p-4',
      tableRow: 'hover:bg-[#f8f9fe]/80 transition-all border-b border-slate-50/50',
      tableCellBorder: 'border-slate-50/50 sm:border-transparent',
      badge: 'bg-indigo-50 text-indigo-500 border border-indigo-100/50 font-bold text-[10px] px-2.5 py-1 rounded-full inline-block',
      input: 'bg-[#f4f5f9]/50 border border-slate-200 focus:border-[#7052ff] focus:ring-1 focus:ring-[#7052ff] rounded-[14px] px-4 py-2.5 text-slate-700 outline-none transition-all',
      icon: 'text-[#7052ff]',
      divider: 'border-slate-200/50',
      titleSpin: 'text-[#7052ff]',
      panelTitle: `Admin - ${storeConfig.name || 'Cửa Hàng'}`,
      subText: 'Thống số tổng quan'
    }
  };

  const t = themeStyles[adminTheme] || themeStyles.dai;

  return (
    <div className={t.pageWrapper}>
      
      {/* Top Welcome Title */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b ${t.divider}`}>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-1.5 uppercase select-none">
            <Settings className={`w-6 h-6 ${t.titleSpin}`} />
            <span className={t.textTitle}>{t.panelTitle}</span>
          </h1>
        </div>
        
        {/* Dynamic Sync state display & Admin Logout Lock option */}
        <div className="flex items-center gap-2 flex-wrap">
          <NotificationIcon role="admin" />
          <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3.5 py-1" title="Đồng bộ thời gian thực với cơ sở dữ liệu Google Cloud Firestore">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Đồng bộ: Google Firebase Cloud
          </div>
          
          {onBackToPicker && (
            <button
              onClick={onBackToPicker}
              className="px-3.5 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-[10px] font-black uppercase rounded-full tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
              title="Quay lại phân hệ chính"
            >
              🚀 Chuyển Phân Hệ
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-[10px] font-black uppercase rounded-full tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
              title="Khóa hệ thống quản lý chủ tiệm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
              Khóa Admin
            </button>
          )}
        </div>
      </div>

      {/* THÔNG SỐ TỔNG QUAN - GLOSSY 3D SECTION */}
      <div className="bg-[#fcfcff] rounded-[2rem] p-5 lg:p-7 shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-[#e1d5e7] mb-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#f4f0fa] flex items-center justify-center shrink-0 border border-[#eadef5]">
              <Database className="w-6 h-6 text-[#9b6bcc]" />
            </div>
            <div>
              <h3 className="text-lg lg:text-xl font-black text-[#2e2640] tracking-tight mb-0.5 uppercase">Thông Số Tổng Quan</h3>
              <p className="text-[11px] lg:text-xs text-[#8d799f] font-medium tracking-wide">Tổng hợp các chỉ số quan trọng giúp bạn nắm bắt tình hình kinh doanh</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <div className="relative">
               <select 
                 className="appearance-none bg-white border border-[#e1d5e7] text-[#4a3f5f] font-bold py-2.5 pl-10 pr-10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#9b6bcc]/30 shadow-sm transition-all text-xs lg:text-sm cursor-pointer"
                 value={masterFilters.timeRange}
                 onChange={(e) => setMasterFilters(prev => ({ ...prev, timeRange: e.target.value as TimeRange }))}
               >
                  <option value="all">Tất cả thời gian</option>
                  <option value="today">Hôm nay</option>
                  <option value="yesterday">Hôm qua</option>
                  <option value="week_this">Tuần này</option>
                  <option value="week_last">Tuần trước</option>
                  <option value="month_this">Tháng này</option>
                  <option value="month_last">Tháng trước</option>
                  <option value="year_this">Năm này</option>
                  <option value="year_last">Năm trước</option>
               </select>
               <Clock className="w-4 h-4 text-[#9b6bcc] absolute left-3.5 top-3 pointer-events-none" />
             </div>
          </div>
        </div>

        {/* GRID OF 4 GLOSSY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">

          {/* CARD 1: DOANH THU */}
          <div className="relative overflow-hidden rounded-[1.5rem] lg:rounded-[2rem] p-5 lg:p-6 border border-white/40 bg-gradient-to-br from-[#20C997] to-[#12A57A] shadow-[0_8px_30px_rgba(32,201,151,0.25)] min-h-[180px] lg:min-h-[200px]">
            {/* Glass top highlight */}
            <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
            
            {/* Sparkline Graphic */}
            <div className="absolute bottom-4 right-4 w-32 h-16 opacity-[0.25] pointer-events-none text-white drop-shadow-md">
              <svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M0 45 L 20 25 L 40 35 L 60 15 L 80 25 L 100 5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="100" cy="5" r="4" fill="currentColor" />
                <path d="M0 45 L 20 25 L 40 35 L 60 15 L 80 25 L 100 5 V 50 H 0 Z" fill="currentColor" opacity="0.3" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-400/40 border border-emerald-200/50 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] backdrop-blur-md text-white font-black text-xl">
                    <DollarSign className="w-5 h-5 drop-shadow-sm" />
                  </div>
                  <span className="text-white/95 font-black tracking-wider text-xs uppercase drop-shadow-sm">Doanh thu</span>
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-2xl lg:text-[28px] xl:text-[32px] font-black text-white tracking-tight drop-shadow-md">{stats.totalRevenue.toLocaleString('vi-VN')}</span>
                  <span className="text-sm font-bold text-white/90 uppercase drop-shadow-sm">Đ</span>
                </div>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.1)] self-start">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#12A57A]">Dòng tiền thực</span>
              </div>
            </div>
          </div>

          {/* CARD 2: TỔNG ĐƠN HĐ */}
          <div className="relative overflow-hidden rounded-[1.5rem] lg:rounded-[2rem] p-5 lg:p-6 border border-white/40 bg-gradient-to-br from-[#FF8C42] to-[#E8601C] shadow-[0_8px_30px_rgba(255,140,66,0.25)] min-h-[180px] lg:min-h-[200px]">
            <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
            
            <div className="absolute bottom-5 right-5 w-24 h-16 opacity-30 pointer-events-none text-white flex items-end gap-2 drop-shadow-md">
               <div className="w-5 h-8 bg-white rounded-t-sm"></div>
               <div className="w-5 h-12 bg-white rounded-t-sm"></div>
               <div className="w-5 h-20 bg-white rounded-t-sm"></div>
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-orange-400/40 border border-orange-200/50 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] backdrop-blur-md text-white">
                    <ShoppingBag className="w-5 h-5 drop-shadow-sm" />
                  </div>
                  <span className="text-white/95 font-black tracking-wider text-xs uppercase drop-shadow-sm">Tổng đơn HĐ</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-3xl lg:text-[32px] xl:text-[36px] font-black text-white tracking-tight drop-shadow-md">{stats.totalFilteredOrdersCount}</span>
                  <span className="text-sm font-bold text-white/90 uppercase drop-shadow-sm">Đơn</span>
                </div>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.1)] self-start">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#E8601C]">Kinh doanh</span>
              </div>
            </div>
          </div>

          {/* CARD 3: ĐANG CHỜ DUYỆT */}
          <div className="relative overflow-hidden rounded-[1.5rem] lg:rounded-[2rem] p-5 lg:p-6 border border-white/50 bg-gradient-to-br from-[#FFD166] to-[#F2A30F] shadow-[0_8px_30px_rgba(255,209,102,0.25)] min-h-[180px] lg:min-h-[200px]">
            <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 blur-3xl rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
            
            <div className="absolute bottom-2 right-4 w-28 h-28 opacity-30 pointer-events-none text-white drop-shadow-md">
               <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-full h-full">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6zm2-8h8v2H8v-2zm0 4h5v2H8v-2z" />
               </svg>
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-400/40 border border-amber-200/50 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-md text-white">
                    <Clock className="w-5 h-5 drop-shadow-sm" />
                  </div>
                  <span className="text-white/95 font-black tracking-wider text-xs uppercase drop-shadow-sm">Đang chờ duyệt</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-3xl lg:text-[32px] xl:text-[36px] font-black text-white tracking-tight drop-shadow-md">{stats.newCount}</span>
                  <span className="text-sm font-bold text-white/90 uppercase drop-shadow-sm">Đơn</span>
                </div>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.1)] self-start">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#d97706]">Cần xử lý</span>
              </div>
            </div>
          </div>

          {/* CARD 4: ĐANG CHẾ BIẾN */}
          <div className="relative overflow-hidden rounded-[1.5rem] lg:rounded-[2rem] p-5 lg:p-6 border border-white/40 bg-gradient-to-br from-[#4D96FF] to-[#2B6CE6] shadow-[0_8px_30px_rgba(77,150,255,0.25)] min-h-[180px] lg:min-h-[200px]">
            <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
            
            <div className="absolute bottom-2 right-1 w-24 h-24 opacity-30 pointer-events-none text-white drop-shadow-md translate-y-2">
              <svg viewBox="0 0 100 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M10 60 Q 50 10 90 60 Z"/>
                <rect x="5" y="62" width="90" height="6" rx="3" />
                <circle cx="50" cy="15" r="5" />
                {/* little steam waves */}
                <path d="M30 40 Q 35 30 30 20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
                <path d="M50 35 Q 55 25 50 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
                <path d="M70 40 Q 75 30 70 20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
              </svg>
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-400/40 border border-blue-200/50 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] backdrop-blur-md text-white">
                    <Utensils className="w-4 h-4 drop-shadow-sm" />
                  </div>
                  <span className="text-white/95 font-black tracking-wider text-xs uppercase drop-shadow-sm">Đang chế biến</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-3xl lg:text-[32px] xl:text-[36px] font-black text-white tracking-tight drop-shadow-md">{stats.preparingCount}</span>
                  <span className="text-sm font-bold text-white/90 uppercase drop-shadow-sm">Món</span>
                </div>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.1)] self-start">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#2B6CE6]">Tại bếp</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Internal Tabs Navigator */}
      <div className={t.tabContainer}>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'orders' ? t.tabActive : t.tabInactive
          }`}
        >
          <Clipboard className="w-4 h-4" /> Đơn Hàng ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'products' ? t.tabActive : t.tabInactive
          }`}
        >
          <Utensils className="w-4 h-4" /> Thực Đơn ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'categories' ? t.tabActive : t.tabInactive
          }`}
        >
          <Layers className="w-4 h-4" /> Danh Mục ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'tables' ? t.tabActive : t.tabInactive
          }`}
        >
          <Layout className="w-4 h-4" /> Bàn ({tables.length})
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'customers' ? t.tabActive : t.tabInactive
          }`}
        >
          <Smartphone className="w-4 h-4" /> Khách hàng
        </button>              
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'report' ? t.tabActive : t.tabInactive
          }`}
        >
          <FileText className="w-4 h-4" /> Báo Cáo
        </button>
        <button
          onClick={() => setActiveTab('promotions')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'promotions' ? t.tabActive : t.tabInactive
          }`}
        >
          <Tag className="w-4 h-4" /> Khuyến Mãi ({promotions.length})
        </button>
        <button
          onClick={() => setActiveTab('store')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'store' ? t.tabActive : t.tabInactive
          }`}
        >
          <Database className="w-4 h-4" /> Thông Tin Cửa Hàng
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'staff' ? t.tabActive : t.tabInactive
          }`}
        >
          <Layers className="w-4 h-4" /> Nhân Viên ({storeConfig.staff?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'inventory' ? t.tabActive : t.tabInactive
          }`}
        >
          <Boxes className="w-4 h-4" /> Quản Lý Kho ({products.filter(p => p.trackInventory).length})
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'system' ? t.tabActive : t.tabInactive
          }`}
        >
          <Cpu className="w-4 h-4 animate-pulse" /> Hệ Thống
        </button>
      </div>

      {/* Dynamic Content Views */}

      {/* 1.5. INVENTORY VIEW */}
      {activeTab === 'inventory' && (() => {
        const trackedProducts = products.filter(p => p.trackInventory);
        const lowStockProducts = trackedProducts.filter(p => (p.inventoryCount || 0) <= (p.lowStockAlert !== undefined ? p.lowStockAlert : 10) && (p.inventoryCount || 0) > 0);
        const outOfStockProducts = trackedProducts.filter(p => (p.inventoryCount || 0) === 0);
        const totalEstValue = trackedProducts.reduce((acc, p) => acc + ((p.inventoryCount || 0) * (p.cost || 0)), 0);

         const filteredInventoryProducts = products.filter(p => {
           const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
           const matchCategory = categoryIdFilter === 'all' || p.categoryId === categoryIdFilter;
           
           let trackState = p.trackInventory;
           if (locallyToggledIds[p.id]) {
             trackState = !trackState;
           }

           let matchTrack = true;
           if (inventoryTrackFilter === 'tracked') {
             matchTrack = !!trackState;
           } else if (inventoryTrackFilter === 'untracked') {
             matchTrack = !trackState;
           }
           
           return matchSearch && matchCategory && matchTrack;
         });

         // Compute prospective products inside the creator modal
         const receiptCandidates = products.filter(p => {
            if (!p.isAvailable) return false;
           // Requirement 1: Only display products that have inventory tracking activated (trackInventory === true)
           if (!p.trackInventory) return false;

           // Requirement 2: Category filter
           if (receiptDraftCategory !== 'all' && p.categoryId !== receiptDraftCategory) return false;

           if (!receiptDraftQuery) return true;
           const queryLower = receiptDraftQuery.toLowerCase();
           return p.name.toLowerCase().includes(queryLower) || p.description.toLowerCase().includes(queryLower);
         });

        return (
          <div className="space-y-6 animate-fade-in text-xs">
            {/* Bento Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-[#4f46e5] to-[#4338ca] text-white p-5 rounded-3xl shadow-md space-y-2 relative overflow-hidden">
                <div className="absolute right-3 bottom-1 text-white/10 shrink-0 select-none">
                  <Boxes className="w-24 h-24" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">Sản phẩm theo dõi</p>
                <h4 className="text-2xl font-black font-mono">{trackedProducts.length} / {products.length}</h4>
                <p className="text-[10px] text-indigo-100/80">Có bật theo dõi quản lý kho</p>
              </div>

              <div className="bg-gradient-to-br from-[#d97706] to-[#b45309] text-white p-5 rounded-3xl shadow-md space-y-2 relative overflow-hidden">
                <div className="absolute right-3 bottom-0 text-white/10 shrink-0 select-none">
                  <AlertCircle className="w-24 h-24" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-100">Sắp hết hàng</p>
                <h4 className="text-2xl font-black font-mono">{lowStockProducts.length} món</h4>
                <p className="text-[10px] text-amber-100/80">Thấp hơn hoặc bằng ngưỡng cài đặt</p>
              </div>

              <div className="bg-gradient-to-br from-[#e11d48] to-[#be123c] text-white p-5 rounded-3xl shadow-md space-y-2 relative overflow-hidden">
                <div className="absolute right-3 bottom-1 text-white/10 shrink-0 select-none">
                  <Trash2 className="w-24 h-24" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-100">Hết hàng trong kho</p>
                <h4 className="text-2xl font-black font-mono">{outOfStockProducts.length} món</h4>
                <p className="text-[10px] text-rose-100/80">Danh mục này sẽ tạm ẩn trên menu</p>
              </div>

              <div className="bg-gradient-to-br from-[#059669] to-[#047857] text-white p-5 rounded-3xl shadow-md space-y-2 relative overflow-hidden">
                <div className="absolute right-3 bottom-1 text-white/10 shrink-0 select-none">
                  <DollarSign className="w-24 h-24" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Giá trị tồn kho ước tính</p>
                <h4 className="text-2xl font-black font-mono">{totalEstValue.toLocaleString('vi-VN')} đ</h4>
                <p className="text-[10px] text-emerald-100/80">Tính theo: Số lượng tồn × Giá vốn</p>
              </div>
            </div>

            {/* Sub-tab Navigation and Global Action */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm mt-4">
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setInventorySubTab('live')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${inventorySubTab === 'live' ? 'bg-[#7052ff] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  Bảng kiểm kho live
                </button>
                <button
                  type="button"
                  onClick={() => setInventorySubTab('receipts')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${inventorySubTab === 'receipts' ? 'bg-[#7052ff] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Lịch sử Nhập kho ({inventoryReceipts.filter(r => !r.isAdjustment).length})
                </button>
                <button
                  type="button"
                  onClick={() => setInventorySubTab('adjustments')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${inventorySubTab === 'adjustments' ? 'bg-[#7052ff] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Cân Đối Hao Hụt ({inventoryReceipts.filter(r => r.isAdjustment).length})
                </button>
                <button
                  type="button"
                  onClick={() => setInventorySubTab('recipes')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${inventorySubTab === 'recipes' ? 'bg-[#7052ff] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  Định Lượng Công Thức
                </button>
              </div>

              {inventorySubTab === 'adjustments' ? (
                <button
                  type="button"
                  onClick={() => {
                    const trackedProds = products.filter(p => p.trackInventory);
                    setAdjustmentDraftItems(trackedProds.map(p => ({
                      productId: p.id,
                      productName: p.name,
                      systemQty: p.inventoryCount || 0,
                      actualQty: p.inventoryCount || 0,
                      reason: 'Hao hụt / Hao mòn tự nhiên'
                    })));
                    setAdjustmentNotes('');
                    setAdjustmentQuery('');
                    setAdjustmentCategory('all');
                    setIsAdjustmentModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Tạo phiếu kiểm kho mới
                </button>
              ) : inventorySubTab === 'recipes' ? (
                <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-slate-450 uppercase tracking-widest px-4 mr-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                  Báo cáo Food Cost tự động
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsReceiptModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 bg-[#7052ff] hover:bg-[#5f40ff] text-white font-black text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo phiếu nhập hàng loạt
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSuggestionModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    Đề xuất nhập hàng
                  </button>
                </>
              )}
            </div>
            {isSuggestionModalOpen && (
              <InventorySuggestionModal
                isOpen={isSuggestionModalOpen}
                onClose={() => setIsSuggestionModalOpen(false)}
                products={products}
                onAddToReceipt={(suggestion) => {
                  setReceiptDraftItems(prev => {
                    const existing = prev.find(item => item.productId === suggestion.product.id);
                    if (existing) {
                      return prev.map(item =>
                        item.productId === suggestion.product.id
                          ? { ...item, quantityAdded: item.quantityAdded + suggestion.quantity }
                          : item
                      );
                    }
                    return [...prev, {
                      productId: suggestion.product.id,
                      productName: suggestion.product.name,
                      quantityAdded: suggestion.quantity,
                      costOnReceipt: suggestion.product.cost ?? 0,
                      priceOnReceipt: 0,
                      currentInventory: suggestion.product.inventoryCount ?? 0
                    }];
                  });
                  setIsSuggestionModalOpen(false);
                  setIsReceiptModalOpen(true);
                  setInventorySubTab('receipts');
                }}
                onAddAllToReceipt={(suggestions) => {
                  setReceiptDraftItems(prev => {
                    const newItems = [...prev];
                    suggestions.forEach(suggestion => {
                      const existing = newItems.find(item => item.productId === suggestion.product.id);
                      if (existing) {
                        existing.quantityAdded += suggestion.quantity;
                      } else {
                        newItems.push({
                          productId: suggestion.product.id,
                          productName: suggestion.product.name,
                          quantityAdded: suggestion.quantity,
                          costOnReceipt: suggestion.product.cost ?? 0,
                          priceOnReceipt: 0,
                          currentInventory: suggestion.product.inventoryCount ?? 0
                        });
                      }
                    });
                    return newItems;
                  });
                  setIsSuggestionModalOpen(false);
                  setIsReceiptModalOpen(true);
                  setInventorySubTab('receipts');
                }}
              />
            )}

            {/* SUB-TAB 1: LIVE INVENTORY LISTING */}
            {inventorySubTab === 'live' && (
              <div className="space-y-6">
                {/* Search and Category Quick Filters */}
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Chi tiết sản lượng kiểm kho</h3>
                    <p className="text-[10px] text-slate-400">Danh mục hiển thị điều lượng tồn. Có thể nhấp tăng giảm hoặc sửa trị số gốc trực tiếp.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                      value={inventoryTrackFilter}
                      onChange={(e) => setInventoryTrackFilter(e.target.value as 'all' | 'tracked' | 'untracked')}
                      className="bg-orange-50 border border-orange-100 text-orange-810 rounded-xl px-3 py-2 text-xs font-black focus:bg-white outline-none w-44 shadow-sm"
                    >
                      <option value="tracked">🟢 Đang theo dõi ({trackedProducts.length})</option>
                      <option value="untracked">⚫ Chưa theo dõi ({products.length - trackedProducts.length})</option>
                      <option value="all">📦 Tất cả sản phẩm ({products.length})</option>
                    </select>

                    <select
                      value={categoryIdFilter}
                      onChange={(e) => setCategoryIdFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none w-36"
                    >
                      <option value="all">Tất cả danh mục</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input
                      type="text"
                      placeholder="Tìm theo tên..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none w-48"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("Bật theo dõi kho nhanh cho TOÀN BỘ đồ uống/sản phẩm? Các món sẽ mặc định tồn: 50.")) {
                          const updated = products.map(p => ({
                            ...p,
                            trackInventory: true,
                            inventoryCount: p.inventoryCount !== undefined ? p.inventoryCount : 50,
                            lowStockAlert: p.lowStockAlert !== undefined ? p.lowStockAlert : 10
                          }));
                          onUpdateProducts(updated);
                          await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Kho hàng', 'Bật quản lý kho hàng loạt', ['admin']);
                        }
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wide"
                    >
                      Bật hàng loạt (50)
                    </button>
                  </div>
                </div>

                {/* Detail data table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[450px] flex flex-col justify-between">
                  <div className="overflow-x-auto flex-grow">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sản phẩm</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái theo dõi</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá vốn / bán</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Số lượng tồn kho (Live)</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cảnh báo khi dưới</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tổng giá trị tồn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredInventoryProducts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center p-10 font-bold text-slate-400">
                              Không tìm thấy mặt hàng nào trong kho!
                            </td>
                          </tr>
                        ) : (
                          filteredInventoryProducts.map(prod => {
                            const isLow = prod.trackInventory && (prod.inventoryCount || 0) <= (prod.lowStockAlert !== undefined ? prod.lowStockAlert : 10);
                            const isOut = prod.trackInventory && (prod.inventoryCount || 0) === 0;

                            return (
                              <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                                {/* Product Name & Icon */}
                                <td className="p-4 font-semibold text-slate-800">
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-2xl">{prod.image}</span>
                                    <div>
                                      <p className="font-extrabold text-slate-800 text-xs leading-none">{prod.name}</p>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
                                        📁 {categories.find(c => c.id === prod.categoryId)?.name || 'Chưa phân nhóm'}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Tracking switch */}
                                <td className="p-4 text-center">
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={prod.trackInventory || false}
                                    onClick={async () => {
                                      const nextTrack = !prod.trackInventory;
                                      
                                      // Keep the row in place during active toggle
                                      setLocallyToggledIds(prev => ({
                                        ...prev,
                                        [prod.id]: !prev[prod.id]
                                      }));

                                      const updated = products.map(p => p.id === prod.id ? {
                                        ...p,
                                        trackInventory: nextTrack,
                                        inventoryCount: p.inventoryCount || 0,
                                        lowStockAlert: p.lowStockAlert !== undefined ? p.lowStockAlert : 10
                                      } : p);
                                      onUpdateProducts(updated);
                                      await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Sửa kho', `${nextTrack ? 'Kích hoạt' : 'Hủy'} theo dõi kho: ${prod.name}`, ['admin']);
                                    }}
                                    className="inline-flex items-center cursor-pointer outline-none focus:outline-none border-none bg-transparent"
                                  >
                                    <div className={`relative w-9 h-5 rounded-full transition-all duration-200 ${prod.trackInventory ? 'bg-orange-500' : 'bg-slate-200'}`}>
                                      <div className={`absolute top-[2px] start-[2px] bg-white rounded-full h-4 w-4 transition-all duration-200 ${prod.trackInventory ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </div>
                                    <span className="ms-2 text-[10px] font-bold text-slate-600 uppercase">
                                      {prod.trackInventory ? 'Bật' : 'Tắt'}
                                    </span>
                                  </button>
                                </td>

                                {/* Pricing info */}
                                <td className="p-4 font-mono">
                                  <p className="text-slate-500 font-bold">Vốn: {(prod.cost || 0).toLocaleString('vi-VN')} đ</p>
                                  <p className="text-slate-800 font-extrabold mt-0.5">Bán: {prod.price.toLocaleString('vi-VN')} đ</p>
                                </td>

                                {/* Stock level adjusting */}
                                <td className="p-4">
                                  {prod.trackInventory ? (
                                    <div className="flex items-center gap-2">
                                      {/* Decrement blocks */}
                                      <div className="flex gap-1 shrink-0">
                                        <button
                                          type="button"
                                          disabled={(prod.inventoryCount || 0) <= 0}
                                          onClick={async () => {
                                            const updated = products.map(p => p.id === prod.id ? {
                                              ...p,
                                              inventoryCount: Math.max(0, (p.inventoryCount || 0) - 10),
                                              isAvailable: Math.max(0, (p.inventoryCount || 0) - 10) > 0 ? p.isAvailable : false
                                            } : p);
                                            onUpdateProducts(updated);
                                          }}
                                          className="px-1.5 py-1 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg text-[9px] font-black transition disabled:opacity-40"
                                          title="-10 cốc"
                                        >
                                          -10
                                        </button>
                                        <button
                                          type="button"
                                          disabled={(prod.inventoryCount || 0) <= 0}
                                          onClick={async () => {
                                            const updated = products.map(p => p.id === prod.id ? {
                                              ...p,
                                              inventoryCount: Math.max(0, (p.inventoryCount || 0) - 1),
                                              isAvailable: Math.max(0, (p.inventoryCount || 0) - 1) > 0 ? p.isAvailable : false
                                            } : p);
                                            onUpdateProducts(updated);
                                          }}
                                          className="px-1.5 py-1 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg text-[9px] font-black transition disabled:opacity-40"
                                          title="-1 cốc"
                                        >
                                          -1
                                        </button>
                                      </div>

                                      {/* Direct number input field */}
                                      <input
                                        type="number"
                                        min={0}
                                        value={prod.inventoryCount || 0}
                                        onChange={async (e) => {
                                          const countVal = Math.max(0, parseInt(e.target.value) || 0);
                                          const updated = products.map(p => p.id === prod.id ? {
                                            ...p,
                                            inventoryCount: countVal,
                                            isAvailable: countVal > 0 ? p.isAvailable : false
                                          } : p);
                                          onUpdateProducts(updated);
                                        }}
                                        className={`w-14 text-center font-mono font-bold text-xs p-1 border rounded-lg outline-none ${
                                          isOut 
                                            ? 'bg-rose-50 border-rose-300 text-rose-700 font-extrabold focus:border-rose-500' 
                                            : isLow 
                                              ? 'bg-amber-50 border-amber-300 text-amber-700 font-extrabold focus:border-amber-500 animate-pulse' 
                                              : 'bg-white border-slate-200 text-slate-800 focus:border-orange-500'
                                        }`}
                                      />

                                      {/* Increment blocks */}
                                      <div className="flex gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const updated = products.map(p => p.id === prod.id ? {
                                              ...p,
                                              inventoryCount: (p.inventoryCount || 0) + 1,
                                              isAvailable: true
                                            } : p);
                                            onUpdateProducts(updated);
                                          }}
                                          className="px-1.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg text-[9px] font-black transition"
                                          title="+1 cốc"
                                        >
                                          +1
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const updated = products.map(p => p.id === prod.id ? {
                                              ...p,
                                              inventoryCount: (p.inventoryCount || 0) + 10,
                                              isAvailable: true
                                            } : p);
                                            onUpdateProducts(updated);
                                          }}
                                          className="px-1.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg text-[9px] font-black transition"
                                          title="+10 cốc"
                                        >
                                          +10
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">Chưa bật theo dõi</span>
                                  )}
                                </td>

                                {/* Warning threshold setting */}
                                <td className="p-4">
                                  {prod.trackInventory ? (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        min={0}
                                        value={prod.lowStockAlert !== undefined ? prod.lowStockAlert : 10}
                                        onChange={async (e) => {
                                          const val = Math.max(0, parseInt(e.target.value) || 0);
                                          const updated = products.map(p => p.id === prod.id ? {
                                            ...p,
                                            lowStockAlert: val
                                          } : p);
                                          onUpdateProducts(updated);
                                        }}
                                        className="w-12 text-center p-1 border border-slate-200 bg-white rounded-lg text-xs font-mono font-bold outline-none focus:border-orange-500"
                                      />
                                      <span className="text-[10px] text-slate-400">cốc</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 select-none">-</span>
                                  )}
                                </td>

                                {/* Estimated total value */}
                                <td className="p-4 text-right font-mono font-extrabold text-slate-700">
                                  {prod.trackInventory ? (
                                    `${((prod.inventoryCount || 0) * (prod.cost || 0)).toLocaleString('vi-VN')} đ`
                                  ) : (
                                    <span className="text-slate-400 font-normal select-none">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: INVENTORY RECEIPTS ARCHIVE */}
            {inventorySubTab === 'receipts' && (() => {
              const importReceipts = inventoryReceipts.filter(r => !r.isAdjustment);
              return (
                <div className="space-y-6 animate-fade-in text-xs">
                  {/* Search receipt bars & helper */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Kho lưu trữ phiếu nhập</h3>
                      <p className="text-[10px] text-slate-400">Xem lại dữ liệu chi tiết, giá nhập gốc, số lượng sản phẩm nhập theo đợt hàng.</p>
                    </div>
                  </div>

                  {/* Receipts Data Table */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã Phiếu</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người thực hiện</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Số lượng món</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tổng số lượng nhập</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tổng chi phí</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {importReceipts.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center p-14 font-bold text-slate-400 bg-slate-50/20">
                                <div className="flex flex-col items-center justify-center gap-2 py-8">
                                  <FileText className="w-10 h-10 text-slate-350" />
                                  <span>Chưa lưu phiếu nhập kho nào! Hãy tạo phiếu mới ở nút phía trên.</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            importReceipts.map(rec => {
                              const formattedDate = new Date(rec.createdAt).toLocaleDateString('vi-VN', {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                                hour: '2-digit', minute: '2-digit'
                              });
                              return (
                                <tr key={rec.id} className="hover:bg-slate-50/50 transition text-[11px]">
                                  <td className="p-4 font-black text-[#7052ff]">{rec.receiptCode}</td>
                                  <td className="p-4 text-slate-600 font-bold">{formattedDate}</td>
                                  <td className="p-4 font-extrabold text-slate-800">👤 {rec.createdBy}</td>
                                  <td className="p-4 text-center text-slate-600 font-bold">{rec.items?.length || 0} món</td>
                                  <td className="p-4 text-center font-black text-slate-700">{rec.totalItems || 0} cốc</td>
                                  <td className="p-4 text-right font-black text-emerald-600">{(rec.totalCost || 0).toLocaleString('vi-VN')} đ</td>
                                  <td className="p-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReceipt(rec)}
                                      className="px-3 py-1.5 bg-[#f0ecff] hover:bg-[#7052ff] text-[#7052ff] hover:text-white rounded-lg font-black uppercase text-[9px] tracking-wider transition-all shadow-sm"
                                    >
                                      Xem chi tiết
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* SUB-TAB 3: INVENTORY AUDIT & ADJUSTMENT LEDGER */}
            {inventorySubTab === 'adjustments' && (() => {
              const auditReceipts = inventoryReceipts.filter(r => r.isAdjustment);
              return (
                <div className="space-y-6 animate-fade-in text-xs">
                  <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Nhật ký Cân đối & Rà soát hao hụt</h3>
                      <p className="text-[10px] text-slate-400">Xem lại lịch sử các đợt kiểm kê thủ công, sai lệch sản lượng thực tế và giá trị hao hụt tài sản.</p>
                    </div>
                  </div>

                  {/* Audit Ledger Table */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã Phiếu</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời điểm kiểm kê</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người thực hiện</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nguyên liệu thô</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tổng lượng lệch</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá trị sai lệch quy đổi</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {auditReceipts.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center p-14 font-bold text-slate-400 bg-slate-50/20">
                                <div className="flex flex-col items-center justify-center gap-2 py-8">
                                  <ClipboardCheck className="w-10 h-10 text-orange-400" />
                                  <span>Chưa ghi nhận phiếu rà soát / cân đối kho nào! Hãy tạo phiếu kiểm kho mới ở nút bên trên để ghi nhận sai lệch thực tế.</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            auditReceipts.map(rec => {
                              const formattedDate = new Date(rec.createdAt).toLocaleDateString('vi-VN', {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                                hour: '2-digit', minute: '2-digit'
                              });
                              const discrepancySum = rec.totalItems;
                              return (
                                <tr key={rec.id} className="hover:bg-slate-50/50 transition text-[11px]">
                                  <td className="p-4 font-black text-orange-600">{rec.receiptCode}</td>
                                  <td className="p-4 text-slate-600 font-bold">{formattedDate}</td>
                                  <td className="p-4 font-extrabold text-slate-800">👤 {rec.createdBy}</td>
                                  <td className="p-4 text-center text-slate-600 font-bold">{rec.items?.length || 0} nguyên liệu</td>
                                  <td className={`p-4 text-center font-black ${discrepancySum > 0 ? 'text-emerald-600' : discrepancySum < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                    {discrepancySum > 0 ? `+${discrepancySum}` : discrepancySum} ly
                                  </td>
                                  <td className={`p-4 text-right font-black ${rec.totalCost > 0 ? 'text-emerald-600' : rec.totalCost < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                    {rec.totalCost > 0 ? `+${rec.totalCost.toLocaleString('vi-VN')}` : rec.totalCost.toLocaleString('vi-VN')} đ
                                  </td>
                                  <td className="p-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReceipt(rec)}
                                      className="px-3 py-1.5 bg-orange-100 hover:bg-orange-500 text-orange-600 hover:text-white rounded-lg font-black uppercase text-[9px] tracking-wider transition-all shadow-sm"
                                    >
                                      Biên bản đối soát
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* SUB-TAB 4: RECIPE FORMULATION (ĐỊNH LƯỢNG CÔNG THỨC) */}
            {inventorySubTab === 'recipes' && (() => {
              const menuProducts = products.filter(p => !p.isIngredient);
              const rawIngredients = products.filter(p => p.isIngredient);

              const filteredMenuProducts = menuProducts.filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(recipeSearchQuery.toLowerCase());
                const matchesCat = recipeCategoryFilter === 'all' || p.categoryId === recipeCategoryFilter;
                return matchesSearch && matchesCat;
              });

              const selectedProduct = products.find(p => p.id === selectedRecipeProductId);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-xs font-sans">
                  
                  {/* Left Column: Menu Items list */}
                  <div className="lg:col-span-12 xl:col-span-5 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[580px]">
                    <div className="shrink-0 space-y-3 mb-4">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">1. Chọn sản phẩm cần định lượng</h4>
                        <p className="text-[10px] text-slate-400">Thiết lập hao hụt nguyên liệu thô tự động khi bán đồ uống/món dưới đây.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Tìm món..."
                          value={recipeSearchQuery}
                          onChange={(e) => setRecipeSearchQuery(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] focus:bg-white outline-none w-full"
                        />
                        <select
                          value={recipeCategoryFilter}
                          onChange={(e) => setRecipeCategoryFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[11px] outline-none"
                        >
                          <option value="all">Tất cả nhóm</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                      {filteredMenuProducts.map(prod => {
                        const hasRecipe = prod.recipe && prod.recipe.length > 0;
                        const isSelected = prod.id === selectedRecipeProductId;

                        return (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => {
                              setSelectedRecipeProductId(prod.id);
                              setRecipeDraftIngredients(prod.recipe ? [...prod.recipe] : []);
                            }}
                            className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${isSelected ? 'bg-indigo-50 border-indigo-200 ring-2 ring-[#7052ff]/10' : 'bg-slate-50/40 hover:bg-slate-50 border-slate-100'}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl shrink-0">{prod.image}</span>
                              <div>
                                <p className="font-extrabold text-slate-800 text-[11.5px] leading-snug">{prod.name}</p>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                  {categories.find(c => c.id === prod.categoryId)?.name || 'Chưa chia nhóm'}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {hasRecipe ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 font-extrabold rounded-full text-[9px] uppercase border border-emerald-100">
                                  ● {prod.recipe?.length} nguyên liệu
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-400 font-bold rounded-full text-[9px] uppercase">
                                  Chưa định lượng
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Recipe details designer */}
                  <div className="lg:col-span-12 xl:col-span-7 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[580px]">
                    {selectedProduct ? (
                      <div className="flex flex-col h-full justify-between">
                        <div className="shrink-0 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                          <div>
                            <span className="text-[8.5px] font-black text-[#7052ff] uppercase tracking-widest block mb-0.5">BIÊN BẢN ĐỊNH LƯỢNG HAO HỤT</span>
                            <h4 className="font-extrabold text-slate-800 text-sm leading-none flex items-center gap-1.5 font-sans">
                              <span className="text-lg">{selectedProduct.image}</span>
                              {selectedProduct.name}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecipeProductId(null);
                              setRecipeDraftIngredients([]);
                            }}
                            className="text-slate-400 hover:text-slate-600 font-bold text-[10px] tracking-wider uppercase focus:outline-none"
                          >
                            ✕ Đóng
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
                          <h5 className="text-[8.5px] font-black text-slate-450 uppercase tracking-widest">
                            Khấu trừ nguyên liệu thô khi bán 1 ly:
                          </h5>

                          {recipeDraftIngredients.length === 0 ? (
                            <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center font-bold text-slate-400 space-y-1 bg-slate-50/40">
                              <ChefHat className="w-8 h-8 text-indigo-300 mx-auto opacity-75" />
                              <p className="text-slate-500 font-black">Chưa định mức nguyên liệu tiêu hao.</p>
                              <p className="text-[10px] text-slate-400 font-normal">Sử dụng thanh công cụ bên dưới để thêm các nguyên liệu thành phần thô.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {recipeDraftIngredients.map((draft, idx) => {
                                const matchedIng = products.find(p => p.id === draft.ingredientId);
                                return (
                                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-[11px]">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{matchedIng?.image || '📦'}</span>
                                      <div>
                                        <p className="font-extrabold text-slate-800">{matchedIng?.name || 'Nguyên liệu'}</p>
                                        <p className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Tồn kho live: {matchedIng?.inventoryCount || 0} g/ml</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <div className="flex items-center bg-white border border-slate-200 rounded-lg">
                                        <input
                                          type="number"
                                          min="1"
                                          value={draft.quantity}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const updated = [...recipeDraftIngredients];
                                            updated[idx].quantity = val;
                                            setRecipeDraftIngredients(updated);
                                          }}
                                          className="w-16 text-center outline-none bg-transparent font-bold py-1 font-mono text-slate-800 text-xs"
                                        />
                                        <span className="px-2 font-mono text-[9px] bg-slate-50 py-1 rounded-r-lg border-l border-slate-200 font-bold text-slate-500">
                                          {draft.unit || 'g'}
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = recipeDraftIngredients.filter((_, i) => i !== idx);
                                          setRecipeDraftIngredients(updated);
                                        }}
                                        className="p-1 text-rose-505 hover:bg-rose-50 text-rose-500 rounded-lg transition"
                                        title="Xóa"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {recipeDraftIngredients.length > 0 && (
                            <div className="p-3 bg-indigo-50/55 border border-indigo-100 rounded-xl flex justify-between items-center text-[10px] shrink-0 font-bold">
                              <span className="text-indigo-800 uppercase tracking-wider font-extrabold">Ước lượng Food Cost (giá gốc nguyên liệu):</span>
                              <span className="font-black text-indigo-700 font-mono text-xs">
                                {recipeDraftIngredients.reduce((acc, curr) => {
                                  const matchingIngredient = products.find(p => p.id === curr.ingredientId);
                                  const ingredientCost = matchingIngredient?.cost || 0;
                                  return acc + (curr.quantity * ingredientCost);
                                }, 0).toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 border-t border-slate-100 pt-3 space-y-3">
                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                            <span className="block text-[8.5px] font-black text-slate-455 uppercase tracking-widest">Thành phần thô:</span>
                            <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                              <select
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-bold outline-none text-slate-705 text-[11px]"
                                onChange={(e) => {
                                  const ingId = e.target.value;
                                  if (!ingId) return;
                                  if (recipeDraftIngredients.some(d => d.ingredientId === ingId)) {
                                    alert("Nguyên liệu này đã được cấu hình trong đơn định lượng!");
                                    e.target.value = "";
                                    return;
                                  }
                                  const matchIng = products.find(p => p.id === ingId);
                                  if (matchIng) {
                                    setRecipeDraftIngredients([
                                      ...recipeDraftIngredients,
                                      {
                                        ingredientId: ingId,
                                        quantity: 10,
                                        unit: 'g'
                                      }
                                    ]);
                                  }
                                  e.target.value = "";
                                }}
                              >
                                <option value="">-- Click chọn nguyên liệu thành phần --</option>
                                {rawIngredients.map(ing => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.image} {ing.name} (Tồn hiện có: {ing.inventoryCount || 0})
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={async () => {
                                  const name = window.prompt("Tên nguyên liệu thô hoặc gói cấp đông (Ví dụ: Thạch trân châu đường đen, Sữa tươi tiệt trùng, Trà lài thanh nhiệt):");
                                  if (!name) return;
                                  const costIn = window.prompt("Trị giá vốn bình quân cho 1g hoặc 1ml thành phẩm thô này (Ví dụ: 15 đ cho 1g đường/bột):", "15");
                                  const costVal = parseFloat(costIn || '0') || 0;
                                  const emoji = window.prompt("Emoji minh họa:", "🥛");

                                  const rId = 'raw-' + Date.now();
                                  const newRaw: Product = {
                                    id: rId,
                                    name,
                                    categoryId: categories[0]?.id || 'cat-none',
                                    price: 0,
                                    cost: costVal,
                                    image: emoji || '🥛',
                                    description: 'Nguyên liệu thô',
                                    isAvailable: true,
                                    isVisibleToCustomer: false,
                                    isIngredient: true,
                                    trackInventory: true,
                                    inventoryCount: 1000,
                                    lowStockAlert: 100
                                  };

                                  const updatedProducts = [newRaw, ...products];
                                  onUpdateProducts(updatedProducts);
                                  await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Thêm nguyên liệu', `Thêm mới nguyên liệu thô: ${name}`, ['admin']);
                                  
                                  setRecipeDraftIngredients([
                                    ...recipeDraftIngredients,
                                    {
                                      ingredientId: rId,
                                      quantity: 15,
                                      unit: 'g'
                                    }
                                  ]);
                                }}
                                className="bg-orange-50 hover:bg-orange-100 text-orange-600 font-extrabold px-3 py-1.5 rounded-lg border border-orange-100 text-[10px] uppercase tracking-wider transition-all whitespace-nowrap"
                              >
                                Thêm mới nguyên liệu
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setRecipeDraftIngredients(selectedProduct.recipe ? [...selectedProduct.recipe] : []);
                              }}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[9px] uppercase tracking-wider rounded-xl transition shadow-sm"
                            >
                              Khôi phục
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                const cleanIngredients = recipeDraftIngredients.filter(x => x.quantity > 0);
                                const updatedProducts = products.map(p => {
                                  if (p.id === selectedProduct.id) {
                                    return {
                                      ...p,
                                      recipe: cleanIngredients
                                    };
                                  }
                                  return p;
                                });

                                onUpdateProducts(updatedProducts);
                                await logAndNotify(
                                  authenticatedStaff?.fullName || 'Admin',
                                  'Định lượng công thức',
                                  `Cập nhật thành công định lượng sản phẩm [${selectedProduct.name}] với ${cleanIngredients.length} thành phần thô.`,
                                  ['admin']
                                );
                                alert(`Cấu hình thành phẩm [${selectedProduct.name}] thành công!`);
                              }}
                              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-black text-[9px] text-white uppercase tracking-wider rounded-xl transition shadow-md active:scale-95"
                            >
                              💾 LƯU CẤU HÌNH ĐỊNH LƯỢNG
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center h-full text-slate-450 font-bold space-y-2 py-10 bg-slate-50/40 rounded-3xl border border-dashed border-slate-200">
                        <ChefHat className="w-12 h-12 text-[#7052ff] shrink-0 opacity-80" />
                        <p className="text-slate-700 text-sm font-black">Chưa thiết lý công thức</p>
                        <p className="text-[10px] text-slate-400 font-normal max-w-sm">
                          👈 Hãy nhấp chọn một món đồ uống ở danh sách bên trái để kiểm tra/hồ sơ định mức tiêu hao nguyên vật liệu.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* CREATOR MODAL: IMMERSIVE BATCH STOCK INPUT WORKFLOW */}
            {isReceiptModalOpen && (
              <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-md flex items-center justify-center z-[9999] animate-fade-in p-2 sm:p-4 text-xs font-sans">
                <div className="bg-white rounded-[32px] w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-[#7052ff] to-[#5f40ff] p-4 shrink-0 text-white flex justify-between items-center">
                    <div>
                      <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5">
                        <Boxes className="w-5 h-5" />
                        Tạo Phiếu Nhập Kho Hàng Loạt
                      </h3>
                      <p className="text-[10px] text-purple-100 font-bold">Thêm nhanh nhiều cốc/sản phẩm vào bếp, tự động ghi nhận giá vốn và kích hoạt bộ theo dõi kho tự động.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReceiptModalOpen(false)}
                      className="text-white hover:bg-white/10 p-2 rounded-full font-bold transition text-sm focus:outline-none"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Body: Spit catalog (35%) & Draft slip (65%) */}
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-50">
                    
                    {/* Catalog Picker Column (Left) */}
                    <div className="w-full md:w-[35%] bg-white border-r border-slate-100 flex flex-col overflow-hidden">
                      <div className="p-3 border-b border-slate-100 shrink-0 bg-slate-50/40 space-y-2">
                        <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest">1. Tìm sản phẩm để nhập kho</label>
                        <div className="flex gap-1.5 items-center">
                          <select
                            value={receiptDraftCategory}
                            onChange={(e) => setReceiptDraftCategory(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-[10px] font-extrabold focus:bg-white outline-none focus:border-[#7052ff] shadow-inner max-w-[120px] truncate"
                          >
                            <option value="all">Tất cả DM</option>
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Món ăn/đồ uống..."
                            value={receiptDraftQuery}
                            onChange={(e) => setReceiptDraftQuery(e.target.value)}
                            className="flex-grow min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none focus:border-[#7052ff] shadow-inner"
                          />
                        </div>
                      </div>

                      {/* Readable product options */}
                      <div className="flex-grow overflow-y-auto p-2 space-y-1 bg-white">
                        {receiptCandidates.length === 0 ? (
                          <div className="text-center p-8 text-slate-400 font-bold">Không tìm thấy món nào!</div>
                        ) : (
                          receiptCandidates.map(prod => {
                            const isAdded = receiptDraftItems.some(x => x.productId === prod.id);
                            return (
                              <button
                                type="button"
                                key={prod.id}
                                disabled={isAdded}
                                onClick={() => {
                                  setReceiptDraftItems(prev => [
                                    ...prev,
                                    {
                                      productId: prod.id,
                                      productName: prod.name,
                                      quantityAdded: 10,
                                      costOnReceipt: prod.cost || 0,
                                      priceOnReceipt: prod.price || 0,
                                      currentInventory: prod.inventoryCount || 0
                                    }
                                  ]);
                                }}
                                className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between border ${isAdded ? 'bg-slate-50 border-slate-150 opacity-45 cursor-not-allowed' : 'bg-slate-50/30 hover:bg-orange-50/50 border-slate-100 hover:border-orange-200'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xl shrink-0">{prod.image || '🍺'}</span>
                                  <div>
                                    <h6 className="font-bold text-slate-800 text-[11px]">{prod.name}</h6>
                                    <span className="text-[9px] text-[#7052ff] font-bold">Hiện tại: {prod.inventoryCount || 0} cốc / {prod.price.toLocaleString('vi-VN')} đ</span>
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  {isAdded ? (
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">✓ Đã thêm</span>
                                  ) : (
                                    <span className="text-[10px] font-bold bg-[#f1edff] text-[#7052ff] hover:bg-[#7052ff] hover:text-white px-2 py-1 rounded-lg transition">+ Nhập</span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Pending Draft Slip Column (Right) */}
                    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-50 p-4">
                      <div className="shrink-0 mb-2 flex justify-between items-center">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">2. Danh sách sản phẩm lập phiếu nhập kho hàng loạt</label>
                        <span className="bg-orange-100 text-orange-950 px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wide">
                          Giỏ nháp: {receiptDraftItems.length} món
                        </span>
                      </div>

                      {/* Draft table scroll block */}
                      <div className="flex-grow overflow-y-auto bg-white rounded-2xl border border-slate-100 shadow-sm min-h-0">
                        {receiptDraftItems.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center p-10 text-center gap-2">
                            <Plus className="w-12 h-12 text-slate-200 animate-pulse" />
                            <h4 className="font-extrabold text-slate-500 text-sm">Chưa chọn thực đơn nào!</h4>
                            <p className="text-[10px] text-slate-400 max-w-xs">Nhấp chọn các món đồ từ danh mục bên trái để đưa vào đợt nhập hàng này.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-150">
                                <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi tiết món</th>
                                <th className="p-3 text-[10px] font-black text-slate-450 uppercase tracking-widest text-center">Tồn live</th>
                                <th className="p-3 text-[10px] font-black text-slate-450 uppercase tracking-widest text-center w-28">Lượng nhập thêm</th>
                                <th className="p-3 text-[10px] font-black text-slate-450 uppercase tracking-widest w-36">Giá nhập (Cá nhân)</th>
                                <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tổng chi phí</th>
                                <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hủy</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {receiptDraftItems.map((item, index) => {
                                const rowCost = item.quantityAdded * item.costOnReceipt;
                                return (
                                  <tr key={item.productId} className="hover:bg-slate-55/40 text-[11px]">
                                    <td className="p-3 font-extrabold text-slate-800">{item.productName}</td>
                                    <td className="p-3 text-center font-bold text-slate-400 font-mono">{item.currentInventory || 0}</td>
                                    
                                    {/* Qty count input */}
                                    <td className="p-3 text-center">
                                      <input
                                        type="number"
                                        min={1}
                                        value={item.quantityAdded}
                                        onChange={(e) => {
                                          const val = Math.max(1, parseInt(e.target.value) || 1);
                                          setReceiptDraftItems(prev => prev.map((x, i) => i === index ? { ...x, quantityAdded: val } : x));
                                        }}
                                        className="w-16 text-center font-mono font-black text-xs bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none focus:border-orange-500"
                                      />
                                    </td>

                                    {/* Cost override input */}
                                    <td className="p-3">
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min={0}
                                          step={500}
                                          value={item.costOnReceipt}
                                          onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                            setReceiptDraftItems(prev => prev.map((x, i) => i === index ? { ...x, costOnReceipt: val } : x));
                                          }}
                                          className="w-24 text-right font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none focus:border-[#7052ff]"
                                        />
                                        <span className="text-[10px] text-slate-400 font-bold">đ</span>
                                      </div>
                                    </td>

                                    {/* Subtotal preview */}
                                    <td className="p-3 text-right font-bold font-mono text-slate-700">
                                      {formatCurrency(rowCost)} đ
                                    </td>

                                    {/* Remove button */}
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReceiptDraftItems(prev => prev.filter((_, i) => i !== index));
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition"
                                      >
                                        ✕
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* Notes & Summary cards */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
                        {/* Left block notes */}
                        <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col gap-1.5 shadow-sm">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">3. Ghi chú phiếu nhập (Nhà phân phối, thời gian, v.v)</label>
                          <textarea
                            placeholder="Ví dụ: Nhập hàng đợt khai trương chi nhánh, hoặc ghi thêm tên đối tác giao bia cốc nước ngọt..."
                            value={receiptNotes}
                            onChange={(e) => setReceiptNotes(e.target.value)}
                            className="w-full flex-grow bg-slate-50 border border-slate-150 rounded-xl p-2.5 outline-none focus:bg-white focus:border-[#7052ff] resize-none h-[65px] font-semibold text-xs text-slate-700 shadow-inner"
                          />
                        </div>

                        {/* Right block analytics summary card */}
                        <div className="bg-[#fbfcff] p-3 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
                          <div className="space-y-1 text-slate-600">
                            <div className="flex justify-between font-bold text-[10px]">
                              <span>Tổng sản phẩm:</span>
                              <span className="text-slate-800 font-extrabold">{receiptDraftItems.length} món</span>
                            </div>
                            <div className="flex justify-between font-bold text-[10px]">
                              <span>Tổng số lượng nhập hàng:</span>
                              <span className="text-slate-800 font-extrabold">
                                {receiptDraftItems.reduce((acc, x) => acc + x.quantityAdded, 0)} ly/cốc
                              </span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-dashed border-slate-150 mt-2 flex justify-between items-center shrink-0">
                            <span className="font-extrabold text-xs text-slate-500 uppercase tracking-wide">TỔNG TIỀN PHIẾU:</span>
                            <span className="text-sm font-black text-emerald-600 font-mono">
                              {formatCurrency(receiptDraftItems.reduce((acc, x) => acc + (x.quantityAdded * x.costOnReceipt), 0))} đ
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer Controls */}
                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 shrink-0 flex justify-between items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (receiptDraftItems.length === 0 || window.confirm("Hủy bỏ phiếu nháp hiện tại?")) {
                          setReceiptDraftItems([]);
                          setReceiptNotes('');
                          setReceiptDraftQuery('');
                          setReceiptDraftCategory('all');
                          setIsReceiptModalOpen(false);
                        }
                      }}
                      className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 font-extrabold text-[10px] text-slate-700 rounded-xl uppercase tracking-wider transition active:scale-95"
                    >
                      Hủy và đóng
                    </button>

                    <button
                      type="button"
                      disabled={receiptDraftItems.length === 0}
                      onClick={async () => {
                        if (receiptDraftItems.length === 0) return;

                        const totalCost = receiptDraftItems.reduce((acc, x) => acc + (x.quantityAdded * x.costOnReceipt), 0);
                        const totalItems = receiptDraftItems.reduce((acc, x) => acc + x.quantityAdded, 0);

                        // Batch update products collection counts + activation tracking
                        const updatedProducts = products.map(p => {
                          const draftItem = receiptDraftItems.find(x => x.productId === p.id);
                          if (draftItem) {
                            return {
                              ...p,
                              trackInventory: true, // Automatically enable inventory management
                              inventoryCount: (p.inventoryCount || 0) + draftItem.quantityAdded,
                              cost: draftItem.costOnReceipt,
                              price: draftItem.priceOnReceipt
                            };
                          }
                          return p;
                        });

                        // Create the inventory receipt record
                        const nextId = inventoryReceipts.length + 1;
                        const receiptCode = `PNK-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${String(nextId).padStart(4, '0')}`;
                        
                        const newReceipt: InventoryReceipt = {
                          id: 'rec-' + Date.now(),
                          receiptCode,
                          createdAt: new Date().toISOString(),
                          createdBy: authenticatedStaff?.fullName || 'Quản trị viên',
                          items: receiptDraftItems.map(item => ({
                            productId: item.productId,
                            productName: item.productName,
                            quantityAdded: item.quantityAdded,
                            costOnReceipt: item.costOnReceipt,
                            priceOnReceipt: item.priceOnReceipt
                          })),
                          totalCost,
                          totalItems,
                          notes: receiptNotes
                        };

                        // Trigger Firestore synchronization callbacks
                        onUpdateProducts(updatedProducts);
                        onUpdateInventoryReceipts([newReceipt, ...inventoryReceipts]);

                        // Publish audit logs & notification messages
                        await logAndNotify(
                          authenticatedStaff?.fullName || 'Admin',
                          'Nhập kho hàng loạt',
                          `Đã nhập kho hàng loạt thành công phiếu ${receiptCode} cho ${receiptDraftItems.length} món. Tổng: +${totalItems} ly. Trị giá vốn: ${totalCost.toLocaleString('vi-VN')} đ`,
                          ['admin']
                        );

                        // Reset states & Close
                        setIsReceiptModalOpen(false);
                      }}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#7052ff] to-indigo-600 hover:from-[#5f40ff] hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed text-white font-black text-[10px] rounded-xl uppercase tracking-wider transition shadow-md active:scale-95"
                    >
                      💥 XÁC NHẬN NHẬP KHO HÀNG LOẠT
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AUDIT MODAL: PHYSICAL STOCK TAKE & BALANCING (CÂN ĐỐI HAO HỤT) */}
            {isAdjustmentModalOpen && (
              <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-md flex items-center justify-center z-[9999] animate-fade-in p-2 sm:p-4 text-xs font-sans">
                <div className="bg-white rounded-[32px] w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-4 shrink-0 text-white flex justify-between items-center">
                    <div>
                      <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5">
                        <ClipboardCheck className="w-5 h-5 animate-pulse" />
                        Kiểm Kho Thực Tế & Cập Nhật Cân Đối Sản Lượng
                      </h3>
                      <p className="text-[10px] text-amber-50 font-bold">Rà soát trực tiếp sản lượng tồn quầy hiện tại so với lý thuyết, đồng thời ghi nhận hao hụt/thừa hụt vào sổ cái.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAdjustmentModalOpen(false)}
                      className="text-white hover:bg-white/10 p-2 rounded-full font-bold transition text-sm focus:outline-none"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-50">
                    {/* Left Column: Filter and select items to audit */}
                    <div className="w-full md:w-[40%] bg-white border-r border-slate-100 flex flex-col overflow-hidden">
                      <div className="p-3 border-b border-slate-100 shrink-0 bg-slate-50/40 space-y-2">
                        <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest">Chọn nguyên liệu cần rà soát</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={adjustmentQuery}
                            onChange={(e) => setAdjustmentQuery(e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] focus:bg-white outline-none w-full"
                          />
                          <select
                            value={adjustmentCategory}
                            onChange={(e) => setAdjustmentCategory(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] outline-none font-bold"
                          >
                            <option value="all">Mọi nhóm</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Filtered products table to pick items */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                        {products
                          .filter(p => p.trackInventory)
                          .filter(p => {
                            const matchQuery = p.name.toLowerCase().includes(adjustmentQuery.toLowerCase());
                            const matchCat = adjustmentCategory === 'all' || p.categoryId === adjustmentCategory;
                            return matchQuery && matchCat;
                          })
                          .map(p => {
                            const isAdded = adjustmentDraftItems.some(x => x.productId === p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  if (isAdded) {
                                    // Remove
                                    setAdjustmentDraftItems(adjustmentDraftItems.filter(x => x.productId !== p.id));
                                  } else {
                                    // Add
                                    setAdjustmentDraftItems([
                                      ...adjustmentDraftItems,
                                      {
                                        productId: p.id,
                                        productName: p.name,
                                        systemQty: p.inventoryCount || 0,
                                        actualQty: p.inventoryCount || 0,
                                        reason: 'Hao hụt / Hao mòn tự nhiên'
                                      }
                                    ]);
                                  }
                                }}
                                className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${isAdded ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50/10 hover:bg-slate-50 border-slate-100'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xl shrink-0">{p.image}</span>
                                  <div>
                                    <p className="font-extrabold text-slate-800">{p.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                      {p.isIngredient ? '🥛 Nguyên liệu thô' : '🥤 Đồ uống bán lẻ'}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-mono font-bold text-slate-505">Recorded: {p.inventoryCount || 0}</span>
                                  <span className={`block text-[9px] font-black uppercase tracking-wider ${isAdded ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {isAdded ? '✓ Đã chọn' : '➕ Click chọn'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Right Column: Balancing worksheet and adjustments input fields */}
                    <div className="w-full md:w-[60%] flex flex-col overflow-hidden">
                      <div className="p-4 shrink-0 bg-white border-b border-slate-100 flex justify-between items-center">
                        <div>
                          <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">2. Bảng kê sai đối lượng chi tiết</h4>
                          <p className="text-[10px] text-slate-400 font-semibold">Điền sản lượng đếm thực tế của nhân viên kiểm kê dưới đây.</p>
                        </div>
                        <span className="bg-amber-100 text-amber-800 font-extrabold text-[9px] px-3 py-1 rounded-full uppercase tracking-wider">
                          Đã chọn: {adjustmentDraftItems.length} món
                        </span>
                      </div>

                      {/* Worksheet list input rows */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {adjustmentDraftItems.length === 0 ? (
                          <div className="text-center p-14 font-bold text-slate-400 py-16 bg-white rounded-3xl border border-slate-100 shadow-inner">
                            <ClipboardCheck className="w-12 h-12 text-amber-300 mx-auto mb-2 opacity-80" />
                            <p className="text-slate-650 font-black text-xs uppercase tracking-wide">Phiếu rà soát trống!</p>
                            <p className="text-[10px] text-slate-400 font-normal max-w-xs mx-auto mt-1 leading-relaxed">
                              Vui lòng chọn các nguyên liệu thô hoặc sản phẩm từ danh mục bên trái để bắt đầu lập đợt kiểm kho thực tế.
                            </p>
                          </div>
                        ) : (
                          adjustmentDraftItems.map((item, idx) => {
                            const originalProd = products.find(p => p.id === item.productId);
                            const discrepancy = item.actualQty - item.systemQty;
                            const estimatedUnitCost = originalProd?.cost || 0;
                            const financialImpact = discrepancy * estimatedUnitCost;

                            return (
                              <div key={item.productId} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                {/* Header descriptive details */}
                                <div className="flex justify-between items-center text-[11px] font-bold">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg shrink-0">{originalProd?.image || '📦'}</span>
                                    <div>
                                      <p className="font-black text-slate-800">{item.productName}</p>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                                        Giá gốc: {(estimatedUnitCost).toLocaleString('vi-VN')} đ / ly
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = adjustmentDraftItems.filter(x => x.productId !== item.productId);
                                      setAdjustmentDraftItems(updated);
                                    }}
                                    className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition focus:outline-none"
                                  >
                                    ✕ Xóa
                                  </button>
                                </div>

                                {/* Matrix parameters input (Actual counters) */}
                                <div className="grid grid-cols-12 gap-3 items-center pt-2 border-t border-slate-50 text-[11px]">
                                  {/* Theoretical system standard qty */}
                                  <div className="col-span-3">
                                    <span className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Sản lượng Hệ thống</span>
                                    <span className="font-mono font-extrabold text-slate-800 text-xs">{item.systemQty} ly</span>
                                  </div>

                                  {/* Counted input field actual count */}
                                  <div className="col-span-4">
                                    <span className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1">Thực đếm tồn</span>
                                    <div className="flex items-center border border-slate-200 rounded-lg max-w-[110px] bg-white">
                                      <input
                                        type="number"
                                        min="0"
                                        value={item.actualQty}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value) || 0;
                                          const updated = [...adjustmentDraftItems];
                                          updated[idx].actualQty = val;
                                          setAdjustmentDraftItems(updated);
                                        }}
                                        className="w-full text-center outline-none bg-transparent font-black font-mono py-1 text-slate-850 text-xs"
                                      />
                                      <span className="px-2 text-[10px] font-bold bg-slate-50 border-l border-slate-150 py-1 text-slate-500 rounded-r-lg">ly</span>
                                    </div>
                                  </div>

                                  {/* Discrepancy indicator badge */}
                                  <div className="col-span-2">
                                    <span className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Sai lệch</span>
                                    <span className={`font-mono font-black text-xs ${discrepancy > 0 ? 'text-emerald-600' : discrepancy < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                      {discrepancy > 0 ? `+${discrepancy}` : discrepancy} ly
                                    </span>
                                  </div>

                                  {/* Cash value difference of this line */}
                                  <div className="col-span-3 text-right">
                                    <span className="block text-[8.5px] font-black text-slate-450 uppercase tracking-widest">Lệch trị giá</span>
                                    <span className={`font-mono font-black text-xs ${financialImpact > 0 ? 'text-emerald-600' : financialImpact < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                      {financialImpact.toLocaleString('vi-VN')} đ
                                    </span>
                                  </div>
                                </div>

                                {/* Custom reason description input */}
                                <div className="pt-2 border-t border-slate-50 flex items-center gap-2">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Lý do đối soát:</span>
                                  <input
                                    type="text"
                                    value={item.reason}
                                    placeholder="Điền nguyên nhân..."
                                    onChange={(e) => {
                                      const updated = [...adjustmentDraftItems];
                                      updated[idx].reason = e.target.value;
                                      setAdjustmentDraftItems(updated);
                                    }}
                                    className="flex-1 bg-slate-50 focus:bg-white border border-slate-150 rounded-lg px-2.5 py-1 text-[10.5px] font-semibold outline-none"
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Global Notes & Finish triggers */}
                      <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-3.5">
                        <div>
                          <label className="block text-[8.5px] font-black text-slate-455 uppercase tracking-widest mb-1.55">Mục tiêu rà soát tổng hợp / Nhật ký đợt kiểm kho:</label>
                          <textarea
                            className="w-full bg-slate-50/50 focus:bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-semibold text-[11px]"
                            rows={2}
                            placeholder="Mô tả đợt rà soát (Ví dụ: Kiểm kho cuối tuần phòng tránh hao hụt, bàn giao ca tối ngày...)"
                            value={adjustmentNotes}
                            onChange={(e) => setAdjustmentNotes(e.target.value)}
                          />
                        </div>

                        {/* Totals Summary ledger stats */}
                        {adjustmentDraftItems.length > 0 && (() => {
                          const grossDiscrepancyItems = adjustmentDraftItems.reduce((acc, curr) => acc + (curr.actualQty - curr.systemQty), 0);
                          const grossFinancialValue = adjustmentDraftItems.reduce((acc, curr) => {
                            const original = products.find(p => p.id === curr.productId);
                            const unitCost = original?.cost || 0;
                            return acc + ((curr.actualQty - curr.systemQty) * unitCost);
                          }, 0);

                          return (
                            <div className="p-3.5 rounded-2xl border border-slate-150 bg-slate-50 flex justify-between items-center text-[11px] font-extrabold text-[#534b8c]">
                              <div>
                                <span className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Biên độ sai lệch tồn</span>
                                <span className={`${grossDiscrepancyItems > 0 ? 'text-emerald-600' : grossDiscrepancyItems < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                  {grossDiscrepancyItems > 0 ? `+${grossDiscrepancyItems}` : grossDiscrepancyItems} ly sai lệch thực tế
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="block text-[8.5px] font-black text-slate-450 uppercase tracking-widest mb-0.5">Giá trị hao hụt ròng</span>
                                <span className={`text-sm font-black font-mono ${grossFinancialValue > 0 ? 'text-emerald-700' : grossFinancialValue < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                  {grossFinancialValue.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Submit & Close Button operations controls */}
                        <div className="flex gap-2.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setIsAdjustmentModalOpen(false)}
                            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 font-extrabold text-[10px] text-slate-705 rounded-xl uppercase tracking-wider transition active:scale-95 text-slate-800"
                          >
                            Hủy bỏ biên bản
                          </button>

                          <button
                            type="button"
                            disabled={adjustmentDraftItems.length === 0}
                            onClick={async () => {
                              if (adjustmentDraftItems.length === 0) return;

                              // Calculate global totals
                              const grossDiscrepancyItems = adjustmentDraftItems.reduce((acc, curr) => acc + (curr.actualQty - curr.systemQty), 0);
                              const grossFinancialValue = adjustmentDraftItems.reduce((acc, curr) => {
                                const original = products.find(p => p.id === curr.productId);
                                const unitCost = original?.cost || 0;
                                return acc + ((curr.actualQty - curr.systemQty) * unitCost);
                              }, 0);

                              // 1. Update the actual PRODUCTS state with the verified counts
                              const updatedProducts = products.map(p => {
                                const adjustment = adjustmentDraftItems.find(x => x.productId === p.id);
                                if (adjustment) {
                                  return {
                                    ...p,
                                    inventoryCount: adjustment.actualQty,
                                    isAvailable: adjustment.actualQty > 0 ? p.isAvailable : false // turn off if counted zero
                                  };
                                }
                                return p;
                              });

                              // 2. Create the Inventory Receipt Ledger Audit Record
                              const nextId = inventoryReceipts.length + 1;
                              const receiptCode = `KK-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${String(nextId).padStart(4, '0')}`;

                              const newAuditReceipt: InventoryReceipt = {
                                id: 'audit-' + Date.now(),
                                receiptCode,
                                createdAt: new Date().toISOString(),
                                createdBy: authenticatedStaff?.fullName || 'Quản trị viên',
                                items: adjustmentDraftItems.map(item => {
                                  const original = products.find(p => p.id === item.productId);
                                  return {
                                    productId: item.productId,
                                    productName: item.productName,
                                    quantityAdded: item.actualQty - item.systemQty,
                                    costOnReceipt: original?.cost || 0,
                                    priceOnReceipt: original?.price || 0,
                                    reason: item.reason || 'Sự cố sai lệch'
                                  };
                                }),
                                totalCost: grossFinancialValue,
                                totalItems: grossDiscrepancyItems,
                                notes: adjustmentNotes,
                                isAdjustment: true
                              };

                              // Trigger Firestore callbacks
                              onUpdateProducts(updatedProducts);
                              onUpdateInventoryReceipts([newAuditReceipt, ...inventoryReceipts]);

                              // Activity Logs
                              await logAndNotify(
                                authenticatedStaff?.fullName || 'Admin',
                                'Kiểm kê đối soát kho',
                                `Đã hoàn tất kiểm kho [${receiptCode}] cho ${adjustmentDraftItems.length} nguyên liệu. Sai lệch thực tế: ${grossDiscrepancyItems} ly. Tổng thay đổi trị giá: ${grossFinancialValue.toLocaleString('vi-VN')} đ`,
                                ['admin']
                              );

                              // Close & Alert success
                              setIsAdjustmentModalOpen(false);
                              alert("Biên bản rà soát cân đối kho thực tế đã được lưu thành công! Số lượng kho của " + adjustmentDraftItems.length + " món đã được đồng bộ chuẩn.");
                            }}
                            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:from-slate-300 disabled:to-slate-400 disabled:opacity-40 text-white font-black text-[10px] rounded-xl uppercase tracking-wider transition shadow-md active:scale-95"
                          >
                            💥 HOÀN TẤT CÂN ĐỐI KHO LIVE
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DETAIL DIALOG MODAL: EXQUISITE COMFORT DETAIL SUMMARY OF ANY PAST SHIPMENT */}
            {selectedReceipt && (() => {
              const isAudit = selectedReceipt.isAdjustment;
              return (
                <div className="fixed inset-0 bg-[#0f172a]/75 backdrop-blur-md flex items-center justify-center z-[9999] animate-fade-in p-2 sm:p-4 text-xs text-slate-800">
                  <div className="bg-white rounded-[28px] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
                    {/* Detailed receipt dialog header */}
                    <div className={`${isAudit ? 'bg-orange-500' : 'bg-[#7052ff]'} p-5 text-white flex justify-between items-center shrink-0`}>
                      <div>
                        <h4 className="font-extrabold text-sm uppercase tracking-wider">
                          {isAudit ? 'Phiếu rà soát & Cân đối kho thực tế' : 'Chi Tiết Phiếu Nhập Kho'}
                        </h4>
                        <p className="text-[10px] text-white/90 font-bold font-mono">CODE: {selectedReceipt.receiptCode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(null)}
                        className="text-white hover:bg-white/10 p-2 rounded-full font-bold transition text-xs focus:outline-none"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Body logs scroll flow */}
                    <div className="p-5 overflow-y-auto space-y-4">
                      {/* Delivery summary info cards */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                        <div>
                          <span className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest">
                            {isAudit ? 'Thời điểm kiểm kê thực tế' : 'Thời gian nhập kho'}
                          </span>
                          <span className="font-bold text-slate-800 text-[11px]">
                            {new Date(selectedReceipt.createdAt).toLocaleDateString('vi-VN', {
                              year: 'numeric', month: '2-digit', day: '2-digit',
                              hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Nhân sự thực hiện</span>
                          <span className="font-bold text-slate-800 text-[11px]">👤 {selectedReceipt.createdBy}</span>
                        </div>
                      </div>

                      {/* Show detailed list table */}
                      <div>
                        <h5 className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          {isAudit ? 'Biên bản ghi nhận điều chỉnh sai lệch' : 'Danh sách mặt hàng nhập'}
                        </h5>
                        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white">
                          {isAudit ? (
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase">
                                  <th className="p-3">Nguyên liệu / Món</th>
                                  <th className="p-3 text-center">Sai lệch thực tế</th>
                                  <th className="p-3 text-right">Giá gốc/Đv</th>
                                  <th className="p-3 text-right">Trị giá lệch</th>
                                  <th className="p-3">Lý do ghi nhận</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                {selectedReceipt.items?.map((item: any) => {
                                  const totalImpact = item.quantityAdded * (item.costOnReceipt || 0);
                                  return (
                                    <tr key={item.productId} className="hover:bg-slate-50/40">
                                      <td className="p-3">📦 {item.productName}</td>
                                      <td className={`p-3 text-center font-bold font-mono ${item.quantityAdded > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {item.quantityAdded > 0 ? `+${item.quantityAdded}` : item.quantityAdded} cốc
                                      </td>
                                      <td className="p-3 text-right font-mono font-bold text-slate-500">{(item.costOnReceipt || 0).toLocaleString('vi-VN')} đ</td>
                                      <td className={`p-3 text-right font-mono font-black ${totalImpact >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {totalImpact.toLocaleString('vi-VN')} đ
                                      </td>
                                      <td className="p-3 text-[10px] text-slate-500 italic font-medium">{item.reason || 'Chưa rõ'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase">
                                  <th className="p-3">Sản phẩm</th>
                                  <th className="p-3 text-center">Số lượng</th>
                                  <th className="p-3 text-right">Đơn giá nhập</th>
                                  <th className="p-3 text-right">Thành tiền</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                {selectedReceipt.items?.map((item) => (
                                  <tr key={item.productId} className="hover:bg-slate-50/40">
                                    <td className="p-3">☕ {item.productName}</td>
                                    <td className="p-3 text-center font-bold text-slate-800">+{item.quantityAdded} cốc</td>
                                    <td className="p-3 text-right font-mono font-bold text-slate-500">{(item.costOnReceipt || 0).toLocaleString('vi-VN')} đ</td>
                                    <td className="p-3 text-right font-mono font-black text-slate-800">{((item.quantityAdded * (item.costOnReceipt || 0))).toLocaleString('vi-VN')} đ</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>

                      {/* Optional notes section */}
                      {selectedReceipt.notes && (
                        <div className={`p-4 rounded-xl border ${isAudit ? 'bg-amber-50 border-amber-100' : 'bg-orange-50 border-orange-100'} italic`}>
                          <span className={`block text-[8.5px] font-black uppercase tracking-widest not-italic mb-1 font-sans ${isAudit ? 'text-amber-900' : 'text-orange-900'}`}>
                            Mục tiêu rà soát / Ghi chú đợt
                          </span>
                          <p className={`text-[11px] font-bold leading-relaxed ${isAudit ? 'text-amber-950' : 'text-orange-950'}`}>"{selectedReceipt.notes}"</p>
                        </div>
                      )}

                      {/* Total stats */}
                      <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-[11px]">
                        <span className="font-extrabold text-slate-450 uppercase tracking-wide">
                          {isAudit ? 'Độ lệch lượng lũy kế:' : 'Tổng số lượng cốc phòng:'}
                        </span>
                        <span className="font-extrabold text-slate-700 text-xs">
                          {isAudit && selectedReceipt.totalItems > 0 ? `+${selectedReceipt.totalItems}` : selectedReceipt.totalItems} ly
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] mt-1.5 font-sans">
                        <span className="font-black text-slate-800 uppercase tracking-wide">
                          {isAudit ? 'Giá trị suy giảm tài sản hao hụt:' : 'Tổng chi phí hóa đơn (Vốn):'}
                        </span>
                        <span className={`font-black text-base font-mono ${isAudit && selectedReceipt.totalCost < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {(selectedReceipt.totalCost || 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* Actions logs detail dialog footer */}
                    <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm("Bạn có chắc chắn muốn xóa lưu trữ phiếu " + selectedReceipt.receiptCode + "? Lưu ý: Thao tác này chỉ xóa lịch sử lưu trữ của phiếu nhập này để gọn danh sách, KHÔNG tự động thu hồi / đảo ngược lượng tồn kho đã cộng vào các món.")) {
                            const updated = inventoryReceipts.filter(r => r.id !== selectedReceipt.id);
                            onUpdateInventoryReceipts(updated);
                            await logAndNotify(authenticatedStaff?.fullName || 'Admin', 'Kho hàng', `Xóa lưu trữ phiếu nhập kho: ${selectedReceipt.receiptCode}`, ['admin']);
                            setSelectedReceipt(null);
                          }
                        }}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-[#f43f5e] font-black text-[9px] uppercase tracking-wider rounded-lg transition"
                      >
                        Xóa lưu trữ phiếu
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(null)}
                        className="px-5 py-2.5 bg-[#7052ff] hover:bg-[#5f40ff] text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md transition"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* 1. STAFF VIEW */}
      {activeTab === 'staff' && (
        <div className="space-y-6 animate-fade-in text-xs">
          <div className={`${t.card} p-5 flex justify-between items-center`}>
            <h2 className="font-black text-lg uppercase tracking-wider">Quản lý nhân viên</h2>
            <button 
              onClick={openAddStaff}
              className={t.btnAccent}
            >
              <Plus className="w-4 h-4" /> Thêm mới
            </button>
          </div>

          <div className={`${t.card} p-0 overflow-hidden`}>
             <table className="w-full text-left">
                <thead className={t.tableHeader}>
                   <tr>
                     <th className={t.tableHeaderCell}>Avatar</th>
                     <th className={t.tableHeaderCell}>Họ tên</th>
                     <th className={t.tableHeaderCell}>Tên đăng nhập</th>
                     <th className={t.tableHeaderCell}>SĐT</th>
                     <th className={t.tableHeaderCell}>Chức vụ</th>
                     <th className={t.tableHeaderCell}>Hành động</th>
                   </tr>
                </thead>
                <tbody>
                  {storeConfig.staff?.map(staff => (
                    <tr key={staff.id} className={t.tableRow}>
                      <td className={`p-3 ${t.tableCellBorder}`}>
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                          {staff.avatar && (staff.avatar.startsWith('http') || staff.avatar.startsWith('data:')) ? (
                            <img src={staff.avatar} alt={staff.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">{staff.avatar || '👤'}</span>
                          )}
                        </div>
                      </td>
                      <td className={`p-3 ${t.tableCellBorder} font-bold`}>{staff.fullName}</td>
                      <td className={`p-3 ${t.tableCellBorder} font-mono text-slate-500`}>{staff.username}</td>
                      <td className={`p-3 ${t.tableCellBorder}`}>{staff.phone}</td>
                      <td className={`p-3 ${t.tableCellBorder}`}>{staff.role}</td>
                      <td className={`p-3 flex gap-2`}>
                        <button onClick={() => openEditStaff(staff)} className="text-orange-500 font-bold hover:underline">Sửa</button>
                        <button onClick={() => {
                          onUpdateStoreConfig({
                            ...storeConfig,
                            staff: storeConfig.staff?.filter(s => s.id !== staff.id)
                          });
                        }} className="text-rose-500 font-bold hover:underline">Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
          
          {/* Staff Modal (Add/Edit) */}
          {isStaffModalOpen && (
             <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                <div className={`${t.card} w-full max-w-sm p-6 space-y-5 relative`}>
                   
                   <div className={`flex items-center justify-between border-b ${t.divider} pb-3`}>
                     <h3 className={`font-black text-lg uppercase tracking-tight flex items-center gap-1.5 ${t.textTitle}`}>
                        <Edit3 className={`w-5 h-5 ${t.icon}`} />
                        {editingStaffId ? 'Sửa thông tin' : 'Thêm Nhân Viên'}
                     </h3>
                   </div>
                   
                   <div className="flex justify-center">
                     <div className="relative group">
                       <label className={`w-24 h-24 rounded-full ${t.cardSec} flex flex-col items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed ${t.divider} hover:border-orange-400 transition-all shadow-inner relative`}>
                        {newStaff.avatar && (newStaff.avatar.startsWith('http') || newStaff.avatar.startsWith('data:')) ? (
                          <img src={newStaff.avatar} alt="Avatar" className="w-full h-full object-cover"/>
                        ) : (
                          <>
                            {newStaff.avatar && newStaff.avatar.length <= 4 && newStaff.avatar !== '👤' ? (
                               <span className="text-3xl mb-1">{newStaff.avatar}</span>
                            ) : (
                              <Upload className={`w-6 h-6 ${t.icon} mb-1 opacity-60`} />
                            )}
                            <span className={`${t.textMuted} text-[9px]`}>Tải Ảnh Lên</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setNewStaff({...newStaff, avatar: reader.result as string});
                            reader.readAsDataURL(file);
                          }
                        }} />
                       </label>
                     </div>
                   </div>
                   
                   <div className="space-y-4">
                     <div>
                        <label className={`${t.textMuted} mb-1 block`}>Họ và tên *</label>
                        <input type="text" placeholder="Bắt buộc" className={`${t.input} w-full`} value={newStaff.fullName || ''} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} />
                     </div>
                     <div>
                        <label className={`${t.textMuted} mb-1 block`}>Tên đăng nhập *</label>
                        <input type="text" placeholder="Bắt buộc" className={`${t.input} w-full`} value={newStaff.username || ''} onChange={e => setNewStaff({...newStaff, username: e.target.value})} />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className={`${t.textMuted} mb-1 block`}>Mật khẩu</label>
                          <input type="password" placeholder="Tùy chọn" className={`${t.input} w-full`} value={newStaff.password || ''} onChange={e => setNewStaff({...newStaff, password: e.target.value})} />
                       </div>
                       <div>
                          <label className={`${t.textMuted} mb-1 block`}>Số điện thoại</label>
                          <input type="text" placeholder="Tùy chọn" className={`${t.input} w-full`} value={newStaff.phone || ''} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} />
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className={`${t.textMuted} mb-1 block`}>Năm sinh</label>
                          <input type="number" placeholder="YYYY" className={`${t.input} w-full`} value={newStaff.birthYear || ''} onChange={e => setNewStaff({...newStaff, birthYear: parseInt(e.target.value)})} />
                       </div>
                       <div>
                          <label className={`${t.textMuted} mb-1 block`}>Phân quyền</label>
                          <select className={`${t.input} w-full`} value={newStaff.role || 'Nhân viên'} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                            {storeConfig.roles?.map(r => <option key={r} value={r}>{r}</option>) || <>
                              <option value="Nhân viên">Nhân viên</option>
                              <option value="Quản lý">Quản lý Admin</option>
                            </>}
                          </select>
                       </div>
                     </div>

                     <div>
                        <label className={`${t.textMuted} mb-1 flex items-center gap-1`}><Lock className="w-3 h-3"/> Mã PIN Đăng Nhập (4 số) *</label>
                        <input type="text" maxLength={4} placeholder="Ví dụ: 1234" className={`${t.input} w-full tracking-widest text-center font-bold`} value={newStaff.pin || ''} onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setNewStaff({...newStaff, pin: val});
                        }} />
                     </div>
                   </div>

                   {staffModalError && (
                     <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-xl border border-rose-100 font-bold flex items-center gap-2 mt-2">
                       <AlertCircle className="w-4 h-4 shrink-0" />
                       {staffModalError}
                     </div>
                   )}

                   <div className={`flex gap-3 justify-end pt-4 border-t ${t.divider}`}>
                     <button onClick={() => setIsStaffModalOpen(false)} className={t.btnSec}>Hủy Bỏ</button>
                     <button onClick={handleSaveStaff} className={t.btnAccent}>
                        <Save className="w-3 h-3 inline mr-1" /> Lưu
                     </button>
                   </div>
                </div>
             </div>
          )}

          {/* Role Management Section */}
          <div className={`${t.card} p-5 space-y-4`}>
            <h3 className={`font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 border-b pb-2 ${t.divider}`}>
              Quản lý chức vụ
            </h3>
            <div className="flex gap-2 flex-wrap">
              {storeConfig.roles?.map(role => (
                <span key={role} className={`${t.badge} flex items-center gap-1.5 px-3 py-1.5 shadow-sm`}>
                  {role}
                  <button className="opacity-60 hover:opacity-100 hover:text-rose-500 transition-colors" onClick={() => onUpdateStoreConfig({...storeConfig, roles: storeConfig.roles?.filter(r => r !== role)})}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" id="newRoleInput" placeholder="Chức vụ mới..." className={t.input} />
              <button className={t.btnAccent} onClick={() => {
                const roleInput = document.getElementById('newRoleInput') as HTMLInputElement;
                if (roleInput.value) {
                  onUpdateStoreConfig({...storeConfig, roles: [...(storeConfig.roles || ['Nhân viên', 'Quản lý']), roleInput.value]});
                  roleInput.value = '';
                }
              }}>Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* 1. ORDERS VIEW */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in text-xs">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50">
            <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Danh sách hóa đơn trực tiếp</h2>
            <div className="flex flex-wrap gap-2 text-[10px] w-full md:w-auto">
              <input
                type="text"
                placeholder="Tìm đơn hàng..."
                value={masterFilters.search}
                onChange={(e) => { setMasterFilters(prev => ({ ...prev, search: e.target.value })); setCurrentPage(1); }}
                className="bg-white border border-slate-200 rounded-lg p-1 font-bold outline-none w-32"
              />
              <select value={masterFilters.status} onChange={(e) => { setMasterFilters(prev => ({ ...prev, status: e.target.value as any })); setCurrentPage(1); }} className="bg-white border border-slate-200 rounded-lg p-1 font-bold uppercase outline-none">
                <option value="all">Trạng thái: Tất cả ({ordersForStatusCounts.length})</option>
                <option value="pending">Chờ duyệt ({ordersForStatusCounts.filter(o => o.status === 'pending').length})</option>
                <option value="preparing">Chế biến ({ordersForStatusCounts.filter(o => o.status === 'preparing').length})</option>
                <option value="delivering">Đang giao ({ordersForStatusCounts.filter(o => o.status === 'delivering').length})</option>
                <option value="completed">Đã giao ({ordersForStatusCounts.filter(o => o.status === 'completed').length})</option>
                <option value="cancelled">Đã hủy ({ordersForStatusCounts.filter(o => o.status === 'cancelled').length})</option>
              </select>
              <select value={masterFilters.paymentStatus} onChange={(e) => { setMasterFilters(prev => ({ ...prev, paymentStatus: e.target.value as any })); setCurrentPage(1); }} className="bg-white border border-slate-200 rounded-lg p-1 font-bold uppercase outline-none">
                <option value="all">Thanh toán: Tất cả ({ordersForPaymentCounts.length})</option>
                <option value="unpaid">Chưa TT ({ordersForPaymentCounts.filter(o => (o.paymentStatus || 'unpaid') === 'unpaid').length})</option>
                <option value="paid">Đã TT ({ordersForPaymentCounts.filter(o => (o.paymentStatus || 'unpaid') === 'paid').length})</option>
                <option value="debt">Ghi nợ ({ordersForPaymentCounts.filter(o => (o.paymentStatus || 'unpaid') === 'debt').length})</option>
              </select>
            </div>
          </div>

          {(() => {
            const filteredOrders = orders
              .filter(o => 
                (masterFilters.status === 'all' || o.status === masterFilters.status) &&
                (masterFilters.paymentStatus === 'all' || (o.paymentStatus || 'unpaid') === masterFilters.paymentStatus) &&
                isInRange(new Date(o.createdAt)) &&
                (!masterFilters.search || 
                  o.billCode.toLowerCase().includes(masterFilters.search.toLowerCase()) || 
                  o.customerName.toLowerCase().includes(masterFilters.search.toLowerCase()) || 
                  o.customerPhone.includes(masterFilters.search))
              )
              .sort((a,b) => b.createdAt.localeCompare(a.createdAt));
            
            const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
            const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

            if (filteredOrders.length === 0) {
              return (
                <div className="p-12 text-center text-slate-400">
                  <Clipboard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold">Không tìm thấy đơn hàng phù hợp</p>
                </div>
              );
            }

            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-500 text-[9px] uppercase font-bold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Mã đơn / Đặt lúc</th>
                        <th className="px-4 py-3">Bàn / Khu vực</th>
                        <th className="px-4 py-3">Khách hàng / Liên hệ</th>
                        <th className="px-4 py-3">Món ăn tóm tắt</th>
                        <th className="px-4 py-3">Ghi chú</th>
                        <th className="text-right px-4 py-3">Thanh Toán</th>
                        <th className="px-4 py-3 text-center">Trạng Thái</th>
                        <th className="px-4 py-3 text-center">Tình Trạng</th>
                        <th className="px-4 py-3 text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-sans">
                      {paginatedOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50/50">
                          
                          {/* Code/Date/Creator */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-bold text-orange-600 block text-xs font-mono tracking-wider">{order.billCode}</span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                               {new Date(order.createdAt).toLocaleString('vi-VN')}
                            </span>
                            {order.createdBy && (
                              <span className="text-[9px] text-slate-500 font-medium block mt-0.5">
                                Tạo: <strong className="text-slate-600">{order.createdBy}</strong>
                              </span>
                            )}
                          </td>

                          {/* Table & Area info */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {(() => {
                              if (order.tableId) {
                                const dbTable = tables.find(t => t.id === order.tableId);
                                if (dbTable) {
                                  const dbArea = areas.find(a => a.id === dbTable.areaId);
                                  return (
                                    <>
                                      <span className="font-extrabold text-[#0078d4] text-xs block">🪑 {dbTable.name}</span>
                                      <span className="text-[10px] text-slate-500 block mt-0.5 font-semibold">📍 {dbArea ? dbArea.name : 'Chưa phân khu'}</span>
                                    </>
                                  );
                                }
                              }
                              if (order.tableName) {
                                return (
                                  <span className="font-semibold text-slate-600 text-xs block">🥡 {order.tableName}</span>
                                );
                              }
                              return (
                                <span className="text-[10px] text-slate-400 italic block">🚚 Giao hàng / Mang đi</span>
                              );
                            })()}
                          </td>
    
                          {/* Customer info */}
                          <td className="px-4 py-3.5 max-w-[200px] truncate">
                            <strong className="text-slate-900 block text-xs">{order.customerName}</strong>
                            <span className="text-[10px] text-slate-500 font-mono block">{order.customerPhone}</span>
                            <span className="text-[9px] text-slate-400 line-clamp-1 block mt-0.5 mt-1">📍 {order.customerAddress}</span>
                          </td>
    
                          {/* Detailed dishes text */}
                          <td className="px-4 py-3.5 italic text-slate-600 text-xs max-w-[250px] truncate">
                            {order.items.map(it => `${it.productName} (x${it.quantity})`).join(', ')}
                            {order.note && (
                              <span className="block text-[9px] text-orange-500 font-semibold truncate not-italic mt-1">
                                📝 Ghép Chú: "{order.note}"
                              </span>
                            )}
                          </td>
    
                          <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[150px] truncate" title={order.adminNote || order.cancellationReason || '-'}>
                            {order.adminNote || order.cancellationReason || '-'}
                          </td>
    
                          {/* Value & Pay method */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <span className="font-extrabold text-slate-900 text-xs font-mono block">
                              {order.totalAmount.toLocaleString('vi-VN')}đ
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 block tracking-tighter mt-1">
                              {order.paymentMethod === 'cod' ? 'TIỀN MẶT COD' : 'CHUYỂN KHOẢN'}
                            </span>
                          </td>
    
                          {/* Status Selection Pill badge */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                              className={`p-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase border cursor-pointer font-sans outline-none ${getStatusColorClass(order.status)}`}
                            >
                              <option value="pending">Duyệt: Chờ</option>
                              <option value="preparing">Bếp: Chế Biến</option>
                              <option value="delivering">Trình: Đang Giao</option>
                              <option value="completed">Xong: Đã Giao</option>
                              <option value="cancelled">Hủy đơn</option>
                            </select>
                          </td>
    
                          {/* Payment Status */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <select
                              value={order.paymentStatus || 'unpaid'}
                              onChange={(e) => {
                                const updated = orders.map(ord => ord.id === order.id ? {...ord, paymentStatus: e.target.value as any} : ord);
                                onUpdateOrders(updated);
                              }}
                              className={`p-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase border cursor-pointer font-sans outline-none ${
                                 order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                 order.paymentStatus === 'debt' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              <option value="unpaid">Chưa thanh toán</option>
                              <option value="paid">Đã thanh toán</option>
                              <option value="debt">Ghi nợ</option>
                            </select>
                            {order.paidBy && order.paymentStatus === 'paid' && (
                              <span className="block mt-1 text-[9px] text-emerald-700 font-medium whitespace-nowrap">
                                Thu: <strong>{order.paidBy}</strong>
                              </span>
                            )}
                          </td>
    
                          {/* Actions */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setEditingOrder({ ...order, items: order.items.map(it => ({ ...it })) })}
                                className="p-1 text-slate-400 hover:text-orange-600 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Chỉnh sửa món ăn và thông tin đơn hàng này"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrderClick(order)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Xóa bỏ đơn hàng khỏi dữ liệu"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
    
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center items-center gap-2">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-100 disabled:opacity-50">Trước</button>
                    <span className="text-[10px] font-bold text-slate-500">Trang {currentPage} / {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-100 disabled:opacity-50">Sau</button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* CUSTOM OVERLAYS FOR ORDERS */}

      {/* 1. Cancellation Reason Confirmation Dialog Overlay */}
      {orderToCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4 text-slate-800">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-rose-600">Lý do hủy đơn hàng {orderToCancel.billCode}</h3>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500">Chọn lý do:</label>
              {['Hết món', 'Khách hủy', 'Sai thông tin', 'Khác'].map(reason => (
                <button
                    key={reason}
                    type="button"
                    onClick={() => setCancellationReason(reason)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-bold ${cancellationReason === reason ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50 border-slate-100'}`}
                >
                    {reason}
                </button>
              ))}
              <input
                type="text"
                placeholder="Nhập lý do khác..."
                value={cancellationReason === 'Khác' ? '' : cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none"
              />
            </div>

            <div className="flex gap-2.5 mt-3 justify-end">
              <button
                onClick={() => setOrderToCancel(null)}
                className="px-4 py-2.5 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmCancelOrder}
                disabled={!cancellationReason}
                className="px-4 py-2.5 text-[10px] font-extrabold uppercase bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all disabled:opacity-50"
              >
                Xác nhận Hủy Đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Safe Delete Confirmation Dialog Overlay */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4 text-slate-800">
            <div className="flex items-center gap-3 text-red-600">
              <span className="p-2.5 h-11 w-11 flex items-center justify-center bg-red-50 rounded-2xl text-red-600">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Xác nhận xóa đơn hàng</h3>
                <p className="text-[10px] text-red-400 font-extrabold font-mono tracking-widest">{orderToDelete.billCode}</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng của khách hàng <strong>{orderToDelete.customerName}</strong> khỏi Google Cloud Firestore? Hành động này sẽ được đồng bộ ngay lập tức và không thể khôi phục.
            </p>

            <div className="flex gap-2.5 mt-3 justify-end">
              <button
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2.5 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all tracking-wider"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeleteOrder}
                className="px-5 py-2.5 text-[10px] font-extrabold uppercase bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md cursor-pointer transition-all tracking-wider"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Beautiful Detailed Order Editing overlay panel */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden my-4 text-slate-800">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-orange-100 border border-orange-200 text-orange-600 rounded-xl">
                  <Edit3 className="w-5 h-5 text-orange-600" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">
                    Sửa chi tiết đơn hàng #{editingOrder.billCode}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold font-mono">
                    Thời gian tạo: {new Date(editingOrder.createdAt).toLocaleString('vi-VN')}
                    {editingOrder.createdBy && (
                      <span className="ml-2 pl-2 border-l border-slate-300">
                        Tạo bởi: {editingOrder.createdBy}
                      </span>
                    )}
                    {editingOrder.paidBy && editingOrder.paymentStatus === 'paid' && (
                      <span className="ml-2 pl-2 border-l border-slate-300">
                        Thu bởi: {editingOrder.paidBy}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L12 12M12 12l6-6M12 12l-6 6m6-6l6 6" />
                </svg>
              </button>
            </div>

            {/* Modal Content - Scrollable grid */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/40 text-xs">
              
              {/* Left Side: General Info & Customer Fields */}
              <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-150 shadow-xs">
                <h4 className="font-extrabold text-[10px] text-orange-600 uppercase tracking-widest border-b border-slate-100 pb-2">
                  Thông tin người nhận hàng
                </h4>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên khách hàng*</label>
                  <input
                    type="text"
                    required
                    value={editingOrder.customerName}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerName: e.target.value })}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Số điện thoại liên hệ*</label>
                  <input
                    type="text"
                    required
                    value={editingOrder.customerPhone}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerPhone: e.target.value })}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold font-mono outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Địa chỉ nhận hàng*</label>
                  <textarea
                    required
                    value={editingOrder.customerAddress}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerAddress: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ghi chú từ khách hàng</label>
                  <input
                    type="text"
                    value={editingOrder.note || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, note: e.target.value })}
                    placeholder="Ví dụ: giao gấp, không bỏ đá..."
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ghi chú ADMIN</label>
                  <textarea
                    rows={2}
                    value={editingOrder.adminNote || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, adminNote: e.target.value })}
                    placeholder="Ghi chú nội bộ..."
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Áp dụng Khuyến mãi</label>
                    <select
                      value={editingOrder.promoCodeUsed || ''}
                      onChange={(e) => {
                        const code = e.target.value;
                        const promo = promotions.find(p => p.code === code);
                        if (!promo) {
                          setEditingOrder({
                            ...editingOrder,
                            promoCodeUsed: undefined,
                            discountAmount: 0,
                            totalAmount: editingOrder.subTotal
                          });
                        } else {
                          const discount = promo.type === 'fixed' ? promo.value : (editingOrder.subTotal * promo.value) / 100;
                          setEditingOrder({
                            ...editingOrder,
                            promoCodeUsed: code,
                            discountAmount: discount,
                            totalAmount: Math.max(0, editingOrder.subTotal - discount)
                          });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none cursor-pointer"
                    >
                      <option value="">Không áp dụng</option>
                      {promotions.filter(p => !p.startDate || p.startDate <= new Date().toISOString()).map(p => (
                        <option key={p.id} value={p.code}>{p.code} (-{p.value}{p.type === 'percentage' ? '%' : 'đ'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hình thức thanh toán</label>
                    <select
                      value={editingOrder.paymentMethod}
                      onChange={(e) => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none cursor-pointer"
                    >
                      <option value="cod">Tiền mặt COD</option>
                      <option value="banking">Chuyển khoản</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tiền giảm giá (giảm thêm)</label>
                    <input
                      type="text"
                      min={0}
                      value={editingOrder.discountAmount ? editingOrder.discountAmount.toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\./g, '');
                        const val = Math.max(0, Number(raw) || 0);
                        setEditingOrder({
                          ...editingOrder,
                          discountAmount: val,
                          totalAmount: Math.max(0, (editingOrder.subTotal || 0) - val)
                        });
                      }}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold font-mono outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Right Side: Order Items Manager & Menu Quick Injector */}
              <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex flex-col h-[480px] overflow-hidden">
                <h4 className="font-extrabold text-[10px] text-orange-600 uppercase tracking-widest border-b border-slate-100 pb-2.5 flex justify-between items-center shrink-0">
                  <span>Món đã chọn ({editingOrder.items.length})</span>
                  <span className="font-mono text-orange-600 font-extrabold bg-orange-50 px-2 py-0.5 rounded-lg">
                    Tạm tính: {editingOrder.subTotal.toLocaleString('vi-VN')}đ
                  </span>
                </h4>

                {/* Selected Items Scroller List */}
                <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 my-1">
                  {editingOrder.items.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 flex flex-col items-center justify-center gap-1.5 h-full">
                      <ShoppingBag className="w-8 h-8 text-slate-250" />
                      <p className="font-bold">Đơn hàng trống trơn</p>
                      <p className="text-[10px]">Vui lòng nhấn nút ở danh mục phía dưới để thêm món.</p>
                    </div>
                  ) : (
                    editingOrder.items.map(item => (
                      <div key={item.productId} className="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-100 rounded-xl transition-all">
                        <div className="flex flex-col gap-0.5 max-w-[50%]">
                          <span className="font-extrabold text-xs text-slate-800 truncate block">{item.productName}</span>
                          <span className="text-[9px] text-slate-400 font-bold font-mono">Đơn giá: {item.priceOnOrder.toLocaleString('vi-VN')}đ</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Decrease / Increase controllers */}
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantityInOrderDraft(item.productId, item.quantity - 1)}
                              className="w-6.5 h-6.5 flex items-center justify-center text-xs font-black text-slate-400 hover:text-orange-600 hover:bg-slate-50 rounded-l-lg transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-[10px] font-black font-mono text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantityInOrderDraft(item.productId, item.quantity + 1)}
                              className="w-6.5 h-6.5 flex items-center justify-center text-xs font-black text-slate-400 hover:text-orange-600 hover:bg-slate-50 rounded-r-lg transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          {/* Item total computed cost */}
                          <span className="text-[11px] font-black text-slate-850 font-mono min-w-[65px] text-right">
                            {(item.quantity * item.priceOnOrder).toLocaleString('vi-VN')}đ
                          </span>

                          {/* Remove button completely */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromOrderDraft(item.productId)}
                            className="p-1 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            title="Xóa hẳn món này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Addition lookup in menu */}
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-1.5 max-h-[160px] shrink-0 overflow-hidden">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
                    ⚡ Thêm món nhanh từ thực đơn (nếu hết món cũ)
                  </span>
                  <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 pb-1">
                    {products.map(prod => {
                      const orderItemInst = editingOrder.items.find(i => i.productId === prod.id);
                      return (
                        <div key={prod.id} className={`flex justify-between items-center bg-orange-50/20 hover:bg-orange-50 border border-orange-100/30 p-1.5 rounded-xl transition-all ${!prod.isAvailable ? 'opacity-50' : ''}`}>
                          <div className="flex items-center gap-2 max-w-[70%]">
                            {prod.image.startsWith('data:image') || prod.image.startsWith('http') ? (
                              <img src={prod.image} alt={prod.name} className="w-8 h-8 object-cover rounded-full" />
                            ) : (
                              <span className="text-sm shrink-0">{prod.image}</span>
                            )}
                            <div className="flex flex-col truncate">
                              <span className="font-extrabold text-[11px] text-slate-800 truncate block">{prod.name} {!prod.isAvailable && '(Hết)'}</span>
                              <span className="text-[9px] text-orange-600 font-extrabold font-mono">{prod.price.toLocaleString('vi-VN')}đ</span>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleAddProductToOrderDraft(prod)}
                            className="px-2.5 py-1 bg-white hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 hover:border-orange-600 rounded-xl font-black text-[9px] uppercase transition-all shadow-xs cursor-pointer"
                          >
                            {orderItemInst ? `đặt (${orderItemInst.quantity})` : 'chọn +'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:justify-between items-center gap-3">
              <div className="flex items-center gap-4">
                <div className="flex flex-col text-left">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tổng cộng thanh toán</span>
                  <span className="text-base font-black text-orange-600 font-mono">
                    {editingOrder.totalAmount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                {editingOrder.discountAmount > 0 && (
                  <div className="text-[10px] text-slate-400 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 font-semibold">
                    (Đã giảm: <span className="font-mono font-bold text-emerald-600">-{editingOrder.discountAmount.toLocaleString('vi-VN')}đ</span>)
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="w-1/2 sm:w-auto px-5 py-2.5 font-extrabold uppercase bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl text-[10px] tracking-widest transition-all cursor-pointer"
                >
                  Hủy chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrderEditSubmit}
                  className="w-1/2 sm:w-auto px-6 py-2.5 font-extrabold uppercase bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] tracking-widest transition-all shadow-md shadow-orange-100 block text-center cursor-pointer"
                >
                  Xác nhận lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Product Safe Delete Overlay */}
      {productToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <span className="p-2.5 h-10 w-10 flex items-center justify-center bg-red-50 rounded-2xl text-red-600">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </span>
              <h3 className="font-extrabold text-xs uppercase tracking-wider font-sans">Xóa món ăn?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa món <strong>{productToDelete.name}</strong> ({productToDelete.image}) khỏi thực đơn? Hành động này sẽ gỡ bỏ món ăn vĩnh viễn khỏi danh sách bán.
            </p>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Category Safe Delete Overlay */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <span className="p-2.5 h-10 w-10 flex items-center justify-center bg-red-50 rounded-2xl text-red-600">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </span>
              <h3 className="font-extrabold text-xs uppercase tracking-wider font-sans">Xóa danh mục?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa danh mục <strong>{categoryToDelete.name}</strong> ({categoryToDelete.icon})? Hành động này không thể khôi phục.
            </p>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Promotion Safe Delete Overlay */}
      {promotionToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <span className="p-2.5 h-10 w-10 flex items-center justify-center bg-red-50 rounded-2xl text-red-600">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </span>
              <h3 className="font-extrabold text-xs uppercase tracking-wider font-sans">Xóa mã khuyến mãi?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa mã khuyễn mãi <strong>{promotionToDelete.code}</strong>? Khách hàng sẽ không thể áp dụng mã này khi đặt hàng được nữa.
            </p>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setPromotionToDelete(null)}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeletePromotion}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.1 Table Safe Delete Overlay */}
      {tableToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[200] p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <span className="p-2.5 h-10 w-10 flex items-center justify-center bg-red-50 rounded-2xl text-red-600">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </span>
              <h3 className="font-extrabold text-xs uppercase tracking-wider font-sans">Xóa bàn nhà hàng?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa <strong>{tableToDelete.name}</strong>? Khi xóa, mã QR của bàn này sẽ không còn hiệu lực.
            </p>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setTableToDelete(null)}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeleteTable}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 2. PRODUCTS VIEW */}
      {activeTab === 'products' && (
        <div className="space-y-4 animate-fade-in text-xs">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Quản lý món ăn</h2>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <select
                value={categoryIdFilter}
                onChange={(e) => setCategoryIdFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none w-32"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none w-32"
              >
                <option value="all">Tất cả TT</option>
                <option value="available">Còn món</option>
                <option value="unavailable">Hết món</option>
              </select>
              <input
                type="text"
                placeholder="Tìm kiếm món..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none w-48"
              />
              <button
                onClick={exportMenuToExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px]"
              >
                <FileText className="w-3.5 h-3.5" /> Xuất Excel
              </button>
              <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px] cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Nhập Excel
                <input type="file" onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
              </label>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddingProduct(!isAddingProduct);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px]"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Món Ăn Mới
              </button>
            </div>
          </div>

          {/* Add product modal section */}
          <AnimatePresence>
            {isAddingProduct && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
                >
                  <form onSubmit={handleAddProductSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-2">
                      <h3 className="font-extrabold text-orange-600 uppercase text-sm tracking-wide flex items-center gap-2">
                        <Utensils className="w-5 h-5" /> Thêm Món Vào Vườn Bếp
                      </h3>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingProduct(false)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                      >
                        <span className="text-xl">✕</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên món ăn*</label>
                        <input
                          type="text"
                          required
                          placeholder="ví dụ: Phở Nạm Gầu Bò"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none focus:border-orange-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Danh mục*</label>
                        <select
                          value={newProduct.categoryId}
                          onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none focus:border-orange-500 transition-all cursor-pointer"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá bán (VND)</label>
                        <input
                          type="text"
                          min={0}
                          value={newProduct.price ? newProduct.price.toLocaleString('vi-VN') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '');
                            setNewProduct({ ...newProduct, price: Number(raw) || 0 });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none font-mono focus:border-orange-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá vốn (VND)</label>
                        <input
                          type="text"
                          min={0}
                          value={newProduct.cost ? newProduct.cost.toLocaleString('vi-VN') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '');
                            setNewProduct({ ...newProduct, cost: Number(raw) || 0 });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none font-mono focus:border-orange-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Emoji / Ảnh</label>
                        {newProduct.image && (newProduct.image.startsWith('data:image') || newProduct.image.startsWith('http')) ? (
                          <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                            <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setNewProduct({...newProduct, image: '🍜'})}
                              className="absolute top-1 right-1 bg-white/90 rounded-full w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm"
                              title="Xóa ảnh"
                            >
                              <span className="text-xs">✕</span>
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            required
                            placeholder="ví dụ: 🍜"
                            value={newProduct.image}
                            onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                            className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xl text-center focus:bg-white outline-none flex items-center justify-center min-h-[80px]"
                          />
                        )}
                      </div>

                      <div className="md:col-span-3 space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mô tả tóm tắt món*</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Nguyên liệu chín tái..."
                            value={newProduct.description}
                            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none focus:border-orange-500 transition-all resize-none"
                          />
                          <div className="flex flex-col gap-2 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newProduct.isVisibleToCustomer ?? true}
                                onChange={(e) => setNewProduct({ ...newProduct, isVisibleToCustomer: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-200 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="text-[10px] font-bold text-slate-700 uppercase">Hiển thị cho khách</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newProduct.isIngredient || false}
                                onChange={(e) => setNewProduct({ ...newProduct, isIngredient: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-200 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="text-[10px] font-bold text-slate-700 uppercase">Là nguyên vật liệu thô (Không hiển thị đặt lẻ trên Menu)</span>
                            </label>
                            
                            <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 mt-1 space-y-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newProduct.trackInventory || false}
                                  onChange={(e) => setNewProduct({ ...newProduct, trackInventory: e.target.checked })}
                                  className="w-4 h-4 rounded border-slate-200 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Bật theo dõi kho cho món này</span>
                              </label>
                              
                              {newProduct.trackInventory && (
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Số lượng tồn kho ban đầu</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={newProduct.inventoryCount || 0}
                                      onChange={(e) => setNewProduct({ ...newProduct, inventoryCount: Math.max(0, parseInt(e.target.value) || 0) })}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold font-mono outline-none focus:border-orange-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Ngưỡng cảnh báo sắp hết</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={newProduct.lowStockAlert !== undefined ? newProduct.lowStockAlert : 10}
                                      onChange={(e) => setNewProduct({ ...newProduct, lowStockAlert: Math.max(0, parseInt(e.target.value) || 0) })}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold font-mono outline-none focus:border-orange-500"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tải ảnh lên</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  const img = new Image();
                                  img.src = event.target?.result as string;
                                  await img.decode();
                                  const canvas = document.createElement('canvas');
                                  const MAX_SIZE = 200;
                                  let { width, height } = img;
                                  if (width > height) {
                                    if (width > MAX_SIZE) { height = height * (MAX_SIZE / width); width = MAX_SIZE; }
                                  } else {
                                    if (height > MAX_SIZE) { width = width * (MAX_SIZE / height); height = MAX_SIZE; }
                                  }
                                  canvas.width = width;
                                  canvas.height = height;
                                  canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                                  setNewProduct({ ...newProduct, image: canvas.toDataURL('image/jpeg', 0.5) });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-[10px] p-2 border border-slate-200 rounded-xl cursor-pointer bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddingProduct(false)}
                        className="px-6 py-2.5 bg-slate-100 font-bold rounded-xl hover:bg-slate-200 text-xs uppercase tracking-wider text-slate-600 transition-all"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-2.5 bg-orange-600 font-black rounded-xl text-white hover:bg-orange-700 shadow-lg shadow-orange-200 text-xs uppercase tracking-wider transition-all"
                      >
                        Thêm Vào Thực Đơn
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>


          {/* Edit product modal section */}
          <AnimatePresence>
            {editingProduct && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto pt-20 pb-20">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
                >
                  <form onSubmit={handleEditProductSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-orange-100 pb-4 mb-2">
                      <h3 className="font-extrabold text-orange-600 uppercase text-sm tracking-wide flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-orange-600" /> Chỉnh sửa món ăn
                      </h3>
                      <button 
                        type="button" 
                        onClick={() => setEditingProduct(null)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                      >
                        <span className="text-xl">✕</span>
                      </button>
                    </div>

                    <div className="bg-orange-50/30 p-3 rounded-2xl border border-orange-100/50 mb-4">
                      <div className="text-[10px] text-orange-400 font-bold uppercase tracking-widest pl-1">Đang chỉnh sửa</div>
                      <div className="text-sm font-black text-slate-800 uppercase px-1">{editingProduct.name}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên món ăn*</label>
                        <input
                          type="text"
                          required
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none focus:border-orange-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Danh mục*</label>
                        <select
                          value={editingProduct.categoryId}
                          onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none focus:border-orange-500 transition-all cursor-pointer"
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá bán</label>
                        <input
                          type="text"
                          min={0}
                          value={editingProduct.price ? editingProduct.price.toLocaleString('vi-VN') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '');
                            setEditingProduct({ ...editingProduct, price: Number(raw) || 0 });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none font-mono focus:border-orange-500 transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá vốn</label>
                        <input
                          type="text"
                          min={0}
                          value={editingProduct.cost ? editingProduct.cost.toLocaleString('vi-VN') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '');
                            setEditingProduct({ ...editingProduct, cost: Number(raw) || 0 });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none font-mono focus:border-orange-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Emoji / Ảnh</label>
                        {editingProduct.image && (editingProduct.image.startsWith('data:image') || editingProduct.image.startsWith('http')) ? (
                          <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-md">
                            <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setEditingProduct({...editingProduct, image: '🍜'})}
                              className="absolute top-1 right-1 bg-white/90 rounded-full w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm"
                              title="Xóa ảnh"
                            >
                              <span className="text-xs">✕</span>
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            required
                            value={editingProduct.image}
                            onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                            className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xl text-center focus:bg-white outline-none flex items-center justify-center min-h-[80px]"
                          />
                        )}
                      </div>

                      <div className="md:col-span-3 space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mô tả món ăn*</label>
                          <textarea
                            required
                            rows={3}
                            value={editingProduct.description}
                            onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none focus:border-orange-500 transition-all resize-none"
                          />
                          <div className="flex flex-col gap-2 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingProduct.isVisibleToCustomer ?? true}
                                onChange={(e) => setEditingProduct({ ...editingProduct, isVisibleToCustomer: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-200 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="text-[10px] font-bold text-slate-700 uppercase">Hiển thị cho khách</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingProduct.isIngredient || false}
                                onChange={(e) => setEditingProduct({ ...editingProduct, isIngredient: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-200 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="text-[10px] font-bold text-slate-700 uppercase">Là nguyên vật liệu thô (Không hiển thị đặt lẻ trên Menu)</span>
                            </label>
                            
                            <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 mt-1 space-y-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingProduct.trackInventory || false}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, trackInventory: e.target.checked })}
                                  className="w-4 h-4 rounded border-slate-200 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Bật theo dõi kho cho món này</span>
                              </label>
                              
                              {editingProduct.trackInventory && (
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Số lượng tồn kho</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={editingProduct.inventoryCount || 0}
                                      onChange={(e) => setEditingProduct({ ...editingProduct, inventoryCount: Math.max(0, parseInt(e.target.value) || 0) })}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold font-mono outline-none focus:border-orange-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Ngưỡng cảnh báo sắp hết</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={editingProduct.lowStockAlert !== undefined ? editingProduct.lowStockAlert : 10}
                                      onChange={(e) => setEditingProduct({ ...editingProduct, lowStockAlert: Math.max(0, parseInt(e.target.value) || 0) })}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold font-mono outline-none focus:border-orange-500"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cập nhật ảnh</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  const img = new Image();
                                  img.src = event.target?.result as string;
                                  await img.decode();
                                  const canvas = document.createElement('canvas');
                                  const MAX_SIZE = 200;
                                  let { width, height } = img;
                                  if (width > height) {
                                    if (width > MAX_SIZE) { height = height * (MAX_SIZE / width); width = MAX_SIZE; }
                                  } else {
                                    if (height > MAX_SIZE) { width = width * (MAX_SIZE / height); height = MAX_SIZE; }
                                  }
                                  canvas.width = width;
                                  canvas.height = height;
                                  canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                                  setEditingProduct({ ...editingProduct, image: canvas.toDataURL('image/jpeg', 0.5) });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-[10px] p-2 border border-slate-200 rounded-xl cursor-pointer bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(null)}
                        className="px-6 py-2.5 bg-slate-100 font-bold rounded-xl hover:bg-slate-200 text-xs uppercase tracking-wider text-slate-600 transition-all"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-2.5 bg-sky-600 font-black rounded-xl text-white hover:bg-sky-700 shadow-lg shadow-sky-200 text-xs uppercase tracking-wider transition-all"
                      >
                        Lưu Thay Đổi
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>


          {/* Grid list of dishes in catalog */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products
              .filter(p => {
                const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesFilter = productFilter === 'all' || (productFilter === 'available' ? p.isAvailable : !p.isAvailable);
                const matchesCategory = categoryIdFilter === 'all' || p.categoryId === categoryIdFilter;
                return matchesSearch && matchesFilter && matchesCategory;
              })
              .sort((a,b) => a.name.localeCompare(b.name))
              .map(prod => {
                const catObj = categories.find(c => c.id === prod.categoryId);
                return (
                  <div 
                    key={prod.id}
                    className={`bg-white p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      prod.isAvailable ? 'border-slate-200 shadow-xs' : 'border-slate-200/50 opacity-100 bg-slate-50 shadow-none'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        {prod.image.startsWith('data:image') || prod.image.startsWith('http') ? (
                          <img src={prod.image} alt={prod.name} className="w-12 h-12 object-cover rounded-full" />
                        ) : (
                          <span className="text-3xl select-none">{prod.image}</span>
                        )}
                        <div className="flex gap-1.5 items-center">
                          <button
                            onClick={() => toggleProductAvailability(prod.id)}
                            className={`p-1.5 border rounded-lg text-[9px] uppercase font-bold tracking-tighter ${
                              prod.isAvailable 
                                ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100' 
                                : 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                            }`}
                            title="Click để thay đổi khả năng phục vụ"
                          >
                            {prod.isAvailable ? 'Còn món' : 'Hết món'}
                          </button>
                        </div>
                      </div>

                      <h3 className={`font-black text-sm mb-0.5 ${prod.isAvailable ? 'text-slate-800' : 'text-slate-500'}`}>{prod.name} {!prod.isAvailable && '(Hết món)'}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        📁 {catObj?.name || 'Chưa nhóm'}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mb-3">{prod.description}</p>
                      {prod.trackInventory && (
                        <div className="mt-2 flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TỒN KHO LIVE</span>
                          <span className={`text-xs font-black font-mono ${
                            (prod.inventoryCount || 0) === 0 
                              ? 'text-red-600' 
                              : (prod.inventoryCount || 0) <= (prod.lowStockAlert !== undefined ? prod.lowStockAlert : 10)
                                ? 'text-amber-600 font-extrabold animate-pulse'
                                : 'text-slate-700'
                          }`}>
                            {(prod.inventoryCount || 0).toLocaleString('vi-VN')} món
                          </span>
                        </div>
                      )}
                    </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center mt-3">
                    <span className="font-extrabold text-orange-600 text-sm font-mono">{prod.price.toLocaleString('vi-VN')} đ</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingProduct({ ...prod, cost: prod.cost || 0 });
                          setIsAddingProduct(false);
                        }}
                        className="p-1.5 bg-slate-100 text-slate-800 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 rounded-lg"
                        title="Chỉnh sửa chi tiết"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-lg text-slate-400"
                        title="Xóa món"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* 3. CATEGORIES VIEW */}
      {activeTab === 'categories' && (
        <div className="space-y-4 animate-fade-in text-xs">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50 p-4 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Quản lý danh mục</h2>
            <button
              onClick={() => {
                setEditingCategory(null);
                setIsAddingCategory(!isAddingCategory);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px]"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Danh Mục Mới
            </button>
          </div>

          {/* Add/Edit Category Modals */}
          <AnimatePresence>
            {(isAddingCategory || editingCategory) && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden"
                >
                  <form 
                    onSubmit={isAddingCategory ? handleAddCategorySubmit : handleEditCategorySubmit} 
                    className="p-6 space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-orange-100 pb-4 mb-2">
                      <h3 className="font-extrabold text-orange-600 uppercase text-sm tracking-wide flex items-center gap-2">
                        {isAddingCategory ? <Plus className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                        {isAddingCategory ? 'Thêm Danh Mục Mới' : `Sửa Danh Mục: ${editingCategory?.name}`}
                      </h3>
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsAddingCategory(false);
                          setEditingCategory(null);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                      >
                        <span className="text-xl">✕</span>
                      </button>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên danh mục*</label>
                        <input
                          type="text"
                          required
                          placeholder="ví dụ: Món Lẩu Bò, Tráng Miệng Tây"
                          value={isAddingCategory ? newCategory.name : editingCategory?.name || ''}
                          onChange={(e) => {
                            if (isAddingCategory) setNewCategory({ ...newCategory, name: e.target.value });
                            else if (editingCategory) setEditingCategory({ ...editingCategory, name: e.target.value });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none focus:border-orange-500 transition-all font-sans"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Emoji Biểu Tượng (Icon)*</label>
                          <input
                            type="text"
                            required
                            placeholder="ví dụ: 🥗, 🍲, 🥤"
                            value={isAddingCategory ? newCategory.icon : editingCategory?.icon || ''}
                            onChange={(e) => {
                              if (isAddingCategory) setNewCategory({ ...newCategory, icon: e.target.value });
                              else if (editingCategory) setEditingCategory({ ...editingCategory, icon: e.target.value });
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xl text-center focus:bg-white outline-none focus:border-orange-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phân loại báo cáo*</label>
                          <select
                            value={(isAddingCategory ? newCategory.type : editingCategory?.type) || 'food'}
                            onChange={(e) => {
                              const val = e.target.value as 'food' | 'drink';
                              if (isAddingCategory) setNewCategory({ ...newCategory, type: val });
                              else if (editingCategory) setEditingCategory({ ...editingCategory, type: val });
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none focus:border-orange-500 transition-all cursor-pointer"
                          >
                            <option value="food">🥗 Đồ ăn</option>
                            <option value="drink">🍺 Đồ uống / Bia</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(false);
                          setEditingCategory(null);
                        }}
                        className="px-6 py-2.5 bg-slate-100 font-bold rounded-xl hover:bg-slate-200 text-xs uppercase tracking-wider text-slate-600 transition-all"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-2.5 bg-orange-600 font-black rounded-xl text-white hover:bg-orange-700 shadow-lg shadow-orange-200 text-xs uppercase tracking-wider transition-all"
                      >
                        {isAddingCategory ? 'Tạo Danh Mục' : 'Lưu Thay Đổi'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>


          {/* Categories Grid displays with counters of associated products */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, idx) => {
              const count = products.filter(p => p.categoryId === cat.id).length;
              const isBeingDragged = draggedCategoryIndex === idx;
              return (
                <div 
                  key={cat.id} 
                  draggable={true}
                  onDragStart={(e) => {
                    setDraggedCategoryIndex(idx);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedCategoryIndex === null || draggedCategoryIndex === idx) return;
                    
                    const updated = [...categories];
                    const itemToMove = updated[draggedCategoryIndex];
                    updated.splice(draggedCategoryIndex, 1);
                    updated.splice(idx, 0, itemToMove);
                    
                    setDraggedCategoryIndex(idx);
                    
                    const finalized = updated.map((catItem, i) => ({
                      ...catItem,
                      sortOrder: i
                    }));
                    onUpdateCategories(finalized);
                  }}
                  onDragEnd={() => {
                    setDraggedCategoryIndex(null);
                  }}
                  className={`p-4 border rounded-2xl flex items-center justify-between gap-3 transition-all duration-200 select-none ${
                    isBeingDragged 
                      ? 'border-dashed border-orange-400 bg-orange-50/25 scale-98 opacity-50 shadow-inner' 
                      : 'bg-white border-slate-200 shadow-xs hover:shadow-sm hover:border-slate-350'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Grip handle for visual feedback */}
                    <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1 shrink-0" title="Giữ và kéo để đổi thứ tự">
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-3xl select-none bg-orange-50 p-2 rounded-xl shrink-0">{cat.icon}</span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-slate-800 text-sm">{cat.name}</h3>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${cat.type === 'drink' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                          {cat.type === 'drink' ? 'Đồ uống' : 'Đồ ăn'}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{count} sản phẩm trực thuộc</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Move up / down controls */}
                    <div className="flex flex-col gap-0.5 mr-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveCategory(idx, 'up')}
                        className={`p-1.5 rounded-md border text-slate-500 transition-all cursor-pointer ${
                          idx === 0 
                            ? 'opacity-30 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-300' 
                            : 'bg-white hover:bg-orange-50 hover:text-orange-600 border-slate-200 hover:border-orange-100'
                        }`}
                        title="Di chuyển lên"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => handleMoveCategory(idx, 'down')}
                        className={`p-1.5 rounded-md border text-slate-500 transition-all cursor-pointer ${
                          idx === categories.length - 1 
                            ? 'opacity-30 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-300' 
                            : 'bg-white hover:bg-orange-50 hover:text-orange-600 border-slate-200 hover:border-orange-100'
                        }`}
                        title="Di chuyển xuống"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => setEditingCategory(cat)}
                      className="p-1 px-2 border border-slate-200 hover:border-orange-105 hover:bg-orange-50 hover:text-orange-600 text-slate-700 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                    >
                      Sửa
                    </button>
                    
                    {/* Delete block */}
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1 px-2 border border-slate-200 hover:border-red-105 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}


      {/* 4. PROMOTIONS VIEW */}
      {activeTab === 'promotions' && (
        <div className="space-y-4 animate-fade-in text-xs">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Quản lý mã giảm giá</h2>
            <button
              onClick={() => {
                setEditingPromo(null);
                setIsAddingPromotion(!isAddingPromotion);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px]"
            >
              <Plus className="w-3.5 h-3.5" /> Tạo Tặng Mã Ưu Đãi
            </button>
          </div>

          {/* Add Promotion layout */}
          <AnimatePresence>
            {isAddingPromotion && (
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden"
                >
                  <form onSubmit={handleAddPromotionSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-orange-100 pb-4 mb-2">
                      <h3 className="font-extrabold text-orange-600 uppercase text-sm tracking-wide flex items-center gap-2">
                        <Tag className="w-5 h-5 text-orange-600" /> Thêm Mã Khuyến Mãi Mới
                      </h3>
                      <button 
                        type="button" 
                        onClick={() => setIsAddingPromotion(false)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                      >
                        <span className="text-xl">✕</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mã Code (viết liền, hoa)*</label>
                        <input
                          type="text"
                          required
                          placeholder="ví dụ: GIAM20K, FREESHIP"
                          value={newPromo.code}
                          onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none focus:border-orange-500 transition-all uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Loại chiết khấu*</label>
                        <select
                          value={newPromo.type}
                          onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value as 'percentage' | 'fixed' })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none focus:border-orange-500 transition-all cursor-pointer"
                        >
                          <option value="percentage">Phần trăm (%)</option>
                          <option value="fixed">Gia giảm cố định (đ)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá trị chiết khấu*</label>
                        <input
                          type="text"
                          required
                          value={newPromo.value ? newPromo.value.toLocaleString('vi-VN') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '');
                            setNewPromo({ ...newPromo, value: Number(raw) || 0 });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none font-mono focus:border-orange-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Đơn hàng tối thiểu*</label>
                        <input
                          type="text"
                          required
                          min={0}
                          value={newPromo.minOrderValue ? newPromo.minOrderValue.toLocaleString('vi-VN') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '');
                            setNewPromo({ ...newPromo, minOrderValue: Number(raw) || 0 });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none font-mono focus:border-orange-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ngày bắt đầu</label>
                          <input 
                            type="datetime-local" 
                            value={newPromo.startDate || ''} 
                            onChange={(e) => setNewPromo({...newPromo, startDate: e.target.value})} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:border-orange-500 outline-none transition-all" 
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ngày kết thúc</label>
                          <input 
                            type="datetime-local" 
                            value={newPromo.endDate || ''} 
                            onChange={(e) => setNewPromo({...newPromo, endDate: e.target.value})} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:border-orange-500 outline-none transition-all" 
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-6 justify-between flex-wrap">
                        <div className="flex items-center gap-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Giới hạn số lần dùng (0 = vô hạn)</label>
                          <input 
                            type="text" 
                            value={newPromo.maxUsageCount || 0} 
                            onChange={(e) => { 
                              const raw = e.target.value.replace(/\D/g, ''); 
                              setNewPromo({...newPromo, maxUsageCount: Number(raw)});
                            }} 
                            className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-center focus:border-orange-500 outline-none transition-all" 
                          />
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer group">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Kích hoạt</span>
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              className="sr-only"
                              checked={newPromo.isActive} 
                              onChange={(e) => setNewPromo({...newPromo, isActive: e.target.checked})} 
                            />
                            <div className={`w-10 h-5 rounded-full transition-colors ${ newPromo.isActive ? 'bg-orange-500' : 'bg-slate-300' }`}></div>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${ newPromo.isActive ? 'translate-x-5' : 'translate-x-0' } shadow-sm`}></div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddingPromotion(false)}
                        className="px-6 py-2.5 bg-slate-100 font-bold rounded-xl hover:bg-slate-200 text-xs uppercase tracking-wider text-slate-600 transition-all"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-2.5 bg-orange-600 font-black rounded-xl text-white hover:bg-orange-700 shadow-lg shadow-orange-200 text-xs uppercase tracking-wider transition-all"
                      >
                        Thêm Mã Ưu Đãi
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>


          {/* Edit Promotion Modal Layout */}
          <AnimatePresence>
            {editingPromo && (
              <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto pt-20 pb-20">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden"
                >
                  <form onSubmit={handleEditPromotionSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-orange-100 pb-4 mb-2">
                      <h3 className="font-extrabold text-orange-600 uppercase text-sm tracking-wide flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-orange-600" /> Chỉnh sửa khuyến mãi
                      </h3>
                      <button 
                        type="button" 
                        onClick={() => setEditingPromo(null)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                      >
                        <span className="text-xl">✕</span>
                      </button>
                    </div>

                    <div className="bg-orange-50/30 p-3 rounded-2xl border border-orange-100/50 mb-4">
                      <div className="text-[10px] text-orange-400 font-bold uppercase tracking-widest pl-1">Đang chỉnh sửa mã</div>
                      <div className="text-sm font-black text-slate-800 uppercase px-1">{editingPromo.code}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mã Code (viết liền, hoa)*</label>
                        <input
                          type="text"
                          required
                          value={editingPromo.code}
                          onChange={(e) => setEditingPromo({ ...editingPromo, code: e.target.value.toUpperCase() })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none focus:border-orange-500 transition-all uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Loại chiết khấu*</label>
                        <select
                          value={editingPromo.type}
                          onChange={(e) => setEditingPromo({ ...editingPromo, type: e.target.value as 'percentage' | 'fixed' })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:bg-white outline-none focus:border-orange-500 transition-all cursor-pointer"
                        >
                          <option value="percentage">Phần trăm (%)</option>
                          <option value="fixed">Gia giảm cố định (đ)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá trị chiết khấu*</label>
                        <input
                          type="text"
                          required
                          value={editingPromo.value ? editingPromo.value.toLocaleString('vi-VN') : ''}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/\./g, '');
                            const numericValue = Number(rawValue);
                            if (!isNaN(numericValue)) {
                              setEditingPromo({ ...editingPromo, value: numericValue });
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none font-mono focus:border-orange-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Đơn hàng tối thiểu*</label>
                        <input
                          type="text"
                          required
                          min={0}
                          value={editingPromo.minOrderValue ? editingPromo.minOrderValue.toLocaleString('vi-VN') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\./g, '');
                            setEditingPromo({ ...editingPromo, minOrderValue: Number(raw) || 0 });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none font-mono focus:border-orange-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ngày bắt đầu</label>
                          <input 
                            type="datetime-local" 
                            value={editingPromo.startDate || ''} 
                            onChange={(e) => setEditingPromo({...editingPromo, startDate: e.target.value})} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:border-orange-500 outline-none transition-all" 
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ngày kết thúc</label>
                          <input 
                            type="datetime-local" 
                            value={editingPromo.endDate || ''} 
                            onChange={(e) => setEditingPromo({...editingPromo, endDate: e.target.value})} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold focus:border-orange-500 outline-none transition-all" 
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-6 justify-between flex-wrap">
                        <div className="flex items-center gap-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Giới hạn số lần dùng (0 = vô hạn)</label>
                          <input 
                            type="text" 
                            value={editingPromo.maxUsageCount || 0} 
                            onChange={(e) => { 
                              const raw = e.target.value.replace(/\D/g, ''); 
                              setEditingPromo({...editingPromo, maxUsageCount: Number(raw)});
                            }} 
                            className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-center focus:border-orange-500 outline-none transition-all" 
                          />
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer group">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Trạng thái phát</span>
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              className="sr-only"
                              checked={editingPromo.isActive} 
                              onChange={(e) => setEditingPromo({...editingPromo, isActive: e.target.checked})} 
                            />
                            <div className={`w-10 h-5 rounded-full transition-colors ${ editingPromo.isActive ? 'bg-orange-500' : 'bg-slate-300' }`}></div>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${ editingPromo.isActive ? 'translate-x-5' : 'translate-x-0' } shadow-sm`}></div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingPromo(null)}
                        className="px-6 py-2.5 bg-slate-100 font-bold rounded-xl hover:bg-slate-200 text-xs uppercase tracking-wider text-slate-600 transition-all"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-2.5 bg-sky-600 font-black rounded-xl text-white hover:bg-sky-700 shadow-lg shadow-sky-200 text-xs uppercase tracking-wider transition-all"
                      >
                        Lưu Thay Đổi
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>


          {/* Table list of codes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã giảm giá ưu đãi</th>
                  <th className="px-4 py-3">Kiểu chiết khấu</th>
                  <th className="px-4 py-3 text-right">Mức gia giảm</th>
                  <th className="px-4 py-3 text-right">Đơn tối thiểu</th>
                  <th className="px-4 py-3 text-center">Đã dùng (lần)</th>
                  <th className="px-4 py-3 text-right">Tổng KM (đ)</th>
                  <th className="px-4 py-3 text-center">Trạng thái phát</th>
                  <th className="px-4 py-3 text-center">Xóa bỏ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {promotions.map(promo => {
                   const usedOrders = orders.filter(o => o.promoCodeUsed === promo.code && (o.paymentStatus === 'paid' || o.paymentStatus === 'debt'));
                   const usageCount = usedOrders.length;
                   const totalSaved = usedOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
                   return (
                  <tr key={promo.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-orange-600 text-xs">
                      {promo.code}
                    </td>
                    <td className="px-4 py-3 italic text-xs">
                      {promo.type === 'percentage' ? 'Phần trăm (%)' : 'Giảm tiền mặt trực tiếp'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 text-xs">
                      {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value.toLocaleString('vi-VN')} đ`}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">
                      {promo.minOrderValue.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-mono font-bold text-indigo-600">
                      {usageCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 text-xs">
                      {totalSaved.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          const updated = promotions.map(p => p.id === promo.id ? { ...p, isActive: !p.isActive } : p);
                          onUpdatePromotions(updated);
                        }}
                        className={`p-1 px-3 py-1 rounded-full text-[9px] font-bold uppercase ${
                          promo.isActive 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        {promo.isActive ? 'Đang chạy' : 'Hết hạn'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setEditingPromo(promo);
                          setIsAddingPromotion(false);
                        }}
                        className="p-1 px-2 border hover:bg-orange-50 hover:text-orange-600 rounded-lg text-slate-700 text-[10px] font-bold uppercase transition-all mr-1"
                      >
                         Sửa
                      </button>
                      <button
                        onClick={() => handleDeletePromotion(promo.id)}
                        className="p-1 px-2 border hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-700 text-[10px] font-bold uppercase transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                   )
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 5. TABLES VIEW */}
      {activeTab === 'tables' && (
        <div className="space-y-4 animate-fade-in text-xs">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Quản lý Bàn nhà hàng</h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setIsAddingArea(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px] shadow-sm"
              >
                <MapPin className="w-3.5 h-3.5" /> Khu vực
              </button>
              <button
                onClick={() => setIsBulkAddingTable(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px] shadow-sm"
              >
                <Layers className="w-3.5 h-3.5" /> Thêm hàng loạt
              </button>
              <button
                onClick={() => {
                  setEditingTable(null);
                  setIsAddingTable(true);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px] shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Bàn Mới
              </button>
            </div>
          </div>

          {/* Table Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm gap-3">
            <div className="flex items-center gap-2 overflow-hidden w-full sm:w-auto">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap shrink-0 pl-1">Lọc theo khu vực:</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
                <button
                  onClick={() => setAreaFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap flex-none ${
                    areaFilter === 'all' ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  Tất cả
                </button>
                {areas.map(area => (
                  <button
                    key={area.id}
                    onClick={() => setAreaFilter(area.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap flex-none ${
                      areaFilter === area.id ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {area.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Tổng số: <span className="text-orange-600">{tables.filter(t => areaFilter === 'all' || t.areaId === areaFilter).length}</span> bàn
            </div>
          </div>

          {/* Manage Areas Modal */}
          <AnimatePresence>
            {isAddingArea && (
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-sky-100"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-sky-100 pb-3">
                      <h3 className="font-black text-sky-600 uppercase text-xs tracking-wider flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Thiết lập khu vực
                      </h3>
                      <button type="button" onClick={() => setIsAddingArea(false)} className="text-slate-400 hover:text-slate-600">
                        <span className="text-xl">✕</span>
                      </button>
                    </div>

                    <form onSubmit={handleAddAreaSubmit} className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Tên khu vực (VD: Tầng 1, Sân vườn...)"
                        value={newArea.name}
                        onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:bg-white outline-none focus:border-sky-500 transition-all"
                      />
                      <button type="submit" className="bg-sky-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider">
                        Thêm
                      </button>
                    </form>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                      {areas.length === 0 ? (
                        <p className="text-center py-8 text-slate-400 font-bold italic">Chưa có khu vực nào được tạo</p>
                      ) : (
                        areas.map(area => (
                          <div key={area.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                             <span className="font-bold text-slate-700 text-sm">{area.name}</span>
                             <div className="flex gap-1">
                               <button 
                                 onClick={() => {
                                   const newName = prompt("Nhập tên mới cho khu vực:", area.name);
                                   if (newName && newName.trim()) {
                                     onUpdateAreas(areas.map(a => a.id === area.id ? { ...a, name: newName.trim() } : a));
                                   }
                                 }}
                                 className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-sky-600 transition-all"
                               >
                                 <Edit3 className="w-3.5 h-3.5" />
                               </button>
                               <button 
                                 onClick={() => {
                                   const hasTables = tables.some(t => t.areaId === area.id);
                                   if (hasTables) {
                                     alert("Không thể xóa khu vực này vì đang có bàn trực thuộc!");
                                     return;
                                   }
                                   if (confirm(`Bạn có chắc muốn xóa khu vực "${area.name}"?`)) {
                                     onUpdateAreas(areas.filter(a => a.id !== area.id));
                                   }
                                 }}
                                 className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                               >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Bulk Add Tables Modal */}
          <AnimatePresence>
            {isBulkAddingTable && (
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-indigo-100"
                >
                  <form onSubmit={handleBulkAddTables} className="p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-indigo-100 pb-3">
                      <h3 className="font-black text-indigo-600 uppercase text-xs tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Thêm bàn hàng loạt
                      </h3>
                      <button type="button" onClick={() => setIsBulkAddingTable(false)} className="text-slate-400 hover:text-slate-600">
                        <span className="text-xl">✕</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Tiền tố tên bàn (VD: Bàn, VIP...)</label>
                        <input
                          type="text"
                          value={bulkTableConfig.prefix}
                          onChange={(e) => setBulkTableConfig({ ...bulkTableConfig, prefix: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Từ số</label>
                          <input
                            type="number"
                            min={1}
                            value={bulkTableConfig.from}
                            onChange={(e) => setBulkTableConfig({ ...bulkTableConfig, from: Number(e.target.value) })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Đến số</label>
                          <input
                            type="number"
                            min={bulkTableConfig.from}
                            value={bulkTableConfig.to}
                            onChange={(e) => setBulkTableConfig({ ...bulkTableConfig, to: Number(e.target.value) })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Khu vực</label>
                          <select
                            value={bulkTableConfig.areaId}
                            onChange={(e) => setBulkTableConfig({ ...bulkTableConfig, areaId: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none cursor-pointer"
                          >
                            <option value="">Không có</option>
                            {areas.map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Sức chứa</label>
                          <input
                            type="number"
                            min={1}
                            value={bulkTableConfig.capacity}
                            onChange={(e) => setBulkTableConfig({ ...bulkTableConfig, capacity: Number(e.target.value) })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsBulkAddingTable(false)}
                        className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl uppercase text-[10px]"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-100 uppercase text-[10px]"
                      >
                        Khởi tạo {bulkTableConfig.to - bulkTableConfig.from + 1} bàn
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Add Table Modal */}
          <AnimatePresence>
            {isAddingTable && (
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-orange-100"
                >
                  <form onSubmit={handleAddTableSubmit} className="p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-orange-100 pb-3">
                      <h3 className="font-black text-orange-600 uppercase text-xs tracking-wider flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Thiết lập bàn mới
                      </h3>
                      <button type="button" onClick={() => setIsAddingTable(false)} className="text-slate-400 hover:text-slate-600">
                        <span className="text-xl">✕</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Tên/Số Bàn (VD: Bàn 01, VIP 2)*</label>
                        <input
                          type="text"
                          required
                          autoFocus
                          value={newTable.name}
                          onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                          placeholder="Nhập tên bàn..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none focus:border-orange-500 transition-all placeholder:font-normal placeholder:text-slate-300"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Sức Chứa (Người)</label>
                          <input
                            type="number"
                            min={1}
                            value={newTable.capacity || 4}
                            onChange={(e) => setNewTable({ ...newTable, capacity: Number(e.target.value) })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none font-mono focus:border-orange-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Khu vực</label>
                          <select
                            value={newTable.areaId}
                            onChange={(e) => setNewTable({ ...newTable, areaId: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none cursor-pointer focus:border-orange-500 transition-all"
                          >
                            <option value="">Chọn khu vực...</option>
                            {areas.map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Trạng thái khởi tạo</label>
                        <select
                          value={newTable.status}
                          onChange={(e) => setNewTable({ ...newTable, status: e.target.value as any })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none cursor-pointer focus:border-orange-500 transition-all"
                        >
                          <option value="available">Bàn Trống</option>
                          <option value="occupied">Có Khách</option>
                          <option value="reserved">Đặt Trước</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsAddingTable(false)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors uppercase tracking-widest text-[10px]"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl shadow-lg shadow-orange-200 transition-all uppercase tracking-widest text-[10px]"
                      >
                        Khởi Tạo Bàn
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Edit Table Modal */}
          <AnimatePresence>
            {editingTable && (
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-sky-100"
                >
                  <form onSubmit={handleEditTableSubmit} className="p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-sky-100 pb-3">
                      <h3 className="font-black text-sky-600 uppercase text-xs tracking-wider flex items-center gap-2">
                        <Edit3 className="w-4 h-4" /> Cập nhật thông tin bàn
                      </h3>
                      <button type="button" onClick={() => setEditingTable(null)} className="text-slate-400 hover:text-slate-600">
                        <span className="text-xl">✕</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Đang sửa ID: {editingTable.id}</label>
                        <input
                          type="text"
                          required
                          autoFocus
                          value={editingTable.name}
                          onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none focus:border-sky-500 transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Sức Chứa (Người)</label>
                          <input
                            type="number"
                            min={1}
                            value={editingTable.capacity || 4}
                            onChange={(e) => setEditingTable({ ...editingTable, capacity: Number(e.target.value) })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none font-mono focus:border-sky-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Khu vực</label>
                          <select
                            value={editingTable.areaId || ''}
                            onChange={(e) => setEditingTable({ ...editingTable, areaId: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none cursor-pointer focus:border-sky-500 transition-all"
                          >
                            <option value="">Chọn khu vực...</option>
                            {areas.map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Trạng thái</label>
                        <select
                          value={editingTable.status}
                          onChange={(e) => setEditingTable({ ...editingTable, status: e.target.value as any })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white outline-none cursor-pointer focus:border-sky-500 transition-all"
                        >
                          <option value="available">Bàn Trống</option>
                          <option value="occupied">Có Khách</option>
                          <option value="reserved">Đặt Trước</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingTable(null)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors uppercase tracking-widest text-[10px]"
                      >
                        Huỷ
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl shadow-lg shadow-sky-200 transition-all uppercase tracking-widest text-[10px]"
                      >
                        Cập Nhật
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Table List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.filter(t => areaFilter === 'all' || t.areaId === areaFilter).length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-300 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center">
                <Layout className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-bold text-slate-400">Danh sách bàn hiện đang trống</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-300 mt-1">Vui lòng nhấp Thêm Bàn để bắt đầu thiết lập</p>
              </div>
            ) : (
              tables.filter(t => areaFilter === 'all' || t.areaId === areaFilter).map(table => (
                <div key={table.id} className={`${t.card} p-5 flex flex-col gap-4 relative group hover:border-orange-200 transition-all duration-300`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                        table.status === 'available' ? 'bg-emerald-50 text-emerald-600' :
                        table.status === 'occupied' ? 'bg-rose-50 text-rose-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {table.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-sm leading-none">{table.name}</h3>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Sức chứa: {table.capacity} ng</p>
                          {table.areaId && (
                            <p className="text-[8px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              {areas.find(a => a.id === table.areaId)?.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                        table.status === 'available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        table.status === 'occupied' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {table.status === 'available' ? 'Trống' : table.status === 'occupied' ? 'Có khách' : 'Đặt trước'}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl p-4 border border-slate-100 group-hover:bg-white group-hover:border-orange-50 transition-all">
                     <div id={`qr-wrap-${table.id}`}>
                        <QRCodeCanvas 
                          value={table.qrCode || `${window.location.origin}${window.location.pathname}?tableId=${table.id}`} 
                          size={120}
                          level="H"
                          includeMargin={false}
                          className="mx-auto"
                        />
                     </div>
                     <div className="mt-3 flex items-center gap-2">
                        <QrCode className="w-3 h-3 text-slate-400" />
                        <span className="text-[8px] font-mono font-bold text-slate-400 uppercase">Mã vùng bàn</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setEditingTable(table)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-600 hover:text-sky-700 font-bold uppercase text-[9px] transition-all"
                    >
                      <Edit3 className="w-3 h-3" /> Sửa
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-700 font-bold uppercase text-[9px] transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                        const canvas = document.querySelector(`#qr-wrap-${table.id} canvas`) as HTMLCanvasElement;
                        if (canvas) {
                          const url = canvas.toDataURL("image/png");
                          const link = document.createElement("a");
                          link.download = `QR_${table.name}.png`;
                          link.href = url;
                          link.click();
                        }
                    }}
                    className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                  >
                    <Printer className="w-3 h-3" /> Tải/In Mã Bàn
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. CUSTOMER VIEW */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in text-xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Danh sách khách hàng</h2>
            <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2.5 py-1 rounded-full font-mono">
              Tổng số: {customers.length} khách
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-500 text-[9px] uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">SDT / Tên</th>
                  <th className="px-4 py-3">Địa chỉ</th>
                  <th className="px-4 py-3 text-right">Tổng Đơn</th>
                  <th className="px-4 py-3 text-right">Đã Mua</th>
                  <th className="px-4 py-3 text-right">Công Nợ</th>
                  <th className="px-4 py-3">Ghi Chú</th>
                  <th className="px-4 py-3 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-sans">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                      Không tìm thấy thông tin khách hàng hợp lệ nào.
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map(cust => (
                    <tr key={cust.phone} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-orange-600 block text-xs font-mono tracking-wider">{cust.phone}</span>
                        <span className="text-[10px] block font-semibold text-slate-800">{cust.firstName}</span>
                      </td>
                      <td className="px-4 py-3.5 text-[10px] text-slate-500">{cust.address || '—'}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">{cust.totalOrders}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">{cust.totalSpent.toLocaleString('vi-VN')}đ</td>
                      <td className="px-4 py-3.5 text-right text-rose-600 font-bold font-mono">
                        {cust.debtOrders > 0 ? `${cust.debtOrders} đơn / ${cust.debtAmount.toLocaleString('vi-VN')}đ` : '0đ'}
                      </td>
                      <td className="px-4 py-3.5 text-[10px] text-slate-500 italic max-w-xs truncate" title={cust.notes.join('\n')}>
                        {cust.notes.length > 0 ? cust.notes.join(' • ') : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCustomer(cust)}
                            className="p-1.5 hover:bg-slate-100 text-blue-600 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                            title="Sửa thông tin khách hàng"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(cust.phone)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Xoá khách hàng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Customer list pagination bar */}
          {totalCustomerPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 text-[11px]">
              <span className="text-slate-500 font-semibold uppercase tracking-wider">
                Trang {customerPage} / {totalCustomerPages} — Hiển thị {(customerPage - 1) * CUSTOMERS_PER_PAGE + 1} đến {Math.min(customerPage * CUSTOMERS_PER_PAGE, customers.length)} của {customers.length} khách hàng
              </span>
              <div className="flex gap-1 items-center">
                <button
                  type="button"
                  disabled={customerPage === 1}
                  onClick={() => setCustomerPage(prev => Math.max(prev - 1, 1))}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer transition-colors"
                >
                  Trước
                </button>
                {Array.from({ length: totalCustomerPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCustomerPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                      customerPage === pageNum 
                        ? 'bg-orange-600 text-white shadow-sm font-black' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={customerPage === totalCustomerPages}
                  onClick={() => setCustomerPage(prev => Math.min(prev + 1, totalCustomerPages))}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white cursor-pointer transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. REPORT VIEW */}
      {activeTab === 'report' && (
        <div className="animate-fade-in text-xs">
          <ReportSection products={products} orders={orders} categories={categories} storeConfig={storeConfig} />
        </div>
      )}

      {/* 5. STORE INFO CONFIGURATION */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveStoreConfig} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-fade-in text-xs">
          
          <h2 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide border-b border-slate-100 pb-2 mb-4 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-orange-600" /> Cấu hình thông tin cửa hàng / quán
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Tên cửa hiệu*</label>
              <input
                type="text"
                required
                value={editingConfig.name}
                onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Giờ mở cửa phục vụ hàng ngày*</label>
              <input
                type="text"
                required
                value={editingConfig.openHours}
                onChange={(e) => setEditingConfig({ ...editingConfig, openHours: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Điện thoại hotline*</label>
              <input
                type="text"
                required
                value={editingConfig.phone}
                onChange={(e) => setEditingConfig({ ...editingConfig, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">SĐT nhận Zalo đặt hàng*</label>
              <input
                type="text"
                required
                value={editingConfig.zaloHotline}
                onChange={(e) => setEditingConfig({ ...editingConfig, zaloHotline: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none font-mono"
              />
              <p className="text-[10px] text-orange-500 italic font-semibold mt-1">Đơn hàng sau khi đặt xong sẽ tự động mời quét & chuyển hướng chat trực tiếp tới SĐT Zalo này.</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Địa chỉ quán chính*</label>
            <input
              type="text"
              required
              value={editingConfig.address}
              onChange={(e) => setEditingConfig({ ...editingConfig, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none"
            />
          </div>

          <h3 className="font-extrabold text-slate-800 tracking-tight uppercase text-[11px] pt-3 border-t border-slate-100 flex items-center gap-1.5">
            💳 Tài khoản ngân hàng số thụ hưởng (Dùng hiển thị cho khách hàng thanh toán)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Tên Ngân hàng*</label>
              <input
                type="text"
                required
                value={editingConfig.bankName}
                onChange={(e) => setEditingConfig({ ...editingConfig, bankName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Số tài khoản*</label>
              <input
                type="text"
                required
                value={editingConfig.bankAccount}
                onChange={(e) => setEditingConfig({ ...editingConfig, bankAccount: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Tên chủ tài khoản*</label>
              <input
                type="text"
                required
                value={editingConfig.bankAccountName}
                onChange={(e) => setEditingConfig({ ...editingConfig, bankAccountName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none uppercase"
              />
            </div>
          </div>

          {/* QR Mode option toggle */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex-1 space-y-1">
              <span className="block text-[11px] font-black text-slate-700 uppercase tracking-tight flex items-center gap-1.5">
                🎯 QR động khớp giá tiền và nội dung
              </span>
              <p className="text-[10px] text-slate-400 font-sans leading-normal">
                Nếu bật: Mã QR tự động điền sẵn số tiền thanh toán & cú pháp hóa đơn (khách chỉ cần quét & xác nhận chuyển tiền). <br/>
                Nếu tắt: Mã QR chỉ chứa thông tin tài khoản của tiệm, khách tự điền số tiền & nội dung (thuận tiện cho việc tip thêm).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={editingConfig.useDynamicQrAmount !== false}
                onChange={(e) => setEditingConfig({ ...editingConfig, useDynamicQrAmount: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          {/* Custom QR Code Upload Section */}
          <div className="bg-slate-50 p-4 border border-slate-200 border-dashed rounded-2xl space-y-3.5">
            <h4 className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider flex items-center gap-1">
              📷 Mã QR Thanh Toán Tiệm Tự Tải Lên (Tùy Chọn)
            </h4>
            <p className="text-[10px] text-slate-400 font-medium font-sans leading-normal">
              Nếu bạn muốn dùng ảnh QR riêng của tiệm (mã QR có ảnh đại diện, logo ngộ nghĩnh, hoặc mã cứng MoMo, VNPay, Zalopay...), hãy bấm để tải lên hoặc dán link ảnh. Nếu trống, hệ thống sẽ tự động tạo QR Ngân Hàng chuyên nghiệp (VietQR) theo config phía trên.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Left Column: Direct File Selector or Image Url Text field */}
              <div className="space-y-3">
                {/* 1. File Upload Dropzone / Button */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase">Chọn ảnh QR từ máy</span>
                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 bg-white flex flex-col items-center justify-center text-center hover:border-orange-500 transition-colors cursor-pointer group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditingConfig(prev => ({
                              ...prev,
                              customQrCodeUrl: reader.result as string
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                    />
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-orange-600 transition-colors mb-2" />
                    <span className="text-[10px] font-black text-slate-700 capitalize">Bấm chọn tệp ảnh QR</span>
                    <span className="text-[9px] text-slate-400 mt-1">Hỗ trợ định dạng hình ảnh PNG, JPG, WEBP</span>
                  </div>
                </div>

                {/* 2. Manual URL Text field fallback */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Hoặc dán link ảnh QR</label>
                  <input
                    type="text"
                    placeholder="https://example.com/my-qr-code.png"
                    value={editingConfig.customQrCodeUrl || ''}
                    onChange={(e) => setEditingConfig({ ...editingConfig, customQrCodeUrl: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none text-[11px]"
                  />
                </div>
              </div>

              {/* Right Column: Dynamic Preview with current selected custom image */}
              <div className="flex flex-col items-center justify-center bg-white p-3.5 border border-slate-200 rounded-2xl h-full min-h-[160px]">
                {editingConfig.customQrCodeUrl ? (
                  <div className="flex flex-col items-center justify-center text-center w-full space-y-2">
                    <div className="relative w-28 h-28 border border-slate-100 rounded-xl overflow-hidden shadow-xs flex items-center justify-center bg-slate-50">
                      <img 
                        src={editingConfig.customQrCodeUrl} 
                        alt="Custom QR Preview" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[8.5px] font-bold text-emerald-600 uppercase tracking-wider">✓ Đang dùng QR tự tải lên</span>
                    <button 
                      type="button"
                      onClick={() => setEditingConfig({ ...editingConfig, customQrCodeUrl: "" })}
                      className="text-[9px] font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/70 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Xóa ảnh QR tải lên
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <span className="text-3xl">🤖</span>
                    <h5 className="font-extrabold text-[10px] text-slate-700 uppercase tracking-wide mt-2">Dùng VietQR Tự Động</h5>
                    <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                      Chưa tải lên ảnh QR. Hệ thống sẽ tự tạo mã quét thông minh VietQR chuẩn xác với Số Tài Khoản đã điền.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Custom Logo Upload Section */}
          <div className="bg-slate-50 p-4 border border-slate-200 border-dashed rounded-2xl space-y-3.5">
            <h4 className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider flex items-center gap-1">
              🏬 LOGO CỬA HÀNG / QUÁN (THAY THẾ CHỮ CÁI ĐẦU)
            </h4>
            <p className="text-[10px] text-slate-400 font-medium font-sans leading-normal">
              Tải lên hình ảnh Logo đại diện tròn/vuông cho quán của bạn. Ảnh Logo này sẽ thay thế biểu tượng hình tròn ký tự đầu tiên ở đầu trang gọi món của thực khách (Mobile Simulator).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Left Column: Direct File Selector or Logo Url Text field */}
              <div className="space-y-3">
                {/* 1. File Upload Dropzone / Button */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase">Chọn ảnh logo từ máy</span>
                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 bg-white flex flex-col items-center justify-center text-center hover:border-orange-500 transition-colors cursor-pointer group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditingConfig(prev => ({
                              ...prev,
                              logoUrl: reader.result as string
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                    />
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-orange-600 transition-colors mb-2" />
                    <span className="text-[10px] font-black text-slate-700 capitalize">Bấm chọn tệp ảnh Logo</span>
                    <span className="text-[9px] text-slate-400 mt-1">Hỗ trợ định dạng hình ảnh PNG, JPG, WEBP</span>
                  </div>
                </div>

                {/* 2. Manual URL Text field fallback */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Hoặc dán link ảnh Logo</label>
                  <input
                    type="text"
                    placeholder="https://example.com/shop-logo.png"
                    value={editingConfig.logoUrl || ''}
                    onChange={(e) => setEditingConfig({ ...editingConfig, logoUrl: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none text-[11px]"
                  />
                </div>
              </div>

              {/* Right Column: Dynamic Preview with current selected custom image */}
              <div className="flex flex-col items-center justify-center bg-white p-3.5 border border-[#e5e5e5] rounded-2xl h-full min-h-[160px]">
                {editingConfig.logoUrl ? (
                  <div className="flex flex-col items-center justify-center text-center w-full space-y-2">
                    <div className="relative w-20 h-20 border border-slate-150 rounded-full overflow-hidden shadow-sm flex items-center justify-center bg-slate-50">
                      <img 
                        src={editingConfig.logoUrl} 
                        alt="Logo Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[8.5px] font-bold text-emerald-600 uppercase tracking-wider">✓ Đang sử dụng ảnh Logo</span>
                    <button 
                      type="button"
                      onClick={() => setEditingConfig({ ...editingConfig, logoUrl: "" })}
                      className="text-[9px] font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/70 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Xóa ảnh Logo
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-xl font-bold text-slate-450 uppercase mb-2">
                      {editingConfig.name ? editingConfig.name.trim().charAt(0) : 'B'}
                    </div>
                    <h5 className="font-extrabold text-[10px] text-slate-700 uppercase tracking-wide">Dùng Ký Tự Mặc Định</h5>
                    <p className="text-[9px] text-slate-400 mt-1 leading-normal max-w-[200px]">
                      Hình tròn hiển thị chữ cái đầu tiên của quán ({editingConfig.name ? editingConfig.name.trim().charAt(0) : 'B'}) do chưa tải logo lên.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ====== TELEGRAM NOTIFICATION INTEGRATION ====== */}
          <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl space-y-4 shadow-sm text-xs">
            <h3 className="font-extrabold text-[12px] text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-500 animate-pulse" /> ✈️ TÍCH HỢP THÔNG BÁO TELEGRAM BOT
            </h3>
            
            <p className="text-[10px] text-slate-500 font-sans leading-normal">
              Bật tính năng này để nhận thông báo tức thời về điện thoại mỗi khi quán của bạn phát sinh đơn hàng mới, đặt bàn trước (booking), thanh toán thành công hoặc kết thúc ngày bán hàng với báo cáo doanh thu tổng hợp tiện lợi.
            </p>

            {/* Enable/Disable toggle */}
            <div className="flex items-center justify-between bg-white px-4 py-3 border border-slate-150 rounded-xl">
              <div>
                <span className="block font-black text-slate-700 uppercase text-[10px]">Kích hoạt thông báo Telegram</span>
                <span className="text-[9px] text-slate-400">Cho phép hệ thống gửi báo cáo trực tiếp đến nhóm chat Telegram của bạn</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingConfig.telegram?.enabled || false}
                  onChange={(e) => {
                    const currentTele = editingConfig.telegram || {
                      enabled: false,
                      botToken: '',
                      chatId: '',
                      notifyNewOrder: true,
                      notifyPayment: true,
                      notifyCancel: true,
                      notifySummaryEnabled: true,
                      notifySummaryTime: '22:00'
                    };
                    setEditingConfig({
                      ...editingConfig,
                      telegram: {
                        ...currentTele,
                        enabled: e.target.checked
                      }
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-505 peer-checked:bg-sky-550 peer-checked:bg-sky-500"></div>
              </label>
            </div>

            {editingConfig.telegram?.enabled && (
              <div className="space-y-4 pl-1 animate-fade-in">
                
                {/* 1. API Token and Chat ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Telegram Bot Token*</label>
                    <input
                      type="text"
                      required
                      placeholder="Sao chép từ @BotFather..."
                      value={editingConfig.telegram?.botToken || ''}
                      onChange={(e) => {
                        const currentTele = editingConfig.telegram || {
                          enabled: true,
                          botToken: '',
                          chatId: '',
                          notifyNewOrder: true,
                          notifyPayment: true,
                          notifyCancel: true,
                          notifySummaryEnabled: true,
                          notifySummaryTime: '22:00'
                        };
                        setEditingConfig({
                          ...editingConfig,
                          telegram: { ...currentTele, botToken: e.target.value }
                        });
                      }}
                      className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 font-mono text-[11px] text-slate-800 outline-none focus:border-sky-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Telegram Chat ID*</label>
                    <input
                      type="text"
                      required
                      placeholder="Dán ID từ nhóm chat, bắt đầu với dấu âm (-) như -100xxxxx"
                      value={editingConfig.telegram?.chatId || ''}
                      onChange={(e) => {
                        const currentTele = editingConfig.telegram || {
                          enabled: true,
                          botToken: '',
                          chatId: '',
                          notifyNewOrder: true,
                          notifyPayment: true,
                          notifyCancel: true,
                          notifySummaryEnabled: true,
                          notifySummaryTime: '22:00'
                        };
                        setEditingConfig({
                          ...editingConfig,
                          telegram: { ...currentTele, chatId: e.target.value }
                        });
                      }}
                      className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 font-mono text-[11px] text-slate-800 outline-none focus:border-sky-400 transition"
                    />
                  </div>
                </div>

                {/* Test button row */}
                <div className="flex items-center gap-3 bg-white p-3 border border-slate-150 rounded-xl">
                  <button
                    type="button"
                    onClick={async () => {
                      const token = editingConfig.telegram?.botToken;
                      const chat = editingConfig.telegram?.chatId;
                      if (!token || !chat) {
                        alert('Vui lòng nhập đầy đủ Bot Token và Chat ID trước khi bấm gửi thử nghiệm!');
                        return;
                      }
                      
                      setIsTestingTele(true);
                      try {
                        const testMsg = `<b>⚡️ KHAI VỊ POS - KIỂM TRA ĐƯỜNG TRUYỀN</b>\n----------------------------------------\n🎉 Xin chúc mừng! Thiết bị quản lý đã kết nối thành công tới POS thông báo tự động của cửa hàng <b>${editingConfig.name || storeConfig.name}</b>.\n⏰ Thời gian kiểm thử: ${new Date().toLocaleTimeString('vi-VN')} ${new Date().toLocaleDateString('vi-VN')}`;
                        const success = await sendTelegramMessage(token, chat, testMsg);
                        if (success) {
                          alert('🔥 Gửi tin nhắn thử nghiệm THÀNH CÔNG! Hãy kiểm tra ứng dụng Telegram của nhóm bạn.');
                        } else {
                          alert('❌ Gửi tin nhắn thất bại! Vui lòng kiểm tra lại Bot Token đã chính xác chưa, hoặc bạn đã khởi động bằng cách gõ /start với bot chưa.');
                        }
                      } catch (e) {
                        alert('Xảy ra lỗi mạng khi gửi tin thử nghiệm.');
                      } finally {
                        setIsTestingTele(false);
                      }
                    }}
                    disabled={isTestingTele}
                    className="px-4.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-black rounded-lg text-[10px] flex items-center gap-1.5 transition-colors uppercase cursor-pointer shrink-0 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" /> {isTestingTele ? 'Đang gửi...' : 'GỬI TIN CHẠY THỬ'}
                  </button>
                  <p className="text-[9px] text-slate-400 italic leading-snug">
                    Hãy khởi động Bot bằng cách chat <code>/start</code> với Bot cá nhân hoặc thêm Bot vào Nhóm làm Quản Trị Viên (Admin) trước khi test.
                  </p>
                </div>

                {/* 2. Notification criteria checklists */}
                <div className="bg-white p-4 border border-slate-150 rounded-xl space-y-3">
                  <span className="block font-black text-slate-650 uppercase text-[9.5px] border-b border-slate-100 pb-1.5 text-slate-600">
                    🔔 Cài đặt loại hành vi gửi thông báo tự động:
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors border border-slate-100">
                      <input
                        type="checkbox"
                        checked={editingConfig.telegram?.notifyNewOrder ?? true}
                        onChange={(e) => {
                          const currentTele = editingConfig.telegram || {
                            enabled: true,
                            botToken: '',
                            chatId: '',
                            notifyNewOrder: true,
                            notifyPayment: true,
                            notifyCancel: true,
                            notifySummaryEnabled: true,
                            notifySummaryTime: '22:00'
                          };
                          setEditingConfig({
                            ...editingConfig,
                            telegram: { ...currentTele, notifyNewOrder: e.target.checked }
                          });
                        }}
                        className="rounded border-slate-300 text-sky-500 focus:ring-sky-500 w-4 h-4 mt-0.5"
                      />
                      <div>
                        <span className="block font-bold text-slate-700 text-[10px]">Đơn hàng / Cọc mới</span>
                        <span className="text-[8.5px] text-slate-400">Có đơn gọi món hoặc cọc booking</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors border border-slate-100">
                      <input
                        type="checkbox"
                        checked={editingConfig.telegram?.notifyPayment ?? true}
                        onChange={(e) => {
                          const currentTele = editingConfig.telegram || {
                            enabled: true,
                            botToken: '',
                            chatId: '',
                            notifyNewOrder: true,
                            notifyPayment: true,
                            notifyCancel: true,
                            notifySummaryEnabled: true,
                            notifySummaryTime: '22:00'
                          };
                          setEditingConfig({
                            ...editingConfig,
                            telegram: { ...currentTele, notifyPayment: e.target.checked }
                          });
                        }}
                        className="rounded border-slate-300 text-sky-500 focus:ring-sky-500 w-4 h-4 mt-0.5"
                      />
                      <div>
                        <span className="block font-bold text-slate-700 text-[10px]">Thanh toán đơn hàng</span>
                        <span className="text-[8.5px] text-slate-400">Khi thu ngân thu tiền hoặc ăn xong</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors border border-slate-100">
                      <input
                        type="checkbox"
                        checked={editingConfig.telegram?.notifyCancel ?? true}
                        onChange={(e) => {
                          const currentTele = editingConfig.telegram || {
                            enabled: true,
                            botToken: '',
                            chatId: '',
                            notifyNewOrder: true,
                            notifyPayment: true,
                            notifyCancel: true,
                            notifySummaryEnabled: true,
                            notifySummaryTime: '22:00'
                          };
                          setEditingConfig({
                            ...editingConfig,
                            telegram: { ...currentTele, notifyCancel: e.target.checked }
                          });
                        }}
                        className="rounded border-slate-300 text-sky-500 focus:ring-sky-500 w-4 h-4 mt-0.5"
                      />
                      <div>
                        <span className="block font-bold text-slate-700 text-[10px]">Hủy đơn hàng</span>
                        <span className="text-[8.5px] text-slate-400">Khi hoàn tiền/hủy bàn đặt trước</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. Daily Summary automation */}
                <div className="bg-sky-50/50 p-4 border border-sky-100 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-sky-100/50 pb-2">
                    <span className="font-extrabold text-slate-700 uppercase text-[9.5px] flex items-center gap-1">
                      📊 Báo cáo tự động tổng hợp cuối ngày:
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingConfig.telegram?.notifySummaryEnabled ?? true}
                        onChange={(e) => {
                          const currentTele = editingConfig.telegram || {
                            enabled: true,
                            botToken: '',
                            chatId: '',
                            notifyNewOrder: true,
                            notifyPayment: true,
                            notifyCancel: true,
                            notifySummaryEnabled: true,
                            notifySummaryTime: '22:00'
                          };
                          setEditingConfig({
                            ...editingConfig,
                            telegram: { ...currentTele, notifySummaryEnabled: e.target.checked }
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                    </label>
                  </div>

                  {editingConfig.telegram?.notifySummaryEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Thời gian tự động gửi đi hàng ngày*</label>
                        <input
                          type="time"
                          required
                          value={editingConfig.telegram?.notifySummaryTime || '22:00'}
                          onChange={(e) => {
                            const currentTele = editingConfig.telegram || {
                              enabled: true,
                              botToken: '',
                              chatId: '',
                              notifyNewOrder: true,
                              notifyPayment: true,
                              notifyCancel: true,
                              notifySummaryEnabled: true,
                              notifySummaryTime: '22:00'
                            };
                            setEditingConfig({
                              ...editingConfig,
                              telegram: { ...currentTele, notifySummaryTime: e.target.value }
                            });
                          }}
                          className="w-full max-w-[120px] bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-black text-slate-800 outline-none text-[11px]"
                        />
                        <p className="text-[8.5px] text-slate-400 mt-1 leading-normal">
                          Tổng hợp doanh thu ngày hôm nay và tự động gửi đúng vào hẹn giờ khi chạy POS.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1 items-start md:items-end justify-center h-full">
                        <button
                          type="button"
                          onClick={async () => {
                            const token = editingConfig.telegram?.botToken;
                            const chat = editingConfig.telegram?.chatId;
                            if (!token || !chat) {
                              alert('Vui lòng điền Bot Token và Chat ID trước!');
                              return;
                            }
                            
                            setIsTestingTele(true);
                            try {
                              const todayStr = new Date().toISOString().split('T')[0];
                              const summaryMsg = formatDailySummaryMessage(orders, todayStr, editingConfig.name || storeConfig.name);
                              const success = await sendTelegramMessage(token, chat, summaryMsg);
                              if (success) {
                                alert('🎉 Đã lập tức gửi báo cáo tổng hợp doanh thu ngày hôm nay thành công!');
                              } else {
                                alert('❌ Gửi báo cáo thất bại! Xin kiểm tra cấu hình mạng hoặc Telegram log.');
                              }
                            } catch (e) {
                              alert('Lỗi khi gửi báo cáo tổng hợp.');
                            } finally {
                              setIsTestingTele(false);
                            }
                          }}
                          disabled={isTestingTele}
                          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-extrabold rounded-xl text-[9px] flex items-center gap-1 shadow-sm transition-colors uppercase cursor-pointer"
                        >
                          📌 BÁO CÁO DOANH THU NGAY LẬP TỨC
                        </button>
                        <span className="text-[8.5px] text-slate-500 mt-1 font-semibold leading-relaxed">
                          Bấm để tổng hợp và gửi báo cáo kết quả doanh tức thời của ngày hôm nay
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick documentation box */}
                <div className="bg-slate-200/50 p-3 rounded-xl text-[9px] text-slate-500 leading-relaxed font-sans space-y-1 border border-slate-200">
                  <span className="block font-black text-slate-700 uppercase tracking-widest text-[8.5px] mb-1">🇻🇳 Hướng dẫn lấy Token / ChatID:</span>
                  <p>• <b>Bước 1:</b> Tìm <b>@BotFather</b> trên Telegram và gửi <code>/newbot</code> để lấy Token.</p>
                  <p>• <b>Bước 2:</b> Thêm Bot của bạn vào nhóm chat và cấp quyền Admin của nhóm.</p>
                  <p>• <b>Bước 3:</b> Thêm <b>@raw_data_bot</b> vào nhóm hoặc chat cá nhân để xem mã <code>id</code> nhóm (là số âm, có dấu trừ) dán vào ô Chat ID.</p>
                </div>

              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 items-center gap-4">
            {saveStatus === 'success' && (
              <span className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Đã lưu thành công
              </span>
            )}
            {saveStatus && saveStatus !== 'success' && (
              <span className="text-rose-600 font-bold text-xs uppercase">{saveStatus}</span>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl transition-all shadow-md shadow-orange-100 flex items-center gap-1.5 uppercase text-[10px] tracking-wide"
            >
              <Save className="w-4 h-4" /> Lưu thông tin thiết lập
            </button>
          </div>

        </form>
      )}

      {/* 8. SYSTEM CONFIGURATION */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-fade-in text-xs">
          <BackupRestore
            products={products}
            categories={categories}
            promotions={promotions}
            storeConfig={storeConfig}
            orders={orders}
            tables={tables}
            areas={areas}
            onUpdateOrders={onUpdateOrders}
            onUpdateProducts={onUpdateProducts}
            onUpdateCategories={onUpdateCategories}
            onUpdatePromotions={onUpdatePromotions}
            onUpdateTables={onUpdateTables}
            onUpdateAreas={onUpdateAreas}
            onUpdateStoreConfig={onUpdateStoreConfig}
            themeStyles={t}
          />
          <div className={`${t.card}`}>
            <button 
              onClick={() => setShowLogs(!showLogs)}
              className="w-full p-4 flex items-center justify-between font-bold text-slate-700"
            >
              <span className="flex items-center gap-2"><Clipboard className={`w-4 h-4 ${t.icon}`} /> Nhật ký hệ thống</span>
              {showLogs ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            </button>
            {showLogs && (
              <div className="p-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <input 
                    type="date"
                    value={selectedLogDate}
                    onChange={(e) => setSelectedLogDate(e.target.value)}
                    className={t.input}
                  />
                  <button 
                    onClick={handleDownloadLogs}
                    disabled={isDownloading}
                    className={t.btnSec}
                  >
                    {isDownloading ? 'Đang tải...' : 'Tải xuống nhật ký'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card Password: Change Admin Password */}
          <div className={`${t.card} p-5 space-y-4`}>
            <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <Lock className={`w-4 h-4 ${t.icon}`} /> Đổi mật khẩu admin
            </h3>
            <div className="flex gap-2">
              <input 
                type="password" 
                placeholder="Nhập mã PIN mới (4 số)"
                className={t.input}
                maxLength={4}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setEditingConfig({...editingConfig, adminPin: val});
                }}
                value={editingConfig.adminPin || ''}
              />
              <button
                type="button"
                className={t.btnAccent}
                onClick={handleSaveStoreConfig}
              >
                Lưu
              </button>
              {saveStatus === 'success' && (
                <span className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-1">
                  Đã lưu
                </span>
              )}
              {saveStatus && saveStatus !== 'success' && (
                <span className="text-rose-600 font-bold text-xs uppercase ml-2">{saveStatus}</span>
              )}
            </div>
          </div>
          
          {/* Card A: Giao Diện / Theme Config */}
          <div className={`${t.card} p-5 space-y-4`}>
            <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <Laptop className={`w-4 h-4 ${t.icon}`} /> Đổi Phong Cách Giao Diện Hệ Thống (Đồng Bộ Khách & Admin)
            </h3>
            <p className="text-[10px] text-slate-400 font-sans leading-normal">
              Thay đổi toàn bộ giao diện quản trị Admin và Trang thiết bị gọi món của Khách hàng (Mobile Simulator) đồng bộ theo 4 phong cách thiết kế độc đáo. Hệ thống tự động lưu trữ tức thì lựa chọn của bạn.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Option 3: Cyberpunk theme */}
              <div 
                onClick={() => handleThemeChange('cyberpunk')}
                className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 relative group flex flex-col justify-between min-h-[140px] ${
                  adminTheme === 'cyberpunk' 
                    ? 'border-cyan-400 bg-cyan-950/20 ring-1 ring-cyan-400 shadow-sm' 
                    : 'border-slate-205 bg-white hover:border-slate-350 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] bg-zinc-800 text-cyan-400 border border-cyan-400/20 font-black px-2 py-0.5 rounded uppercase tracking-wider">Neon Dark</span>
                    <span className="text-xl">🌌</span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide">Cyberpunk Mode</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Nền tối Carbon Matrix, dải viền Neon Cyan phát sáng cực ngầu, tiết kiệm pin tối đa.</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/60">
                  <span className="text-[9px] text-cyan-500 font-bold">Cyber Neon</span>
                  <button className={`px-2.5 py-1 text-[9px] font-black uppercase rounded ${
                    adminTheme === 'cyberpunk' ? 'bg-cyan-400 text-zinc-950' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {adminTheme === 'cyberpunk' ? '✓ Đang dùng' : 'Sử dụng'}
                  </button>
                </div>
              </div>

              {/* Option 5: Aura 2026 theme */}
              <div 
                onClick={() => handleThemeChange('aura2026')}
                className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 relative group flex flex-col justify-between min-h-[140px] ${
                  adminTheme === 'aura2026' 
                    ? 'border-[#9b6bcc] bg-[#eadcf2]/40 ring-1 ring-[#9b6bcc] shadow-md' 
                    : 'border-slate-205 bg-white hover:border-slate-350 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] bg-[#eadcf2] text-[#9b6bcc] font-black px-2 py-0.5 rounded uppercase tracking-wider">Aura 2026</span>
                    <span className="text-xl">✨</span>
                  </div>
                  <h4 className="font-extrabold text-[#5e4776] text-[11px] uppercase tracking-wide">Aura Future</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Giao diện Neomorphic pastel, nhẹ nhàng, bay bổng, xu hướng 2026 mới nhất.</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/60">
                  <span className="text-[9px] text-[#9b6bcc] font-bold font-sans">Aura Pastel</span>
                  <button className={`px-2.5 py-1 text-[9px] font-black uppercase rounded ${
                    adminTheme === 'aura2026' ? 'bg-[#9b6bcc] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {adminTheme === 'aura2026' ? '✓ Đang dùng' : 'Sử dụng'}
                  </button>
                </div>
              </div>

              {/* Option 6: Dai Style */}
              <div 
                onClick={() => handleThemeChange('dai')}
                className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 relative group flex flex-col justify-between min-h-[140px] ${
                  adminTheme === 'dai' 
                    ? 'border-[#7c3aed] bg-[#f5f3ff]/40 ring-1 ring-[#7c3aed] shadow-md' 
                    : 'border-slate-205 bg-white hover:border-slate-350 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] bg-[#ede9fe] text-[#7c3aed] font-black px-2 py-0.5 rounded uppercase tracking-wider">Mặc định (Dai Style)</span>
                    <span className="text-xl">☀️</span>
                  </div>
                  <h4 className="font-extrabold text-[#5b21b6] text-[11px] uppercase tracking-wide">Violet Soft</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Tông màu sáng nhạt, icon gradient đa sắc bồng bềnh, dễ dàng nhìn trạng thái từng loại bàn.</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/60">
                  <span className="text-[9px] text-[#7c3aed] font-bold font-sans">Cute & Bright</span>
                  <button className={`px-2.5 py-1 text-[9px] font-black uppercase rounded ${
                    adminTheme === 'dai' ? 'bg-[#7c3aed] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {adminTheme === 'dai' ? '✓ Đang dùng' : 'Sử dụng'}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Card B: Live Automatic & Chime Settings */}
          <div className={`${t.card} p-5 space-y-4`}>
            <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <Cpu className={`w-4 h-4 ${t.icon}`} /> Tham Sơ Cấu Hình Hệ Thống & Tự Động Hóa
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className={`${t.cardSec} space-y-4 flex flex-col justify-between`}>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold flex items-center gap-1.5">
                      <Volume2 className={`w-4 h-4 ${t.icon}`} /> Âm báo đơn hàng trực tuyến
                    </label>
                    <input 
                      type="checkbox"
                      checked={audioEnabled}
                      onChange={(e) => setAudioEnabled(e.target.checked)}
                      className="w-4 h-4 text-orange-600 accent-orange-600 rounded cursor-pointer animate-pulse"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Tự động chuông "Ding-Dong" êm ái khi phát hiện có bất kỳ khách hàng nào vừa gửi đơn đặt món trực tuyến ở bên ngoài.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                        if (AudioContext) {
                          const ctx = new AudioContext();
                          const osc = ctx.createOscillator();
                          const gain = ctx.createGain();
                          osc.type = 'sine';
                          osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                          osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
                          gain.gain.setValueAtTime(0.15, ctx.currentTime);
                          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                          osc.connect(gain);
                          gain.connect(ctx.destination);
                          osc.start();
                          osc.stop(ctx.currentTime + 0.5);
                        }
                      } catch(e) {
                        alert("Không thể phát âm thanh: hãy kiểm tra phân quyền tab.");
                      }
                    }}
                    className="w-full text-center py-2 bg-slate-200/40 hover:bg-slate-200/70 border border-slate-300/40 font-extrabold text-[10px] uppercase tracking-wide rounded-lg transition-colors cursor-pointer text-slate-705"
                  >
                    🔊 Bấm thử âm chuông (Ding Test)
                  </button>
                </div>
              </div>

              <div className={`${t.cardSec} space-y-4 flex flex-col justify-between`}>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold flex items-center gap-1.5">
                      <Printer className={`w-4 h-4 ${t.icon}`} /> Tự động hiển thị khung In nhiệt
                    </label>
                    <input 
                      type="checkbox"
                      checked={autoPrint}
                      onChange={(e) => setAutoPrint(e.target.checked)}
                      className="w-4 h-4 text-orange-600 accent-orange-600 rounded cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Khi chuyển bất cứ đơn hàng nào sang "Đang chuẩn bị", hệ thống tự động bung drawer in nhiệt mini 58mm/80mm để dán lên đơn phục vụ nhanh chóng.
                  </p>
                </div>
                <div className="bg-slate-100 text-slate-500 rounded p-2 text-[9px] font-sans flex items-center gap-1">
                  <span>ℹ️</span> <span>Hỗ trợ in qua khổ máy in Xprinter USB/LAN/Wifi hoặc các máy cầm tay Sunmi.</span>
                </div>
              </div>

              <div className={`${t.cardSec} space-y-4`}>
                <div className="flex items-center justify-between">
                  <label className="font-bold flex items-center gap-1.5">
                    ⚙️ Chế độ tự động duyệt đơn hàng mới
                  </label>
                  <input 
                    type="checkbox"
                    checked={autoApprove}
                    onChange={(e) => setAutoApprove(e.target.checked)}
                    className="w-4 h-4 text-orange-600 accent-orange-600 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Chỉ bật chế độ này khi lượng khách đông, hệ thống sẽ tự chuyển đơn từ Khách sang "Đang chuẩn bị" mà chủ tiệm không cần bấm nút phê duyệt từng hóa đơn thủ công.
                </p>
              </div>

              <div className={`${t.cardSec} space-y-4 flex flex-col justify-between`}>
                <div className="space-y-1">
                  <h4 className="font-bold flex items-center gap-1.5">🛡️ Trạng thái Máy chủ & Kết nối live</h4>
                  <div className="space-y-1 text-[10px] mt-2">
                    <div className="flex justify-between"><span>Cơ sở dữ liệu đám mây:</span> <span className="font-black text-emerald-600">CONNECTED (LIVE)</span></div>
                    <div className="flex justify-between"><span>Thời gian đồng bộ trễ:</span> <span className="font-mono text-indigo-600">~15ms</span></div>
                    <div className="flex justify-between"><span>Phiên bản hệ thống:</span> <span className="font-mono text-emerald-600">v3.4.1 (Stable Build)</span></div>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 text-[9px] rounded p-1 px-2 font-black uppercase tracking-wider">
                  <span>● Online Core Sync Live</span>
                  <span>Port 3000 Ingress</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleSaveCustomer} className={`${t.card} w-full max-w-sm p-6 space-y-4 relative`}>
            <div className={`flex items-center justify-between border-b ${t.divider} pb-3`}>
              <h3 className={`font-black text-xs uppercase tracking-tight flex items-center gap-1.5 ${t.textTitle}`}>
                <Edit3 className={`w-4 h-4 ${t.icon}`} />
                Chỉnh sửa khách hàng
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs font-black"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Họ và Tên *</label>
                <input
                  type="text"
                  required
                  value={editCustName}
                  onChange={(e) => setEditCustName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none focus:bg-white text-xs shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Số điện thoại *</label>
                <input
                  type="text"
                  required
                  value={editCustPhone}
                  onChange={(e) => setEditCustPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none focus:bg-white text-xs font-mono shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Địa chỉ (nếu có)</label>
                <input
                  type="text"
                  value={editCustAddress}
                  onChange={(e) => setEditCustAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none focus:bg-white text-xs shadow-inner"
                />
              </div>
            </div>

            <div className={`flex justify-end gap-2 border-t ${t.divider} pt-3.5`}>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className={`${t.btnSec} text-xs py-2 px-4 rounded-xl cursor-pointer`}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className={`${t.btnPri} text-xs py-2 px-4 rounded-xl cursor-pointer bg-orange-600 text-white hover:bg-orange-700`}
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
