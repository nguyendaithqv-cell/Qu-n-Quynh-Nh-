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
  Lock
} from 'lucide-react';
import { Product, Category, Order, OrderStatus, PaymentStatus, StoreConfig, Promotion, Customer, Table, Area } from '../types';
import ReportSection from './ReportSection';

interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  promotions: Promotion[];
  storeConfig: StoreConfig;
  orders: Order[];
  tables: Table[];
  areas: Area[];
  onUpdateOrders: (orders: Order[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdatePromotions: (promotions: Promotion[]) => void;
  onUpdateTables: (tables: Table[]) => void;
  onUpdateAreas: (areas: Area[]) => void;
  onUpdateStoreConfig: (config: StoreConfig) => void;
  onAddOrder: (order: Order) => Promise<void>;
  onLogout?: () => void;
  onBackToPicker?: () => void;
}

export default function AdminPanel({
  products,
  categories,
  promotions,
  storeConfig,
  orders,
  tables,
  areas,
  onUpdateOrders,
  onUpdateProducts,
  onUpdateCategories,
  onUpdatePromotions,
  onUpdateTables,
  onUpdateAreas,
  onUpdateStoreConfig,
  onAddOrder,
  onLogout,
  onBackToPicker
}: AdminPanelProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'categories' | 'tables' | 'promotions' | 'store' | 'customers' | 'report' | 'system' | 'staff'>('orders');
  const [productFilter, setProductFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [categoryIdFilter, setCategoryIdFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Staff management state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [newStaff, setNewStaff] = useState<any>({
    fullName: '',
    username: '',
    password: '',
    phone: '',
    birthYear: new Date().getFullYear() - 20,
    role: 'Nhân viên',
    avatar: '👤'
  });

  const openAddStaff = () => {
    setEditingStaffId(null);
    setNewStaff({
      fullName: '',
      username: '',
      password: '',
      phone: '',
      birthYear: new Date().getFullYear() - 20,
      role: 'Nhân viên',
      avatar: '👤'
    });
    setIsStaffModalOpen(true);
  };

  const openEditStaff = (staff: any) => {
    setEditingStaffId(staff.id);
    setNewStaff({ ...staff });
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = () => {
    const staffList = storeConfig.staff || [];
    const staffToSave = { ...newStaff };
    
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
    } else {
        // Add
        onUpdateStoreConfig({
            ...storeConfig,
            staff: [...staffList, { ...staffToSave, id: Date.now().toString() }]
        });
    }
    setIsStaffModalOpen(false);
  };

  // System Theme & Settings States
  const [adminTheme, setAdminTheme] = useState<'standard' | 'vista' | 'cyberpunk' | 'win11'>(
    () => storeConfig.theme || (localStorage.getItem('admin-panel-theme') as any) || 'standard'
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

  const handleThemeChange = (newTheme: 'standard' | 'vista' | 'cyberpunk' | 'win11') => {
    setAdminTheme(newTheme);
    onUpdateStoreConfig({
      ...storeConfig,
      theme: newTheme
    });
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
    isAvailable: true
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
      if (!acc[customerPhone]) {
        acc[customerPhone] = {
          phone: customerPhone,
          firstName: customerName,
          totalOrders: 0,
          totalSpent: 0,
          address: customerAddress,
          debtOrders: 0,
          debtAmount: 0,
          notes: new Set([customerName])
        };
      }
      const cust = acc[customerPhone];
      cust.totalOrders++;
      cust.totalSpent += totalAmount;
      if (paymentStatus === 'debt') {
        cust.debtOrders++;
        cust.debtAmount += totalAmount;
      }
      cust.notes.add(customerName);
      return acc;
    }, {} as any);

    return Object.values(custMap).map((c: any) => ({
      ...c,
      notes: Array.from(c.notes)
    }));
  }, [orders]);

  // Order Operations
  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
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

  const handleConfirmDeleteOrder = () => {
    if (orderToDelete) {
      const updated = orders.filter(o => o.id !== orderToDelete.id);
      onUpdateOrders(updated);
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

  const handleSaveOrderEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (editingOrder.items.length === 0) {
      alert("Đơn hàng không thể để trống món ăn! Vui lòng chọn món ăn cho khách.");
      return;
    }
    const updated = orders.map(o => o.id === editingOrder.id ? editingOrder : o);
    onUpdateOrders(updated);
    setEditingOrder(null);
  };

  // Product Operations
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim()) return;

    const prodToAdd: Product = {
      ...newProduct,
      id: `prod-${Date.now()}`
    };

    onUpdateProducts([...products, prodToAdd]);
    setIsAddingProduct(false);
    setNewProduct({
      name: '',
      categoryId: categories[0]?.id || 'pho',
      price: 30000,
      image: '🍜',
      description: '',
      isAvailable: true
    });
  };

  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) return;

    const updated = products.map(p => p.id === editingProduct.id ? editingProduct : p);
    onUpdateProducts(updated);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (prod) setProductToDelete(prod);
  };

  const handleConfirmDeleteProduct = () => {
    if (productToDelete) {
      const updated = products.filter(p => p.id !== productToDelete.id);
      onUpdateProducts(updated);
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
  const handleAddCategorySubmit = (e: React.FormEvent) => {
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
    setIsAddingCategory(false);
    setNewCategory({ name: '', icon: '🥡', type: 'food' });
  };

  const handleEditCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    const updated = categories.map(c => c.id === editingCategory.id ? editingCategory : c);
    onUpdateCategories(updated);
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

  const handleConfirmDeleteCategory = () => {
    if (categoryToDelete) {
      const updated = categories.filter(c => c.id !== categoryToDelete.id);
      onUpdateCategories(updated);
      setCategoryToDelete(null);
    }
  };

  // Promotion Operations
  const handleAddPromotionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.code.trim()) return;

    const promoToAdd: Promotion = {
      ...newPromo,
      id: `promo-${Date.now()}`,
      code: newPromo.code.trim().toUpperCase()
    };

    onUpdatePromotions([...promotions, promoToAdd]);
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

      const updatedCategories = [...categories];
      const updatedProducts = [...products];

      data.forEach((row) => {
        const catName = row['Danh mục'] || 'Chưa phân loại';
        let category = updatedCategories.find(c => c.name === catName);
        if (!category) {
          const cleanId = catName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
          category = {
            id: cleanId || `cat-${Date.now()}-${Math.random()}`,
            name: catName,
            icon: '🥡',
            sortOrder: updatedCategories.length
          };
          updatedCategories.push(category);
        }

        const prodName = row['Tên món'];
        let product = updatedProducts.find(p => p.name === prodName);
        if (product) {
          product.price = Number(row['Giá (VND)']);
          product.description = row['Mô tả'] || '';
          product.categoryId = category!.id;
          product.isAvailable = row['Trạng thái'] === 'Sẵn sàng';
          product.image = row['Emoji'] || '🍜';
        } else {
          updatedProducts.push({
            id: `prod-${Date.now()}-${Math.random()}`,
            name: prodName,
            price: Number(row['Giá (VND)']),
            description: row['Mô tả'] || '',
            categoryId: category!.id,
            isAvailable: row['Trạng thái'] === 'Sẵn sàng',
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
    const data = products.map(product => ({
      'Tên món': product.name,
      'Danh mục': categories.find(c => c.id === product.categoryId)?.name || product.categoryId,
      'Giá (VND)': product.price,
      'Mô tả': product.description,
      'Trạng thái': product.isAvailable ? 'Sẵn sàng' : 'Hết món',
      'Emoji': product.image
    }));
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
  const handleSaveStoreConfig = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strip large avatars before saving
    const cleanedConfig = {
      ...editingConfig,
      staff: editingConfig.staff?.map(s => ({
        ...s,
        avatar: (s.avatar && s.avatar.length > 5000) ? '👤' : s.avatar
      }))
    };
    
    onUpdateStoreConfig(cleanedConfig);
    alert('Đã cập nhật thông tin cài đặt cửa hàng thành công!');
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
    standard: {
      pageWrapper: 'flex-1 overflow-y-auto px-6 py-6 font-sans text-slate-800 bg-slate-50/50',
      titleBar: 'text-slate-800 border-b border-slate-100 pb-3',
      textClass: 'text-slate-800 font-sans',
      textMuted: 'text-[#828282] font-semibold',
      textTitle: 'text-slate-900 font-extrabold pb-1 uppercase tracking-wider',
      card: 'bg-white border border-slate-200/60 shadow-sm rounded-2xl hover:shadow-md transition-all duration-200',
      cardSec: 'bg-slate-50 border border-slate-200 rounded-2xl p-4',
      btnAccent: 'bg-orange-600 hover:bg-orange-700 text-white font-extrabold pb-2 pt-2 px-4 rounded-xl shadow-sm transition-all uppercase tracking-wider',
      btnSec: 'bg-white hover:bg-slate-50 text-slate-705 border border-slate-200 font-bold pb-2 pt-2 px-4 rounded-xl shadow-xs transition-all uppercase tracking-wide',
      tabActive: 'bg-orange-600 text-white shadow-sm',
      tabInactive: 'text-slate-600 hover:bg-slate-100/50',
      tabContainer: 'flex border-b border-slate-200 mb-6 bg-white rounded-xl p-1 shadow-xs font-semibold text-xs overflow-x-auto no-scrollbar',
      tableHeader: 'bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-100',
      tableHeaderCell: 'hover:bg-slate-100 text-slate-505 cursor-pointer p-3',
      tableRow: 'hover:bg-slate-50/50 even:bg-slate-50/45 odd:bg-white transition-all',
      tableCellBorder: 'border-slate-100 border-r',
      badge: 'bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-md text-[10px]',
      input: 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-850 outline-none focus:bg-white focus:border-orange-500',
      icon: 'text-orange-605',
      divider: 'border-slate-100',
      titleSpin: 'text-orange-600 animate-spin-slow',
      panelTitle: storeConfig.name ? `Trang Quản Lý - ${storeConfig.name}` : 'Trang Quản Lý',
      subText: 'Thống số tổng quan'
    },
    vista: {
      pageWrapper: 'flex-1 overflow-y-auto px-6 py-6 font-sans text-slate-800 bg-gradient-to-br from-sky-100/30 via-slate-150 to-emerald-100/30 relative overflow-x-hidden',
      titleBar: 'text-slate-900 border-b border-white/40 pb-4 relative before:absolute before:inset-x-0 before:-top-2 before:h-1 before:bg-gradient-to-r before:from-sky-400 before:to-emerald-400',
      textClass: 'text-slate-800 font-sans',
      textMuted: 'text-slate-500 font-black uppercase tracking-wider text-[10px]',
      textTitle: 'text-slate-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.85)] font-black uppercase tracking-wide',
      card: 'bg-white/70 backdrop-blur-md border border-white/50 shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.7)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-2xl overflow-hidden',
      cardSec: 'bg-slate-200/40 backdrop-blur-sm border border-white/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] rounded-2xl p-4',
      btnAccent: 'bg-gradient-to-b from-sky-450 to-sky-700 hover:to-sky-650 text-white hover:shadow-[0_4px_12px_rgba(3,105,161,0.3)] border border-sky-600 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[50%] before:bg-white/20 font-black pb-2 pt-2 px-4 rounded-xl shadow-md transition-all uppercase tracking-wider',
      btnSec: 'bg-gradient-to-b from-white to-slate-100/90 hover:from-white hover:to-slate-50 text-slate-705 border border-slate-250 hover:border-slate-350 shadow-sm relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[50%] before:bg-white/30 font-bold pb-2 pt-2 px-4 rounded-xl transition-all uppercase tracking-wide',
      tabActive: 'bg-gradient-to-b from-sky-400 via-sky-600 to-sky-700 text-white shadow-[0_2px_8px_rgba(3,105,161,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] border border-sky-650 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[50%] before:bg-white/35',
      tabInactive: 'bg-gradient-to-b from-white to-slate-100/85 hover:from-white hover:to-slate-50 text-slate-650 hover:text-slate-850 border border-slate-200/80 hover:border-slate-300 shadow-xs active:bg-slate-200',
      tabContainer: 'flex border-b border-white/40 mb-6 bg-white/45 backdrop-blur-md border border-white/45 p-1 rounded-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] font-semibold text-xs overflow-x-auto no-scrollbar',
      tableHeader: 'bg-gradient-to-b from-slate-100 to-slate-200 text-slate-750 font-extrabold uppercase border-b border-slate-300 relative before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-white/80',
      tableHeaderCell: 'hover:bg-slate-300 text-slate-750 cursor-pointer p-3.5 border-r border-slate-200',
      tableRow: 'hover:bg-sky-100/50 even:bg-slate-100/25 odd:bg-white/45 transition-all backdrop-blur-xs',
      tableCellBorder: 'border-slate-200 border-r',
      badge: 'bg-white/60 backdrop-blur-xs border border-white/50 text-slate-600 font-mono text-[10px] uppercase font-black px-2 py-0.5 rounded-md inline-block',
      input: 'bg-white/80 border border-slate-250 hover:border-slate-350 focus:border-sky-500 rounded-xl px-3 py-2 font-semibold text-slate-850 outline-none shadow-inner transition-colors focus:bg-white',
      icon: 'text-sky-600 drop-shadow-[0_0.5px_0.5px_rgba(255,255,255,0.85)]',
      divider: 'border-slate-200/80',
      titleSpin: 'text-sky-600 animate-pulse',
      panelTitle: `Trang Quản Lý Aero - ${storeConfig.name || 'Cửa Hàng'}`,
      subText: 'Thống số tổng quan'
    },
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
    }
  };

  const t = themeStyles[adminTheme];

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

      {/* Numerical Stats row */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs uppercase font-black text-slate-500 tracking-wider">Thông số tổng quan</h3>
            <select
              value={masterFilters.timeRange}
              onChange={(e) => setMasterFilters(prev => ({ ...prev, timeRange: e.target.value as TimeRange }))}
              className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none cursor-pointer shadow-sm hover:border-slate-300 transition-colors"
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
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* 1. Doanh thu */}
            <div className={`${t.card} p-4 sm:p-6 relative group overflow-hidden`}>
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className={`w-12 h-12 ${t.icon}`} />
              </div>
              <div className="relative z-10">
                <p className={`${t.textMuted} mb-1 sm:mb-2`}>Doanh thu</p>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className={`text-xl sm:text-2xl font-black ${t.textTitle} font-mono tracking-tighter`}>
                    {stats.totalRevenue.toLocaleString('vi-VN')}
                  </span>
                  <span className={`text-xs font-bold ${t.textMuted}`}>đ</span>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100">Dòng tiền thực</span>
              </div>
            </div>

            {/* 2. Tổng đơn */}
            <div className={`${t.card} p-4 sm:p-6 relative group overflow-hidden`}>
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShoppingBag className={`w-12 h-12 ${t.icon}`} />
              </div>
              <div className="relative z-10">
                <p className={`${t.textMuted} mb-1 sm:mb-2`}>Tổng đơn hđ</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl sm:text-2xl font-black text-orange-600 font-mono tracking-tighter`}>
                    {stats.totalFilteredOrdersCount}
                  </span>
                  <span className={`text-xs font-bold ${t.textMuted}`}>Đơn</span>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span className="text-[9px] font-black uppercase text-orange-700 tracking-widest bg-orange-50/50 px-2 py-0.5 rounded border border-orange-100">Kinh doanh</span>
              </div>
            </div>

            {/* 3. Mới chờ duyệt */}
            <div className={`${t.card} p-4 sm:p-6 relative group overflow-hidden`}>
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock className={`w-12 h-12 ${t.icon}`} />
              </div>
              <div className="relative z-10">
                <p className={`${t.textMuted} mb-1 sm:mb-2`}>Đang chờ duyệt</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl sm:text-2xl font-black ${t.textTitle} font-mono tracking-tighter`}>
                    {stats.newCount}
                  </span>
                  <span className={`text-xs font-bold ${t.textMuted}`}>Đơn</span>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
                <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest bg-amber-50/50 px-2 py-0.5 rounded border border-amber-100">Cần xử lý</span>
              </div>
            </div>

            {/* 4. Đang chuẩn bị */}
            <div className={`${t.card} p-4 sm:p-6 relative group overflow-hidden`}>
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Utensils className={`w-12 h-12 ${t.icon}`} />
              </div>
              <div className="relative z-10">
                <p className={`${t.textMuted} mb-1 sm:mb-2`}>Đang chế biến</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl sm:text-2xl font-black ${t.textTitle} font-mono tracking-tighter`}>
                    {stats.preparingCount}
                  </span>
                  <span className={`text-xs font-bold ${t.textMuted}`}>Món</span>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                <span className="text-[9px] font-black uppercase text-blue-700 tracking-widest bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100">Tại bếp</span>
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
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'system' ? t.tabActive : t.tabInactive
          }`}
        >
          <Cpu className="w-4 h-4 animate-pulse" /> Hệ Thống
        </button>
      </div>

      {/* Dynamic Content Views */}

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
                          {staff.avatar ? <img src={staff.avatar} alt={staff.fullName} className="w-full h-full object-cover" /> : staff.avatar || '👤'}
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
             <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
                   <h3 className="font-black text-lg">{editingStaffId ? 'Sửa thông tin' : 'Thêm Nhân viên'}</h3>
                   
                   <div className="flex justify-center">
                     <label className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-slate-300">
                      {newStaff.avatar ? <img src={newStaff.avatar} alt="Avatar" className="w-full h-full object-cover"/> : <span className="text-2xl">📷</span>}
                      <input type="file" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setNewStaff({...newStaff, avatar: reader.result as string});
                          reader.readAsDataURL(file);
                        }
                      }} />
                     </label>
                   </div>
                   
                   <input type="text" placeholder="Họ tên" className={t.input} value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} />
                   <input type="text" placeholder="Tên đăng nhập" className={t.input} value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} />
                   <input type="password" placeholder="Mật khẩu" className={t.input} value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} />
                   <input type="text" placeholder="SĐT" className={t.input} value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} />
                   <input type="number" placeholder="Năm sinh" className={t.input} value={newStaff.birthYear} onChange={e => setNewStaff({...newStaff, birthYear: parseInt(e.target.value)})} />
                   <select className={t.input} value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                      {storeConfig.roles?.map(r => <option key={r} value={r}>{r}</option>) || <>
                        <option value="Nhân viên">Nhân viên</option>
                        <option value="Quản lý">Quản lý</option>
                      </>}
                   </select>

                   <div className="flex gap-2 justify-end">
                     <button onClick={() => setIsStaffModalOpen(false)} className={t.btnSec}>Hủy</button>
                     <button onClick={handleSaveStaff} className={t.btnAccent}>Lưu</button>
                   </div>
                </div>
             </div>
          )}

          {/* Role Management Section */}
          <div className={`${t.card} p-5 space-y-4`}>
            <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              Quản lý chức vụ
            </h3>
            <div className="flex gap-2 flex-wrap">
              {storeConfig.roles?.map(role => (
                <span key={role} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-bold">
                  {role}
                  <button onClick={() => onUpdateStoreConfig({...storeConfig, roles: storeConfig.roles?.filter(r => r !== role)})}>×</button>
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
                          
                          {/* Code/Date */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-bold text-orange-600 block text-xs font-mono tracking-wider">{order.billCode}</span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                               {new Date(order.createdAt).toLocaleString('vi-VN')}
                            </span>
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
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá bán (VND)*</label>
                        <input
                          type="text"
                          required
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
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá vốn (VND)*</label>
                        <input
                          type="text"
                          required
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
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá bán*</label>
                        <input
                          type="text"
                          required
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
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá vốn*</label>
                        <input
                          type="text"
                          required
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in text-xs">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Danh sách khách hàng</h2>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-sans">
                {customers.map(cust => (
                  <tr key={cust.phone} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-orange-600 block text-xs font-mono tracking-wider">{cust.phone}</span>
                      <span className="text-[10px] block">{cust.firstName}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[10px] text-slate-500">{cust.address}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">{cust.totalOrders}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">{cust.totalSpent.toLocaleString('vi-VN')}đ</td>
                    <td className="px-4 py-3.5 text-right text-rose-600 font-bold font-mono">
                      {cust.debtOrders > 0 ? `${cust.debtOrders} đơn / ${cust.debtAmount.toLocaleString('vi-VN')}đ` : '0đ'}
                    </td>
                    <td className="px-4 py-3.5 text-[10px] text-slate-500 italic">{cust.notes.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

          <div className="flex justify-end pt-3 border-t border-slate-100">
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
              
              {/* Option 1: Standard theme */}
              <div 
                onClick={() => handleThemeChange('standard')}
                className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 relative group flex flex-col justify-between min-h-[140px] ${
                  adminTheme === 'standard' 
                    ? 'border-orange-500 bg-orange-50/20 ring-1 ring-orange-500 shadow-sm' 
                    : 'border-slate-205 bg-white hover:border-slate-350 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded uppercase tracking-wider">Mặc định</span>
                    <span className="text-xl">☀️</span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide">Classic Standard</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Nền sáng sang trọng, cam ấm áp tươi tắn, độ tương phản cao, tương thích hoàn hảo mọi thiết bị.</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/60">
                  <span className="text-[9px] text-orange-600 font-bold">Classic Cam</span>
                  <button className={`px-2.5 py-1 text-[9px] font-black uppercase rounded ${
                    adminTheme === 'standard' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {adminTheme === 'standard' ? '✓ Đang dùng' : 'Sử dụng'}
                  </button>
                </div>
              </div>

              {/* Option 2: Vista theme */}
              <div 
                onClick={() => handleThemeChange('vista')}
                className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 relative group flex flex-col justify-between min-h-[140px] ${
                  adminTheme === 'vista' 
                    ? 'border-sky-500 bg-sky-50/25 ring-1 ring-sky-500 shadow-sm' 
                    : 'border-slate-205 bg-white hover:border-slate-350 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] bg-sky-100 text-sky-700 font-black px-2 py-0.5 rounded uppercase tracking-wider">Aero Glass</span>
                    <span className="text-xl">💿</span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide">Windows Vista Style</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Hiệu ứng kính mờ Glassmorphic, dải ngọc bích đổi màu bóng bẩy, hoài niệm sang trọng.</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/60">
                  <span className="text-[9px] text-sky-600 font-bold">Kính pha lê</span>
                  <button className={`px-2.5 py-1 text-[9px] font-black uppercase rounded ${
                    adminTheme === 'vista' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {adminTheme === 'vista' ? '✓ Đang dùng' : 'Sử dụng'}
                  </button>
                </div>
              </div>

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

              {/* Option 4: Windows 11 theme */}
              <div 
                onClick={() => handleThemeChange('win11')}
                className={`border rounded-xl p-4 cursor-pointer transition-all duration-300 relative group flex flex-col justify-between min-h-[140px] ${
                  adminTheme === 'win11' 
                    ? 'border-[#0078d4] bg-[#0078d4]/10 ring-1 ring-[#0078d4] shadow-sm' 
                    : 'border-slate-205 bg-white hover:border-slate-350 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] bg-sky-100 text-[#0078d4] font-black px-2 py-0.5 rounded uppercase tracking-wider">Fluent Design</span>
                    <span className="text-xl">🪟</span>
                  </div>
                  <h4 className="font-extrabold text-[#0078d4] text-[11px] uppercase tracking-wide">Windows 11 Style</h4>
                  <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">Giao diện Fluent Mica thanh nhã, gam màu xanh hy vọng của Microsoft, bo góc mềm mại, hiển thị trực quan.</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/60">
                  <span className="text-[9px] text-[#0078d4] font-bold font-sans">Mica Xanh</span>
                  <button className={`px-2.5 py-1 text-[9px] font-black uppercase rounded ${
                    adminTheme === 'win11' ? 'bg-[#0078d4] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {adminTheme === 'win11' ? '✓ Đang dùng' : 'Sử dụng'}
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

    </div>
  );
}
