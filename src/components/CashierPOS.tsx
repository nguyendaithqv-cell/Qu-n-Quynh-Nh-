import React, { useState, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { 
  Utensils, 
  ChevronLeft,
  ChevronRight, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  Calculator, 
  Printer, 
  ArrowLeftRight, 
  Combine, 
  Check, 
  X, 
  Percent, 
  Coins, 
  QrCode, 
  BookOpen, 
  Sparkles, 
  Clock, 
  Smartphone, 
  User, 
  FileText,
  DollarSign,
  Undo,
  Image as FileImage,
  Download,
  MapPin
} from 'lucide-react';
import { Product, Category, Order, OrderItem, OrderStatus, PaymentStatus, StoreConfig, Promotion, Table, Area } from '../types';
import ReportSection from './ReportSection';
import { getVietQrBankId } from '../utils';

interface CashierPOSProps {
  products: Product[];
  categories: Category[];
  promotions: Promotion[];
  storeConfig: StoreConfig;
  orders: Order[];
  tables: Table[];
  areas: Area[];
  onUpdateTables: (tables: Table[]) => void;
  onUpdateOrders: (orders: Order[]) => void;
  onAddOrder: (order: Order) => Promise<void>;
  t: any; // Theme variables from AdminPanel
  adminTheme: 'standard' | 'vista' | 'cyberpunk' | 'win11';
  isMobileViewport?: boolean;
}

export default function CashierPOS({
  products,
  categories,
  promotions,
  storeConfig,
  orders,
  tables,
  areas,
  onUpdateTables,
  onUpdateOrders,
  onAddOrder,
  t,
  adminTheme,
  isMobileViewport = false
}: CashierPOSProps) {
  // Navigation / Filter states
  const [selectedTable, setSelectedTable] = useState<string>('Table_1');
  const [tableFilter, setTableFilter] = useState<'all' | 'occupied' | 'empty'>('all');
  const [areaFilterId, setAreaFilterId] = useState<string>('all');
  const [showMobileDetail, setShowMobileDetail] = useState<boolean>(false);
  
  // POS Ordering UI States
  const [searchMenuQuery, setSearchMenuQuery] = useState('');
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('all');
  
  // Active temporary POS items logic (when adding/editing order)
  const [showMenuMode, setShowMenuMode] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [posCart, setPosCart] = useState<OrderItem[]>([]);
  const [itemToDelete, setItemToDelete] = useState<OrderItem | null>(null);
  const [posCustomerName, setPosCustomerName] = useState('Khách vãng lai');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posNote, setPosNote] = useState('');

  // Transfer / Merge states
  const [transferTargetTableId, setTransferTargetTableId] = useState<string>('');
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [mergeTargetTableId, setMergeTargetTableId] = useState<string>('');
  const [showMergeModal, setShowMergeModal] = useState<boolean>(false);

  // Payment popup state
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedPromoCode, setSelectedPromoCode] = useState<string>('');
  const [customDiscountAmt, setCustomDiscountAmt] = useState<number>(0);
  const [payingMethod, setPayingMethod] = useState<'cod' | 'banking'>('cod');
  const [customerPaidCash, setCustomerPaidCash] = useState<string>('');
  const [isPayAsDebt, setIsPayAsDebt] = useState<boolean>(false);
  const [debtName, setDebtName] = useState<string>('');
  const [debtPhone, setDebtPhone] = useState<string>('');
  const [debtNote, setDebtNote] = useState<string>('');
  
  // Customer autocomplete/suggestions
  const [activeSuggestionField, setActiveSuggestionField] = useState<'pos_name' | 'pos_phone' | 'debt_name' | 'debt_phone' | null>(null);

  const uniqueCustomers = useMemo(() => {
    const customersMap = new Map<string, { name: string; phone: string }>();
    orders.forEach(order => {
      const name = (order.customerName || '').trim();
      const phone = (order.customerPhone || '').trim().replace(/\s+/g, '');
      if (phone && phone !== '0900000000' && name) {
        const lowerName = name.toLowerCase();
        if (
          !lowerName.includes('khách vãng lai') && 
          !lowerName.includes('khach vang lai') && 
          !lowerName.match(/^(bàn|ban|b\d+|t\d+)\s*\d*$/) &&
          !name.match(/^N\d+$/)
        ) {
          customersMap.set(phone, { name, phone });
        }
      }
    });
    return Array.from(customersMap.values());
  }, [orders]);

  // Autocomplete suggestions filtered lists
  const posNameSuggestions = useMemo(() => {
    if (!posCustomerName || posCustomerName.trim() === '' || posCustomerName === 'Khách vãng lai') return [];
    const term = posCustomerName.toLowerCase().trim();
    return uniqueCustomers.filter(c => 
      c.name.toLowerCase().includes(term) || c.phone.includes(term)
    ).slice(0, 5);
  }, [posCustomerName, uniqueCustomers]);

  const posPhoneSuggestions = useMemo(() => {
    if (!posCustomerPhone || posCustomerPhone.trim() === '') return [];
    const term = posCustomerPhone.trim().replace(/\s+/g, '');
    return uniqueCustomers.filter(c => 
      c.phone.includes(term) || c.name.toLowerCase().includes(term.toLowerCase())
    ).slice(0, 5);
  }, [posCustomerPhone, uniqueCustomers]);

  const debtNameSuggestions = useMemo(() => {
    if (!debtName || debtName.trim() === '') return [];
    const term = debtName.toLowerCase().trim();
    return uniqueCustomers.filter(c => 
      c.name.toLowerCase().includes(term) || c.phone.includes(term)
    ).slice(0, 5);
  }, [debtName, uniqueCustomers]);

  const debtPhoneSuggestions = useMemo(() => {
    if (!debtPhone || debtPhone.trim() === '') return [];
    const term = debtPhone.trim().replace(/\s+/g, '');
    return uniqueCustomers.filter(c => 
      c.phone.includes(term) || c.name.toLowerCase().includes(term.toLowerCase())
    ).slice(0, 5);
  }, [debtPhone, uniqueCustomers]);

  // Receipt Printing layout state
  const [printBillData, setPrintBillData] = useState<Order | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  // Standardize Table Address lookup
  const getTableOfOrder = (order: Order): string => {
    if (order.tableId) return order.tableId;

    const addr = (order.customerAddress || '').trim().toLowerCase();
    const name = (order.customerName || '').trim().toLowerCase();

    // Check if customerAddress matches any table name in our list
    for (const tbl of tables) {
      const tblLower = tbl.name.toLowerCase();
      if (addr === tblLower || name === tblLower || addr.startsWith(tblLower + ' ') || addr.endsWith(' ' + tblLower)) {
        return tbl.id;
      }
    }
    // Check key patterns inside table id or address
    if (addr.includes('bàn 10') || name.includes('bàn 10')) return 'Table_10';
    if (addr.includes('bàn 11') || name.includes('bàn 11')) return 'Table_11';
    if (addr.includes('bàn 12') || name.includes('bàn 12')) return 'Table_12';
    if (addr.includes('bàn 13') || name.includes('bàn 13')) return 'Table_13';
    if (addr.includes('bàn 14') || name.includes('bàn 14')) return 'Table_14';
    if (addr.includes('bàn 1') || name.includes('bàn 1')) return 'Table_1';
    if (addr.includes('bàn 2') || name.includes('bàn 2')) return 'Table_2';
    if (addr.includes('bàn 3') || name.includes('bàn 3')) return 'Table_3';
    if (addr.includes('bàn 4') || name.includes('bàn 4')) return 'Table_4';
    if (addr.includes('bàn 5') || name.includes('bàn 5')) return 'Table_5';
    if (addr.includes('bàn 6') || name.includes('bàn 6')) return 'Table_6';
    if (addr.includes('bàn 7') || name.includes('bàn 7')) return 'Table_7';
    if (addr.includes('bàn 8') || name.includes('bàn 8')) return 'Table_8';
    if (addr.includes('bàn 9') || name.includes('bàn 9')) return 'Table_9';
    if (addr.includes('mang về') || name.includes('mang về') || addr.includes('takeaway') || name.includes('takeaway')) {
      return 'Takeaway';
    }
    return '';
  };

  // Derive Table-Orders mapping (finding active non-completed, non-completed orders)
  const activeOrdersByTable = useMemo(() => {
    const mapping: Record<string, Order> = {};
    const uncompletedOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    
    uncompletedOrders.forEach(order => {
      const tableId = getTableOfOrder(order);
      if (tableId) {
        // Tie to first found active order for this table
        if (!mapping[tableId] || new Date(order.createdAt) > new Date(mapping[tableId].createdAt)) {
          mapping[tableId] = order;
        }
      }
    });
    return mapping;
  }, [orders]);

  // Count active virtual orders (SHIP and BOOKING)
  const shipOrdersCount = useMemo(() => {
    return orders.filter(o => o.tableId === 'SHIP' && o.status !== 'completed' && o.status !== 'cancelled').length;
  }, [orders]);

  const bookingOrdersCount = useMemo(() => {
    return orders.filter(o => o.tableId === 'BOOKING' && o.status !== 'completed' && o.status !== 'cancelled').length;
  }, [orders]);

  // Include a dynamic virtual area for online/delivery tracking
  const cashierAreas = useMemo(() => {
    return [...areas, { id: 'virtual_online', name: '📱 Trực Tuyến' }];
  }, [areas]);

  // Derived current occupied status including virtual tables SHIP and BOOKING
  const tablesWithDetails = useMemo(() => {
    // Normal physical tables
    const list = tables.map(tbl => {
      const activeOrder = activeOrdersByTable[tbl.id];
      return {
        ...tbl,
        isOccupied: !!activeOrder,
        activeOrder: activeOrder || null,
      };
    });

    // Check if there are active orders for virtual SHIP and BOOKING tables
    const activeShipOrders = orders.filter(o => o.tableId === 'SHIP' && o.status !== 'completed' && o.status !== 'cancelled');
    const activeBookingOrders = orders.filter(o => o.tableId === 'BOOKING' && o.status !== 'completed' && o.status !== 'cancelled');

    // Sort newer orders first for placeholder activeOrder assignment
    const sortedShipOrders = [...activeShipOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const sortedBookingOrders = [...activeBookingOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const virtualTables = [
      {
        id: 'SHIP',
        name: '🚀 ĐƠN SHIP',
        status: (activeShipOrders.length > 0 ? 'occupied' : 'available') as 'occupied' | 'available' | 'reserved',
        isOccupied: activeShipOrders.length > 0,
        activeOrder: sortedShipOrders[0] || null,
        areaId: 'virtual_online',
        capacity: 0,
        sortOrder: 1000,
      },
      {
        id: 'BOOKING',
        name: '📅 ĐẶT TRƯỚC',
        status: (activeBookingOrders.length > 0 ? 'occupied' : 'available') as 'occupied' | 'available' | 'reserved',
        isOccupied: activeBookingOrders.length > 0,
        activeOrder: sortedBookingOrders[0] || null,
        areaId: 'virtual_online',
        capacity: 0,
        sortOrder: 1001,
      }
    ];

    return [...list, ...virtualTables];
  }, [activeOrdersByTable, tables, orders]);

  // Handle setting table selection & syncing cart
  const currentSelectedTableDetail = useMemo(() => {
    return tablesWithDetails.find(t => t.id === selectedTable);
  }, [tablesWithDetails, selectedTable]);

  // States to manage multiple concurrent billing order queues (e.g. SHIP / BOOKING)
  const [selectedSubOrderId, setSelectedSubOrderId] = useState<string | null>(null);
  const queueScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollQueue = (direction: 'left' | 'right') => {
    if (queueScrollRef.current) {
      const scrollAmt = direction === 'left' ? -180 : 180;
      queueScrollRef.current.scrollBy({ left: scrollAmt, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    setSelectedSubOrderId(null);
  }, [selectedTable]);

  // Get all active orders for the currently selected table
  const activeOrdersForSelectedTable = useMemo(() => {
    if (!selectedTable) return [];
    
    // For SHIP or BOOKING, we want all non-completed, non-cancelled orders for that table
    if (selectedTable === 'SHIP' || selectedTable === 'BOOKING') {
      return orders.filter(o => 
        o.tableId === selectedTable && 
        o.status !== 'completed' && 
        o.status !== 'cancelled'
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    // For normal tables, get all active qualifying orders
    return orders.filter(o => 
      getTableOfOrder(o) === selectedTable && 
      o.status !== 'completed' && 
      o.status !== 'cancelled'
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedTable, orders]);

  const currentActiveOrder = useMemo(() => {
    if (activeOrdersForSelectedTable.length === 0) return null;
    if (selectedSubOrderId) {
      const match = activeOrdersForSelectedTable.find(o => o.id === selectedSubOrderId);
      if (match) return match;
    }
    return activeOrdersForSelectedTable[0];
  }, [activeOrdersForSelectedTable, selectedSubOrderId]);

  // Load selected table status to ordering forms
  useEffect(() => {
    if (currentActiveOrder) {
      const ord = currentActiveOrder;
      setPosCart(ord.items || []);
      setPosCustomerName(ord.customerName || 'Khách ở bàn');
      setPosCustomerPhone(ord.customerPhone || '');
      setPosNote(ord.note || '');
    } else {
      setPosCart([]);
      let tblName = 'Khách vãng lai';
      if (selectedTable === 'SHIP') {
        tblName = 'Đơn ship mới';
      } else if (selectedTable === 'BOOKING') {
        tblName = 'Đặt bàn trước mới';
      } else {
        tblName = tables.find(t => t.id === selectedTable)?.name || 'Khách vãng lai';
      }
      setPosCustomerName(tblName);
      setPosCustomerPhone('');
      setPosNote('');
    }
    setShowMenuMode(false);
    setHasChanges(false);
  }, [selectedTable, currentActiveOrder]);

  // Save POS order (Updates existing active or places new table order)
  const handleSavePOSOrder = async () => {
    if (posCart.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm vào đơn hàng!');
      return;
    }

    const subTotal = posCart.reduce((sum, item) => sum + item.quantity * item.priceOnOrder, 0);
    const discountAmount = 0; // Handled at final billing/payment checkout
    const totalAmount = subTotal - discountAmount;
    
    let tblName = 'Bàn';
    if (selectedTable === 'SHIP') {
      tblName = '🚀 ĐƠN SHIP';
    } else if (selectedTable === 'BOOKING') {
      tblName = '📅 ĐẶT TRƯỚC';
    } else {
      tblName = tables.find(t => t.id === selectedTable)?.name || 'Bàn';
    }

    // If there is already an active order, update its items. Else, create new.
    if (currentActiveOrder) {
      const activeOrd = currentActiveOrder;
      const updatedOrder: Order = {
        ...activeOrd,
        items: posCart,
        subTotal,
        totalAmount,
        note: posNote,
        customerName: posCustomerName,
        customerPhone: posCustomerPhone,
      };
      
      const newOrdersList = orders.map(o => o.id === activeOrd.id ? updatedOrder : o);
      onUpdateOrders(newOrdersList);
    } else {
      // Create new active order
      const randomId = 'order_' + Math.random().toString(36).substring(2, 11);
      const codeSuffix = Math.floor(1000 + Math.random() * 9000);
      const todayDateStr = new Date().toISOString();
      const newOrd: Order = {
        id: randomId,
        billCode: `HD${codeSuffix}`,
        customerName: posCustomerName || tblName,
        customerPhone: posCustomerPhone || '0900000000',
        customerAddress: tblName,
        tableId: selectedTable,
        tableName: tblName,
        paymentMethod: 'cod',
        items: posCart,
        subTotal,
        discountAmount,
        totalAmount,
        status: 'preparing', // Auto mark POS orders as preparing (skip pending approval)
        paymentStatus: 'unpaid',
        createdAt: todayDateStr,
        note: posNote,
      };

      await onAddOrder(newOrd);
    }

    setHasChanges(false);
    setShowMenuMode(false);
    if (isMobileViewport) setShowMobileDetail(false);
    alert(`Đã cập nhật đơn hàng thành công cho ${tblName}!`);
  };

  // Switch or Transfer current table's order to another empty table
  const handleTransferTable = () => {
    if (!transferTargetTableId) {
      alert('Vui lòng chọn bàn đích!');
      return;
    }

    const targetTblDetail = tablesWithDetails.find(t => t.id === transferTargetTableId);
    if (targetTblDetail?.isOccupied) {
      alert('Bàn này đang có khách! Để kết hợp hãy dùng tính năng gộp bàn.');
      return;
    }

    const currentOrder = currentActiveOrder;
    const targetTblName = tables.find(t => t.id === transferTargetTableId)?.name || '';

    if (!currentOrder || !targetTblName) return;

    // Mutate order address so it points to the new table
    const updatedOrder: Order = {
      ...currentOrder,
      tableId: transferTargetTableId,
      tableName: targetTblName,
      customerAddress: targetTblName,
      // If customerName was default Table Name, update it too
      customerName: currentOrder.customerName === currentSelectedTableDetail?.name ? targetTblName : currentOrder.customerName
    };

    onUpdateOrders(orders.map(o => o.id === currentOrder.id ? updatedOrder : o));
    setSelectedTable(transferTargetTableId);
    setShowTransferModal(false);
  };

  // Merge table items from current table into another occupied table
  const handleMergeTable = () => {
    if (!mergeTargetTableId) {
      alert('Vui lòng chọn bàn cần gộp!');
      return;
    }

    const targetTblDetail = tablesWithDetails.find(t => t.id === mergeTargetTableId);
    if (!targetTblDetail?.isOccupied || !targetTblDetail.activeOrder) {
      alert('Bàn đích phải là bàn đang có khách!');
      return;
    }

    const sourceOrder = currentActiveOrder;
    const targetOrder = targetTblDetail.activeOrder;

    if (!sourceOrder || !targetOrder) return;

    // Merge items
    const mergedCart: OrderItem[] = [...targetOrder.items];
    sourceOrder.items.forEach(srcItem => {
      const matchIdx = mergedCart.findIndex(i => i.productId === srcItem.productId);
      if (matchIdx > -1) {
        mergedCart[matchIdx].quantity += srcItem.quantity;
      } else {
        mergedCart.push({ ...srcItem });
      }
    });

    const subTotal = mergedCart.reduce((sum, item) => sum + item.quantity * item.priceOnOrder, 0);
    const totalAmount = subTotal - (targetOrder.discountAmount || 0);

    // Update target order with merged items and cancel source order
    const updatedTarget: Order = {
      ...targetOrder,
      items: mergedCart,
      subTotal,
      totalAmount
    };

    const cancelledSource: Order = {
      ...sourceOrder,
      status: 'cancelled',
      cancellationReason: `Được gộp hóa đơn sang ${targetTblDetail.name}`
    };

    onUpdateOrders(orders.map(o => {
      if (o.id === targetOrder.id) return updatedTarget;
      if (o.id === sourceOrder.id) return cancelledSource;
      return o;
    }));

    setSelectedTable(mergeTargetTableId);
    setShowMergeModal(false);
    alert(`Đã gộp thành công ${currentSelectedTableDetail?.name} vào ${targetTblDetail.name}!`);
  };

  // Helper calculation for promotions & payment
  const activePromoObject = useMemo(() => {
    if (!selectedPromoCode) return null;
    return promotions.find(p => p.code.toLowerCase() === selectedPromoCode.toLowerCase() && p.isActive);
  }, [selectedPromoCode, promotions]);

  const rawSubTotal = currentActiveOrder?.subTotal || 0;

  const currentComputedDiscount = useMemo(() => {
    let disc = customDiscountAmt || 0;
    if (activePromoObject) {
      if (rawSubTotal >= activePromoObject.minOrderValue) {
        if (activePromoObject.type === 'percentage') {
          disc += Math.floor((rawSubTotal * activePromoObject.value) / 100);
        } else {
          disc += activePromoObject.value;
        }
      }
    }
    return Math.min(disc, rawSubTotal);
  }, [activePromoObject, customDiscountAmt, rawSubTotal]);

  const finalCheckoutAmount = Math.max(0, rawSubTotal - currentComputedDiscount);

  // Dynamic Cashier change refund
  const refundCashBack = useMemo(() => {
    const cash = parseFloat(customerPaidCash.replace(/\./g, '')) || 0;
    if (cash < finalCheckoutAmount) return 0;
    return cash - finalCheckoutAmount;
  }, [customerPaidCash, finalCheckoutAmount]);

  // Complete Payment Action
  const handleFinalizePayment = () => {
    const currentOrder = currentActiveOrder;
    if (!currentOrder) return;

    let updatedCustomerName = currentOrder.customerName;
    let updatedCustomerPhone = currentOrder.customerPhone;
    let updatedNote = currentOrder.note || '';

    if (isPayAsDebt) {
      const cleanDebtName = debtName.trim();
      const cleanDebtPhone = debtPhone.trim().replace(/\s+/g, '');
      const tName = currentSelectedTableDetail?.name || '';
      
      if (!cleanDebtName) {
        alert('Vui lòng nhập Tên khách để ghi sổ nợ!');
        return;
      }
      if (cleanDebtName.toLowerCase() === tName.toLowerCase() || cleanDebtName.toLowerCase() === 'khách vãng lai' || cleanDebtName.toLowerCase() === 'khach vang lai') {
        alert(`Không được dùng tên mặc định "${cleanDebtName}" để ghi sổ nợ. Vui lòng nhập tên khách thực tế!`);
        return;
      }
      if (!cleanDebtPhone) {
        alert('Vui lòng nhập Số điện thoại khách để ghi sổ nợ!');
        return;
      }
      if (cleanDebtPhone === '0900000000') {
        alert('Không được dùng số điện thoại mặc định "0900000000" để ghi sổ nợ. Vui lòng nhập SĐT khách thực tế!');
        return;
      }
      if (cleanDebtPhone.length < 8) {
        alert('Số điện thoại không hợp lệ!');
        return;
      }

      // Appended note if provided
      if (debtNote.trim()) {
        if (updatedNote) {
          updatedNote += ` | ${debtNote.trim()}`;
        } else {
          updatedNote = debtNote.trim();
        }
      }

      updatedCustomerName = cleanDebtName;
      updatedCustomerPhone = cleanDebtPhone;
    }

    // Build the completed receipt model
    const completedOrder: Order = {
      ...currentOrder,
      subTotal: rawSubTotal,
      discountAmount: currentComputedDiscount,
      totalAmount: finalCheckoutAmount,
      promoCodeUsed: selectedPromoCode || undefined,
      status: 'completed',
      paymentStatus: isPayAsDebt ? 'debt' : 'paid',
      paymentMethod: payingMethod,
      customerName: updatedCustomerName,
      customerPhone: updatedCustomerPhone,
      note: updatedNote,
      adminNote: (currentOrder.adminNote || '') + ` [${storeConfig.name || 'Hệ Thống'} POS: Đã thanh toán qua ${isPayAsDebt ? 'Ghi nợ sổ sách' : (payingMethod === 'cod' ? 'Tiền mặt' : 'Chuyển khoản QR')}]`
    };

    onUpdateOrders(orders.map(o => o.id === currentOrder.id ? completedOrder : o));
    
    // Hold onto structured completed order details so print modal shows the finalized stats
    setPrintBillData(completedOrder);
    setShowPaymentModal(false);
    
    // Auto-open thermal print invoice popup
    setShowPrintPreview(true);
  };

  // Fast menu item adding helper
  const handleAddMenuItemToCart = (prod: Product) => {
    setPosCart(prev => {
      const existIdx = prev.findIndex(item => item.productId === prod.id);
      if (existIdx > -1) {
        const next = [...prev];
        next[existIdx] = {
          ...next[existIdx],
          quantity: next[existIdx].quantity + 1
        };
        return next;
      } else {
        return [...prev, {
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          priceOnOrder: prod.price
        }];
      }
    });
    setHasChanges(true); 
  };

  // Adjust item quantities from sidebar cart
  const handleUpdateItemQuantityCart = (productId: string, val: number) => {
    setPosCart(prev => {
      const item = prev.find(i => i.productId === productId);
      if (!item) return prev;

      const newQty = item.quantity + val;
      if (newQty <= 0) {
        setItemToDelete(item);
        return prev;
      }
      
      return prev.map(i => i.productId === productId ? { ...i, quantity: newQty } : i);
    });
    setHasChanges(true);
  };

  const handleRemoveItemFromCart = (productId: string) => {
    const itemToRemove = posCart.find(i => i.productId === productId);
    if (!itemToRemove) return;
    setItemToDelete(itemToRemove);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    setPosCart(prev => prev.filter(i => i.productId !== itemToDelete.productId));
    setHasChanges(true);
    setItemToDelete(null);
  };

  // Filter products for fast instant food ordering grid
  const filteredProductsMenu = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchMenuQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchMenuQuery.toLowerCase());
      const matchCategory = selectedMenuCategory === 'all' || p.categoryId === selectedMenuCategory;
      return matchSearch && matchCategory && p.isAvailable;
    });
  }, [products, searchMenuQuery, selectedMenuCategory]);

  // Handle saving receipt as image fallback (since window.print often fails in iframes)
  const handleSaveReceiptAsImage = async () => {
    const element = document.getElementById('thermal-receipt-content');
    if (!element) return;
    
    try {
      // Remove max-height and scrolling temporary for clear capture
      const originalStyle = element.style.cssText;
      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';
      element.style.borderRadius = '0';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const receipt = clonedDoc.getElementById('thermal-receipt-content');
          if (receipt) {
            receipt.style.maxHeight = 'none';
            receipt.style.overflow = 'visible';
            receipt.style.boxShadow = 'none';
            receipt.style.border = 'none';
            
            // Aggressively strip oklch and ensure clean text wrapping
            const elements = receipt.querySelectorAll('*');
            elements.forEach((node) => {
              const el = node as HTMLElement;
              const computed = window.getComputedStyle(el);
              
              // Force text to wrap/be visible for capture
              el.style.whiteSpace = 'normal';
              el.style.overflow = 'visible';
              el.style.textOverflow = 'clip';
              
              const checkAndFix = (prop: string, fallback: string) => {
                const val = computed.getPropertyValue(prop);
                if (val && val.includes('oklch')) {
                  el.style.setProperty(prop, fallback, 'important');
                }
              };

              checkAndFix('color', '#1e293b');
              checkAndFix('background-color', 'transparent');
              checkAndFix('border-color', '#e2e8f0');
              checkAndFix('fill', 'currentColor');
              checkAndFix('stroke', 'currentColor');
            });

            // Ensure the main receipt background is definitely white
            receipt.style.setProperty('background-color', '#ffffff', 'important');
            receipt.style.setProperty('color', '#0f172a', 'important');
          }
        }
      });
      
      // Restore styles
      element.style.cssText = originalStyle;
      
      const image = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.href = image;
      link.download = `Bill_${printBillData?.billCode || 'Receipt'}.jpg`;
      link.click();
      
      alert('Đã lưu hóa đơn thành công dưới dạng hình ảnh!');
    } catch (error) {
      console.error('Error capturing receipt:', error);
      alert('Không thể lưu ảnh hóa đơn. Vui lòng thử lại!');
    }
  };

  // Visual layout configurations that are safe for theme palettes
  const colorMap = {
    standard: {
      sidebarBg: 'bg-stone-50 border-stone-200 text-stone-850',
      activeCard: 'border-orange-500 bg-orange-50/50 shadow-orange-100',
      emptyCard: 'border-slate-100 hover:border-orange-200 bg-white shadow-xs',
      subHeader: 'text-stone-500 font-bold uppercase tracking-wider',
      tabActive: 'bg-orange-600 text-white',
      badgeOccupied: 'bg-orange-500 text-white',
      badgeFree: 'bg-[#f0f9f1] text-[#2ebd4d]',
      wrapperBg: 'bg-slate-50 text-slate-800',
      cardBg: 'bg-white border-slate-200 shadow-sm text-slate-800',
      secCardBg: 'bg-stone-50 border-stone-200 text-slate-800',
      textPrimary: 'text-slate-900',
      textSecondary: 'text-slate-800',
      textMuted: 'text-slate-500',
      borderClass: 'border-stone-200/60',
      inputBg: 'bg-white border-stone-200 text-slate-800 font-bold',
      realtimeTipBg: 'bg-orange-50/50 border-orange-100/80',
      occupiedTextPrimary: 'text-slate-850',
      occupiedTextMuted: 'text-slate-500',
      emptyTextPrimary: 'text-slate-800',
      emptyTextMuted: 'text-stone-400/80'
    },
    vista: {
      sidebarBg: 'bg-white/45 backdrop-blur-md border-white/50 text-slate-900',
      activeCard: 'border-sky-500 bg-sky-50/65 shadow-sky-100/50',
      emptyCard: 'border-white/50 hover:border-sky-500/40 bg-white/70 backdrop-blur-md shadow-xs',
      subHeader: 'text-sky-600 font-bold uppercase tracking-wider',
      tabActive: 'bg-gradient-to-b from-sky-400 via-sky-600 to-sky-700 text-white shadow-sm border border-sky-650',
      badgeOccupied: 'bg-sky-500 text-white',
      badgeFree: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      wrapperBg: 'bg-gradient-to-br from-sky-100/20 via-slate-100 to-emerald-100/20 text-slate-800',
      cardBg: 'bg-white/70 backdrop-blur-md border-white/50 shadow-md text-slate-800',
      secCardBg: 'bg-slate-200/40 backdrop-blur-sm border-white/35 text-slate-800',
      textPrimary: 'text-slate-950 drop-shadow-[0_0.5px_0_rgba(255,255,255,0.8)]',
      textSecondary: 'text-slate-850',
      textMuted: 'text-slate-500',
      borderClass: 'border-white/45',
      inputBg: 'bg-white/85 border-slate-250 text-slate-800 font-semibold',
      realtimeTipBg: 'bg-white/60 backdrop-blur-xs border-white/50',
      occupiedTextPrimary: 'text-sky-950',
      occupiedTextMuted: 'text-sky-700/80',
      emptyTextPrimary: 'text-slate-800',
      emptyTextMuted: 'text-slate-450'
    },
    cyberpunk: {
      sidebarBg: 'bg-[#121420]/95 border-[#45f3ff]/20 text-[#c5c6c7]',
      activeCard: 'border-[#ff0055]/85 bg-[#1a0c12]/95 shadow-[0_0_15px_rgba(255,0,85,0.2)] text-white',
      emptyCard: 'border-[#2c3540] hover:border-[#66fcf1]/45 bg-[#12161f]/90 text-[#c5c6c7] shadow-sm',
      subHeader: 'text-[#66fcf1] font-mono font-bold uppercase tracking-widest',
      tabActive: 'bg-[#66fcf1] text-[#0b0c10] border border-[#66fcf1] shadow-[0_0_8px_rgba(102,252,241,0.4)]',
      badgeOccupied: 'bg-rose-600 text-white shadow-rose-900',
      badgeFree: 'bg-[#111] text-[#66fcf1] border border-[#66fcf1]/20',
      wrapperBg: 'bg-[#0b0c10] text-[#c5c6c7] font-mono',
      cardBg: 'bg-[#1f2833]/90 border border-[#45f3ff]/30 shadow-2xl text-[#c5c6c7]',
      secCardBg: 'bg-[#0f1115] border border-[#2c3540] text-[#c5c6c7]',
      textPrimary: 'text-[#66fcf1] drop-shadow-[0_0_4px_rgba(102,252,241,0.2)]',
      textSecondary: 'text-[#c5c6c7]',
      textMuted: 'text-[#c5c6c7]/60 font-mono',
      borderClass: 'border-[#2c3540]',
      inputBg: 'bg-[#0f1115]/90 border-[#2c3540] text-[#c5c6c7] focus:border-[#66fcf1]',
      realtimeTipBg: 'bg-[#0f1115]/90 border-[#66fcf1]/25',
      occupiedTextPrimary: 'text-white border-b border-[#ff0055]/20 pb-0.5',
      occupiedTextMuted: 'text-[#ff0055]/95',
      emptyTextPrimary: 'text-[#c5c6c7]',
      emptyTextMuted: 'text-slate-500'
    },
    win11: {
      sidebarBg: 'bg-[#f9f9f9]/95 backdrop-blur-md border-zinc-200 text-zinc-800',
      activeCard: 'border-[#0078d4]/90 bg-[#0078d4]/8 shadow-[0_4px_12px_rgba(0,120,212,0.12)]',
      emptyCard: 'border-zinc-200 bg-white/90 hover:border-zinc-300 shadow-xs',
      subHeader: 'text-zinc-500 font-bold uppercase tracking-wider',
      tabActive: 'bg-[#0078d4] text-white shadow-xs',
      badgeOccupied: 'bg-[#0078d4] text-white',
      badgeFree: 'bg-zinc-100 text-zinc-700',
      wrapperBg: 'bg-[#f3f3f3] text-zinc-800',
      cardBg: 'bg-white border-zinc-250 shadow-xs text-zinc-800',
      secCardBg: 'bg-[#f9f9f9] border-zinc-200 text-zinc-800',
      textPrimary: 'text-zinc-900',
      textSecondary: 'text-zinc-700',
      textMuted: 'text-zinc-500',
      borderClass: 'border-zinc-250/90',
      inputBg: 'bg-white border-zinc-350 text-zinc-800 font-semibold',
      realtimeTipBg: 'bg-zinc-150 border-zinc-200',
      occupiedTextPrimary: 'text-zinc-900',
      occupiedTextMuted: 'text-zinc-500',
      emptyTextPrimary: 'text-zinc-850',
      emptyTextMuted: 'text-zinc-450'
    }
  };

  const cm = colorMap[adminTheme] || colorMap.standard;

  // Filtered tables logic
  const filteredGridTables = useMemo(() => {
    let list = tablesWithDetails.filter(t => {
      const matchStatus = tableFilter === 'all' || 
                         (tableFilter === 'occupied' && t.isOccupied) || 
                         (tableFilter === 'empty' && !t.isOccupied);
      
      const matchArea = areaFilterId === 'all' || t.areaId === areaFilterId;
      
      return matchStatus && matchArea;
    });

    // Sort by area position in areas list if areaFilterId is 'all'
    if (areaFilterId === 'all') {
      list = [...list].sort((a, b) => {
        const indexA = cashierAreas.findIndex(ar => ar.id === a.areaId);
        const indexB = cashierAreas.findIndex(ar => ar.id === b.areaId);
        
        // Items without area go to the end
        const posA = indexA === -1 ? 9999 : indexA;
        const posB = indexB === -1 ? 9999 : indexB;
        
        if (posA !== posB) return posA - posB;
        return a.name.localeCompare(b.name, 'vi', { numeric: true });
      });
    }

    return list;
  }, [tablesWithDetails, tableFilter, areaFilterId, cashierAreas]);

  // Formatted active table order metrics
  const activeTblOrderCount = tablesWithDetails.filter(t => t.isOccupied && t.id !== 'SHIP' && t.id !== 'BOOKING').length;

  return (
    <div className={`flex-1 flex flex-col md:flex-row h-full overflow-hidden text-xs ${cm.wrapperBg}`}>
      
      {/* LEFT SECTION: Tables Grid Map & Live Feed */}
      <div className={`flex-1 flex flex-col p-5 overflow-y-auto min-w-[280px] ${isMobileViewport && showMobileDetail ? 'hidden' : 'flex'}`}>
        
        {/* Floor Header summary stats */}
        <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0">
          <div>
            <span className={`${cm.subHeader} text-[10px] block mb-1`}>Bản Đồ Phục Vụ Tại Chỗ & Trực Tuyến</span>
            <h1 className={`text-lg font-black tracking-tight ${cm.textPrimary} flex items-center gap-2`}>
              <Utensils className={`w-5 h-5 ${t.icon}`} /> SƠ ĐỒ BÀN THU NGÂN ({activeTblOrderCount}/{tables.length})
            </h1>
          </div>
          
          {/* Quick status counters */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            <button
              onClick={() => setTableFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all uppercase whitespace-nowrap ${
                tableFilter === 'all' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : `${cm.secCardBg} hover:opacity-90 text-xs`
              }`}
            >
              Tất Cả ({tables.length})
            </button>
            <button
              onClick={() => setTableFilter('occupied')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all uppercase whitespace-nowrap flex items-center gap-1 ${
                tableFilter === 'occupied' 
                  ? 'bg-orange-600 text-white shadow-sm' 
                  : 'bg-orange-50/20 hover:bg-orange-100/30 text-orange-600 border border-orange-200/30'
              }`}
            >
              Đang Ăn ({activeTblOrderCount})
            </button>
            <button
              onClick={() => setTableFilter('empty')}
              className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all uppercase whitespace-nowrap flex items-center gap-1 ${
                tableFilter === 'empty' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-emerald-50/20 hover:bg-emerald-100/30 text-emerald-600 border border-emerald-200/30'
              }`}
            >
              Trống ({tables.length - activeTblOrderCount})
            </button>
          </div>
        </div>
 
        {/* Area Tabs Filter */}
        {cashierAreas.length > 0 && (
          <div className="mb-4 flex items-center bg-white/50 p-2 rounded-xl border border-slate-100 shadow-sm overflow-hidden shrink-0">
            <div className="flex items-center gap-2 w-full">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap shrink-0 pl-1">Khu vực:</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 px-1">
                <button
                  onClick={() => setAreaFilterId('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap flex-none ${
                    areaFilterId === 'all' ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  Tất cả
                </button>
                {cashierAreas.map(area => {
                  const isOnlineTab = area.id === 'virtual_online';
                  const totalOnlineCount = shipOrdersCount + bookingOrdersCount;
                  return (
                    <button
                      key={area.id}
                      onClick={() => setAreaFilterId(area.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap flex items-center gap-1.5 flex-none ${
                        areaFilterId === area.id ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <span>{area.name}</span>
                      {isOnlineTab && totalOnlineCount > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-normal leading-none ${
                          areaFilterId === area.id ? 'bg-white text-orange-600' : 'bg-rose-500 text-white animate-pulse'
                        }`}>
                          {totalOnlineCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Visual Floor Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
          {filteredGridTables.map(tbl => {
            const isSelected = tbl.id === selectedTable;
            const isShip = tbl.id === 'SHIP';
            const isBooking = tbl.id === 'BOOKING';
            const isVirtual = isShip || isBooking;

            // Use the cohesive theme-defined card style
            const cardStyle = tbl.isOccupied ? cm.activeCard : cm.emptyCard;
            
            return (
              <div
                key={tbl.id}
                onClick={() => {
                  setSelectedTable(tbl.id);
                  if (isMobileViewport) setShowMobileDetail(true);
                }}
                className={`relative p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none h-[142px] ${cardStyle} ${
                  isSelected ? 'ring-2 ring-orange-500 scale-[1.02] shadow-md z-10' : ''
                }`}
              >
                {/* Table Title and Status dot */}
                <div className="flex justify-between items-start gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-base w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      isShip 
                        ? 'bg-amber-100 dark:bg-amber-955 text-amber-600' 
                        : isBooking 
                          ? 'bg-sky-100 dark:bg-sky-955 text-sky-600' 
                          : 'bg-orange-100/70 dark:bg-orange-955/40 text-orange-600'
                    }`}>
                      {isShip ? '🚀' : isBooking ? '📅' : '🪑'}
                    </span>
                    <div className="min-w-0 font-bold">
                      <h3 className={`font-black text-[12px] uppercase tracking-tight leading-tight truncate ${
                        tbl.isOccupied ? cm.occupiedTextPrimary : cm.emptyTextPrimary
                      }`}>
                        {isShip ? 'Giao Hàng' : isBooking ? 'Đặt Trước' : tbl.name}
                      </h3>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {tbl.areaId && (
                          <p className={`text-[8.5px] font-black uppercase tracking-tighter flex items-center gap-0.5 ${
                            tbl.isOccupied ? 'text-orange-500' : 'text-sky-600'
                          } truncate`}>
                            {!isVirtual && <MapPin className="w-2.5 h-2.5 shrink-0" />}
                            <span className="truncate">
                              {isVirtual ? 'Trực tuyến' : cashierAreas.find(a => a.id === tbl.areaId)?.name}
                            </span>
                          </p>
                        )}
                        {tbl.isOccupied && tbl.activeOrder?.createdAt && (
                          <p className={`text-[9px] font-bold flex items-center gap-1 font-mono ${
                            tbl.isOccupied ? cm.occupiedTextMuted : cm.emptyTextMuted
                          }`}>
                            <Clock className="w-3 h-3 text-orange-400 shrink-0" />
                            {new Date(tbl.activeOrder.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
 
                  {isVirtual ? (
                    (() => {
                      const count = isShip ? shipOrdersCount : bookingOrdersCount;
                      return count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[8.5px] bg-red-500 text-white font-black uppercase shadow-sm flex items-center gap-1 whitespace-nowrap shrink-0 animate-pulse">
                          {count} ĐƠN
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-400 font-extrabold uppercase whitespace-nowrap shrink-0">
                          Trống
                        </span>
                      );
                    })()
                  ) : tbl.isOccupied ? (
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-rose-500/10 text-rose-600 font-extrabold uppercase animate-pulse whitespace-nowrap shrink-0">
                      Bận
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-500 font-extrabold uppercase whitespace-nowrap shrink-0">
                      Trống
                    </span>
                  )}
                </div>
 
                {/* Main description bottom or active receipt */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                  {tbl.isOccupied && tbl.activeOrder ? (
                    <div className="space-y-0.5">
                      <div className={`font-extrabold font-sans line-clamp-1 text-[10px] tracking-tight ${
                        tbl.isOccupied ? cm.occupiedTextMuted : cm.emptyTextMuted
                      }`}>
                        👤 {tbl.activeOrder.customerName}
                      </div>
                      <div className="font-extrabold font-mono text-[11.5px] tracking-tight flex items-baseline justify-between text-rose-600 dark:text-rose-400">
                        <span className="text-[9.5px] uppercase font-bold opacity-75">Tổng:</span>
                        <span>{tbl.activeOrder.totalAmount.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-[9.5px] text-slate-400 font-bold">
                      <span className="uppercase tracking-wider text-[8px] opacity-75">Sức chứa:</span>
                      <span>{tbl.capacity || 4} chỗ</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
 
        {/* Dynamic bottom instructions list */}
        <div className={`mt-5 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-3 border shrink-0 ${cm.realtimeTipBg}`}>
          <p className={`text-[10px] leading-relaxed max-w-2xl ${cm.textSecondary}`}>
            💡 <strong>Tương tác thời gian thực:</strong> Nếu khách ngồi tại <strong>Bàn 5</strong> dùng điện thoại quét mã order ở Sidebar giả lập bên cạnh, đơn hàng của họ sẽ tức tốc xuất hiện ngay tại <strong>Bàn 5</strong> phía trên giúp Thu Ngân không bao giờ bỏ sót yêu cầu!
          </p>
          <div className="flex gap-2">
            <span className="px-2 py-1 rounded text-[8px] font-bold bg-amber-100/80 text-amber-900 border border-amber-300 animate-pulse uppercase tracking-tight">Real-Time Sync</span>
          </div>
        </div>
 
      </div>

      {/* RIGHT SIDEBAR: Selected Table Context Panel / Quick Order Cart */}
      <div className={`w-full md:w-[380px] shrink-0 border-t md:border-t-0 md:border-l p-5 flex flex-col justify-between h-full ${cm.sidebarBg} ${isMobileViewport && !showMobileDetail ? 'hidden' : 'flex'}`}>
        
        {/* Selected Table Name Header */}
        <div className={`border-b ${cm.borderClass} pb-3 mb-4`}>
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2">
              {isMobileViewport && (
                <button
                  onClick={() => setShowMobileDetail(false)}
                  className={`p-2 rounded-lg ${cm.secCardBg} border ${cm.borderClass} text-orange-600`}
                >
                  <Undo className="w-4 h-4" />
                </button>
              )}
              <div>
                <span className="text-[10px] text-orange-600 font-black uppercase tracking-wider block">BẢN TIN PHỤC VỤ</span>
                <h2 className={`text-lg font-black ${cm.textPrimary} flex items-center gap-1.5 uppercase`}>
                  ⚙️ {currentSelectedTableDetail?.name || 'Chi Tiết'}
                </h2>
              </div>
            </div>
            
            {/* Context option icons */}
            {currentSelectedTableDetail?.isOccupied && (
              <div className="flex gap-1">
                <button
                  title="Chuyển Bàn"
                  onClick={() => setShowTransferModal(true)}
                  className={`p-2 rounded-lg ${cm.secCardBg} hover:opacity-85 transition`}
                >
                  <ArrowLeftRight className="w-4 h-4 text-orange-500" />
                </button>
                <button
                  title="Gộp Hóa Đơn Bàn"
                  onClick={() => setShowMergeModal(true)}
                  className={`p-2 rounded-lg ${cm.secCardBg} hover:opacity-85 transition`}
                >
                  <Combine className="w-4 h-4 text-orange-500" />
                </button>
              </div>
            )}
          </div>

          {/* Multibill Selector queue for multiple bills / SHIP / BOOKING */}
          {activeOrdersForSelectedTable.length > 1 && (
            <div className={`mt-2 flex flex-col gap-1 shrink-0 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border ${cm.borderClass}`}>
              <div className={`flex justify-between items-center mb-1 pb-1 border-b border-dashed ${cm.borderClass}`}>
                <span className={`text-[8.5px] font-black uppercase tracking-widest ${cm.textSecondary}`}>
                  Danh sách chờ ({activeOrdersForSelectedTable.length}):
                </span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => scrollQueue('left')}
                    className="p-1 rounded bg-slate-200/80 dark:bg-slate-850 hover:bg-slate-300 dark:hover:bg-slate-800 transition active:scale-90"
                    title="Cuộn qua trái"
                  >
                    <ChevronLeft className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                  </button>
                  <button 
                    onClick={() => scrollQueue('right')}
                    className="p-1 rounded bg-slate-200/80 dark:bg-slate-850 hover:bg-slate-300 dark:hover:bg-slate-800 transition active:scale-90"
                    title="Cuộn qua phải"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                  </button>
                  <span className="text-orange-500 font-black font-mono text-[8px] tracking-wide ml-1.5">BẤM CHỌN ĐƠN</span>
                </div>
              </div>
              <div 
                ref={queueScrollRef}
                className="flex gap-2 overflow-x-auto scroll-smooth pb-2 pt-1 px-0.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-900/40"
              >
                {activeOrdersForSelectedTable.map((ord, idx) => {
                  const isSubSelected = currentActiveOrder?.id === ord.id;
                  return (
                    <button
                      key={ord.id}
                      onClick={() => setSelectedSubOrderId(ord.id)}
                      className={`px-3 py-1.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all outline-none whitespace-nowrap min-w-[130px] shrink-0 ${
                        isSubSelected 
                          ? 'bg-orange-600 text-white border-orange-650 shadow-md scale-[1.01]' 
                          : `${cm.secCardBg} ${cm.textPrimary} ${cm.borderClass} hover:bg-slate-100 dark:hover:bg-slate-900`
                      }`}
                    >
                      <div className="flex justify-between items-center w-full gap-2">
                        <span className="font-extrabold text-[10px] truncate max-w-[85px]">
                          {ord.customerName}
                        </span>
                        <span className={`text-[8px] px-1 rounded-md py-0.5 leading-none font-black ${isSubSelected ? 'bg-orange-550 text-white' : 'bg-red-500/10 text-rose-500'}`}>
                          #{idx + 1}
                        </span>
                      </div>
                      <span className={`text-[8px] font-mono font-bold ${isSubSelected ? 'text-orange-100' : cm.textSecondary}`}>
                        {ord.billCode} • {(ord.totalAmount || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick client indicators */}
          {currentActiveOrder && (
            <div className={`mt-2.5 p-2 rounded-lg border ${cm.secCardBg} bg-opacity-60 ${cm.borderClass} flex flex-col gap-1 text-[10px]`}>
              <div className={`flex justify-between ${cm.textSecondary} font-bold`}>
                <span>Khách hàng: <strong>{currentActiveOrder.customerName}</strong></span>
                <span>Mã Bill: <strong className="font-mono text-orange-500">{currentActiveOrder.billCode}</strong></span>
              </div>
              {currentActiveOrder.customerPhone && (
                <p className="text-[#0078d4]">SĐT: {currentActiveOrder.customerPhone}</p>
              )}
              {currentActiveOrder.note && (
                <p className="text-rose-500 italic font-medium">Yêu cầu: "{currentActiveOrder.note}"</p>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Cart items view OR Adding Menu Drawer UI */}
        {showMenuMode ? (
          /* POS MEAL MENU GRID (Allows cashier to add dishes instantly) */
          <div className="flex-1 flex flex-col overflow-hidden mb-4 animate-fade-in gap-3">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-[10px] uppercase text-orange-600">Thêm Món Vào Đơn POS</h3>
              <button
                onClick={() => setShowMenuMode(false)}
                className={`text-orange-500 hover:text-orange-600 flex items-center gap-1 font-bold text-[10px] uppercase ${cm.secCardBg} px-2 py-0.5 rounded border ${cm.borderClass}`}
              >
                <Undo className="w-3.5 h-3.5" /> Bàn gốc
              </button>
            </div>

            {/* Menu searching & filters */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Gõ tên món ăn uống..."
                  value={searchMenuQuery}
                  onChange={(e) => setSearchMenuQuery(e.target.value)}
                  className={`w-full py-1 px-2 pb-1.5 rounded-lg pl-8 ${cm.inputBg} outline-none border focus:ring-1 focus:ring-orange-500`}
                />
                <Search className="w-4 h-4 text-stone-400 absolute left-2.5 top-2" />
              </div>

              {/* Categorization Pills */}
              <div className="flex gap-1 overflow-x-auto p-0.5 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedMenuCategory('all')}
                  className={`px-2 py-1 rounded text-[9px] font-black uppercase whitespace-nowrap ${
                    selectedMenuCategory === 'all' 
                      ? 'bg-orange-600 text-white' 
                      : `${cm.secCardBg} border ${cm.borderClass} text-xs`
                  }`}
                >
                  Tất cả
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedMenuCategory(cat.id)}
                    className={`px-2 py-1 rounded text-[9px] font-black uppercase whitespace-nowrap ${
                      selectedMenuCategory === cat.id 
                        ? 'bg-orange-600 text-white' 
                        : `${cm.secCardBg} border ${cm.borderClass} text-xs`
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Culinary Items Food List */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
              {filteredProductsMenu.length === 0 ? (
                <div className={`text-center py-10 font-bold ${cm.textMuted}`}>Không tìm thấy món!</div>
              ) : (
                filteredProductsMenu.map(prod => {
                  const alreadyIn = posCart.find(i => i.productId === prod.id)?.quantity || 0;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleAddMenuItemToCart(prod)}
                      className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition shadow-xs border ${cm.cardBg} hover:border-orange-500`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
                          {prod.image || '🍛'}
                        </span>
                        <div>
                          <p className={`font-extrabold ${cm.textSecondary} tracking-tight leading-tight`}>{prod.name}</p>
                          <p className={`text-[10px] ${cm.textMuted} font-bold font-mono mt-0.5`}>{prod.price.toLocaleString('vi-VN')} đ</p>
                        </div>
                      </div>

                      {/* Add button / counters */}
                      <div className="flex items-center gap-2">
                        {alreadyIn > 0 ? (
                          <div className="flex items-center gap-1.5 bg-orange-50 p-1 rounded-lg border border-orange-100" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantityCart(prod.id, -1)}
                              className="w-6 h-6 flex items-center justify-center bg-white rounded border border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white transition"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-[11px] font-black text-orange-700 min-w-[20px] text-center">
                              {alreadyIn}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantityCart(prod.id, 1)}
                              className="w-6 h-6 flex items-center justify-center bg-white rounded border border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white transition"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleAddMenuItemToCart(prod); }}
                            className="p-1.5 rounded-lg bg-orange-100 text-orange-600 font-extrabold text-xs hover:bg-orange-600 hover:text-white transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* STANDARD CART ITEMS DISPLAY (Active table bill breakdown) */
          <div className="flex-1 flex flex-col overflow-hidden mb-4">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h3 className={`font-extrabold text-[10px] uppercase ${cm.textMuted}`}>Giỏ Món Đang Dùng</h3>
              <button
                onClick={() => setShowMenuMode(true)}
                className="px-2.5 py-1 rounded bg-orange-600 text-white hover:bg-orange-700 transition font-extrabold flex items-center gap-1 uppercase tracking-tight text-[10px]"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Món
              </button>
            </div>

            {posCart.length === 0 ? (
              <div className={`flex-1 flex flex-col items-center justify-center text-center p-6 ${cm.textMuted}`}>
                <span className="text-3xl mb-1.5 opacity-60">🍜</span>
                <p className={`font-bold ${cm.textSecondary}`}>Bàn này chưa gọi món ăn!</p>
                <p className="text-[11px] leading-relaxed max-w-[200px] mt-1 opacity-80">Ấn nút "Thêm món" phía trên để mở danh mục món ăn uống và tạo yêu cầu cho bếp.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                {posCart.map(item => {
                  const matchingProd = products.find(p => p.id === item.productId);
                  return (
                    <div
                      key={item.productId}
                      className={`p-2 border rounded-xl flex items-center justify-between ${cm.cardBg} ${cm.borderClass}`}
                    >
                      <div className="max-w-[190px]">
                        <p className={`font-bold ${cm.textSecondary} leading-tight`}>{item.productName}</p>
                        <p className={`text-[10px] ${cm.textMuted} font-bold font-mono mt-0.5`}>
                          {item.priceOnOrder.toLocaleString('vi-VN')}đ
                        </p>
                      </div>

                      {/* Adjust Item Quantity buttons */}
                      <div className={`flex items-center gap-2 ${cm.secCardBg} border ${cm.borderClass} p-1.5 rounded-lg shrink-0`}>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantityCart(item.productId, -1)}
                          className={`p-0.5 ${cm.textSecondary} hover:opacity-80`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className={`font-black font-mono ${cm.textSecondary} text-[11px] w-5 text-center`}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantityCart(item.productId, 1)}
                          className={`p-0.5 ${cm.textSecondary} hover:opacity-80`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromCart(item.productId)}
                          className={`pl-1.5 border-l ${cm.borderClass} ${cm.textMuted} hover:text-rose-600 transition`}
                          title="Xóa món"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* POS Details Client Inputs inside billing area */}
                <div className={`mt-4 pt-3 border-t border-dashed flex flex-col gap-2 p-2.5 rounded-xl border relative ${cm.secCardBg} ${cm.borderClass}`}>
                  <h4 className={`font-extrabold text-[9px] uppercase tracking-wide ${cm.textSecondary}`}>Thông tin bổ sung</h4>
                  
                  <div className="grid grid-cols-2 gap-2 relative">
                    <div className="relative">
                      <label className={`text-[9px] font-bold uppercase block mb-1 ${cm.textMuted}`}>Tên Khách</label>
                      <input
                        type="text"
                        value={posCustomerName}
                        onFocus={() => setActiveSuggestionField('pos_name')}
                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 250)}
                        onChange={(e) => { setPosCustomerName(e.target.value); setHasChanges(true); }}
                        className={`w-full rounded-md p-1 outline-none border text-[10px] ${cm.inputBg} ${cm.borderClass}`}
                      />
                      {activeSuggestionField === 'pos_name' && posNameSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[999] divide-y divide-slate-100 dark:divide-slate-705">
                          {posNameSuggestions.map((cust) => (
                            <button
                              key={cust.phone}
                              type="button"
                              onMouseDown={() => {
                                setPosCustomerName(cust.name);
                                setPosCustomerPhone(cust.phone);
                                setHasChanges(true);
                                setActiveSuggestionField(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-slate-700 text-[10px] flex justify-between items-center transition"
                            >
                              <span className="font-bold text-slate-700 dark:text-slate-200 block truncate max-w-[100px]">{cust.name}</span>
                              <span className="text-slate-400 dark:text-slate-400 font-mono text-[9px] shrink-0">{cust.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <label className={`text-[9px] font-bold uppercase block mb-1 ${cm.textMuted}`}>Số điện thoại</label>
                      <input
                        type="text"
                        value={posCustomerPhone}
                        placeholder="..."
                        onFocus={() => setActiveSuggestionField('pos_phone')}
                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 250)}
                        onChange={(e) => { setPosCustomerPhone(e.target.value); setHasChanges(true); }}
                        className={`w-full rounded-md p-1 outline-none border text-[10px] ${cm.inputBg} ${cm.borderClass}`}
                      />
                      {activeSuggestionField === 'pos_phone' && posPhoneSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[999] divide-y divide-slate-100 dark:divide-slate-705">
                          {posPhoneSuggestions.map((cust) => (
                            <button
                              key={cust.phone}
                              type="button"
                              onMouseDown={() => {
                                setPosCustomerName(cust.name);
                                setPosCustomerPhone(cust.phone);
                                setHasChanges(true);
                                setActiveSuggestionField(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-slate-700 text-[10px] flex justify-between items-center transition"
                            >
                              <span className="font-bold text-slate-700 dark:text-slate-200 block truncate max-w-[100px]">{cust.name}</span>
                              <span className="text-slate-400 dark:text-slate-400 font-mono text-[9px] shrink-0">{cust.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={`text-[9px] font-bold uppercase block mb-1 ${cm.textMuted}`}>Yêu cầu nhà bếp</label>
                    <input
                      type="text"
                      placeholder="vd: không cay, nhiều đá..."
                      value={posNote}
                      onChange={(e) => { setPosNote(e.target.value); setHasChanges(true); }}
                      className={`w-full rounded-md p-1 outline-none border text-[10px] ${cm.inputBg} ${cm.borderClass}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOTTOM POS ACTIONS AREA */}
        <div className={`border-t ${cm.borderClass} pt-4 bg-transparent shrink-0`}>
          
          {/* Subtotal preview */}
          {posCart.length > 0 && (
            <div className="flex justify-between items-center mb-3">
              <span className={`text-[10px] uppercase font-bold ${cm.textMuted}`}>Tổng Tạm Tính:</span>
              <span className={`text-base font-black font-mono ${cm.textPrimary}`}>
                {posCart.reduce((sum, item) => sum + item.quantity * item.priceOnOrder, 0).toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}

          {/* Action Row buttons */}
          <div className="flex gap-2">
            
            {/* Save Order state (Updates/Registers active order) */}
            <button
              onClick={handleSavePOSOrder}
              disabled={!hasChanges || posCart.length === 0}
              className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 uppercase tracking-wide transition-all ${
                hasChanges && posCart.length > 0 
                  ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-md active:scale-98 cursor-pointer' 
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Check className="w-4 h-4" /> Lưu & Gửi Bếp 🥘
            </button>

            {/* Direct Pay dialog trigger (only for existing active orders) */}
            {currentActiveOrder && (
              <button
                onClick={() => {
                  setPrintBillData(null);
                  setSelectedPromoCode('');
                  setCustomDiscountAmt(0);
                  setCustomerPaidCash('');
                  setIsPayAsDebt(false);
                  setShowPaymentModal(true);
                }}
                className="py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold flex items-center justify-center gap-1.5 uppercase tracking-wide transition shadow-md active:scale-98"
                title="Tính tiền hóa đơn này"
              >
                <Calculator className="w-4.5 h-4.5" /> Thanh Toán
              </button>
            )}

          </div>

          <div className="mt-3 text-center">
            {currentActiveOrder ? (
              <span className="text-[10px] text-orange-600 font-extrabold animate-pulse uppercase tracking-tight">
                ⚠️ CẦN CLICK LƯU & GỬI BẾP NẾU CÓ THAY ĐỔI MÓN!
              </span>
            ) : (
              <span className="text-[9px] text-stone-400">Chọn món, điền tên khách và ấn Lưu để bắt đầu phục vụ bàn mới</span>
            )}
          </div>

        </div>

      </div>

      {/* MODAL WINDOWS */}

      {/* 1. TRANSFER TABLE MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`${cm.cardBg} rounded-2xl max-w-sm w-full p-5 border ${cm.borderClass} shadow-2xl animate-scale-up`}>
            <div className={`flex justify-between items-center border-b ${cm.borderClass} pb-2 mb-4`}>
              <h3 className={`font-extrabold text-sm ${cm.textPrimary} uppercase flex items-center gap-1.5`}>
                <ArrowLeftRight className="w-4 h-4 text-orange-600" /> Chuyển {currentSelectedTableDetail?.name}
              </h3>
              <button onClick={() => setShowTransferModal(false)} className={`${cm.textMuted} hover:opacity-85`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className={`${cm.textSecondary} leading-snug mb-4`}>Bạn có chắc muốn chuyển toàn bộ đơn hàng của <strong>{currentSelectedTableDetail?.name}</strong> sang bàn khách rỗng?</p>
            
            <label className={`text-[10px] font-bold uppercase block mb-1 ${cm.textMuted}`}>Chọn bàn đích:</label>
            <select
              value={transferTargetTableId}
              onChange={(e) => setTransferTargetTableId(e.target.value)}
              className={`w-full rounded-xl p-2.5 outline-none font-bold mb-5 border ${cm.borderClass} ${cm.inputBg}`}
            >
              <option value="">-- Chọn bàn trống --</option>
              {tablesWithDetails.filter(t => !t.isOccupied).map(t => (
                <option key={t.id} value={t.id} className="text-slate-850">{t.name} (Rỗng)</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setShowTransferModal(false)}
                className={`flex-1 py-2 rounded-xl border ${cm.borderClass} ${cm.secCardBg} hover:opacity-85 font-bold ${cm.textSecondary}`}
              >
                Hủy
              </button>
              <button
                onClick={handleTransferTable}
                className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold"
              >
                Đồng Ý Chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MERGE TABLE MODAL */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`${cm.cardBg} rounded-2xl max-w-sm w-full p-5 border ${cm.borderClass} shadow-2xl animate-scale-up`}>
            <div className={`flex justify-between items-center border-b ${cm.borderClass} pb-2 mb-4`}>
              <h3 className={`font-extrabold text-sm ${cm.textPrimary} uppercase flex items-center gap-1.5`}>
                <Combine className="w-4 h-4 text-orange-600" /> Gộp bàn {currentSelectedTableDetail?.name}
              </h3>
              <button onClick={() => setShowMergeModal(false)} className={`${cm.textMuted} hover:opacity-85`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className={`${cm.textSecondary} leading-snug mb-4`}>
              Hành động này sẽ <strong>chuyển tất cả món ăn</strong> hiện tại của <strong>{currentSelectedTableDetail?.name}</strong> gộp vào một bàn khác đang ăn, sau đó hủy bàn gốc.
            </p>

            <label className={`text-[10px] font-bold uppercase block mb-1 ${cm.textMuted}`}>Gộp vào bàn:</label>
            <select
              value={mergeTargetTableId}
              onChange={(e) => setMergeTargetTableId(e.target.value)}
              className={`w-full rounded-xl p-2.5 outline-none font-bold mb-5 border ${cm.borderClass} ${cm.inputBg}`}
            >
              <option value="">-- Chọn bàn đích có khách --</option>
              {tablesWithDetails.filter(t => t.isOccupied && t.id !== selectedTable).map(t => (
                <option key={t.id} value={t.id} className="text-slate-850">{t.name} (Có khách - {t.activeOrder?.customerName})</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setShowMergeModal(false)}
                className={`flex-1 py-2 rounded-xl border ${cm.borderClass} ${cm.secCardBg} hover:opacity-85 font-bold ${cm.textSecondary}`}
              >
                Quay Lại
              </button>
              <button
                onClick={handleMergeTable}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold"
              >
                Tiến Hành Gộp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CHECKOUT & PAYMENT MODAL */}
      {showPaymentModal && currentActiveOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`${cm.cardBg} rounded-2xl max-w-lg w-full p-6 border ${cm.borderClass} shadow-2xl animate-scale-up my-8 text-xs`}>
            
            {/* Header */}
            <div className={`flex justify-between items-center border-b ${cm.borderClass} pb-3 mb-4`}>
              <div>
                <span className="text-[9px] text-orange-650 font-black uppercase tracking-wider block">Thủ tục kết toán hóa đơn</span>
                <h3 className={`font-extrabold text-sm ${cm.textPrimary} flex items-center gap-1.5 uppercase`}>
                  🧾 Thanh toán & In Bill: {currentSelectedTableDetail?.name}
                </h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className={`${cm.textMuted} hover:opacity-85`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              
              {/* Box Left: Bill detail items */}
              <div>
                <h4 className={`font-bold uppercase tracking-wider ${cm.textMuted} mb-2 text-[9px]`}>Sản Phẩm Chi Tiết</h4>
                <div className={`max-h-[160px] overflow-y-auto border ${cm.borderClass} p-2 rounded-xl ${cm.secCardBg} bg-opacity-50 flex flex-col gap-1.5`}>
                  {currentActiveOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10.5px]">
                      <span className={`font-bold truncate max-w-[140px] ${cm.textSecondary}`}>{item.productName}</span>
                      <span className={`font-mono font-extrabold ${cm.textSecondary}`}>
                        {item.quantity} × {item.priceOnOrder.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={`mt-3 p-3 rounded-xl border ${cm.borderClass} ${cm.secCardBg}`}>
                  <div className="flex justify-between mb-1">
                    <span className={`${cm.textMuted} font-bold`}>Tổng tạm tính:</span>
                    <span className={`font-mono font-extrabold ${cm.textSecondary}`}>{rawSubTotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between mb-1 text-rose-500 font-semibold">
                    <span>Tổng giảm giá:</span>
                    <span className="font-mono font-extrabold">-{currentComputedDiscount.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className={`flex justify-between pt-1.5 border-t ${cm.borderClass} font-black ${cm.textPrimary} text-sm`}>
                    <span>Thực thanh toán:</span>
                    <span className="font-mono text-rose-500 font-black">
                      {finalCheckoutAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>

              {/* Box Right: Cashier payment inputs */}
              <div className="flex flex-col gap-3">
                <h4 className={`font-bold uppercase tracking-wider ${cm.textMuted} text-[9px]`}>Sổ Sách & Giảm Giá</h4>
                
                {/* Apply Promotion Code */}
                <div>
                  <label className={`text-[9.5px] font-bold uppercase block mb-1 ${cm.textMuted}`}>Ưu Đãi / Mã Khuyến Mãi:</label>
                  <select
                    value={selectedPromoCode}
                    onChange={(e) => setSelectedPromoCode(e.target.value)}
                    className={`w-full rounded-xl p-2 outline-none font-bold border ${cm.inputBg} ${cm.borderClass}`}
                  >
                    <option value="" className="text-slate-800">-- Không áp dụng --</option>
                    {promotions.filter(p => p.isActive && rawSubTotal >= p.minOrderValue).map(p => (
                      <option key={p.id} value={p.code} className="text-slate-800">
                        {p.code} (Giảm {p.value.toLocaleString('vi-VN')}{p.type === 'percentage' ? '%' : 'đ'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom discount VND */}
                <div>
                  <label className={`text-[9.5px] font-bold uppercase block mb-1 ${cm.textMuted}`}>Ủy quyền chiết khấu trực tiếp (đ):</label>
                  <input
                    type="number"
                    value={customDiscountAmt || ''}
                    placeholder="0"
                    onChange={(e) => setCustomDiscountAmt(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full rounded-xl p-2 outline-none font-mono font-bold border ${cm.inputBg} ${cm.borderClass}`}
                  />
                </div>

                {/* Payment Method Option */}
                <div>
                  <label className={`text-[9.5px] font-bold uppercase block mb-1.5 ${cm.textMuted}`}>Hình Thức Thanh Toán:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setPayingMethod('cod'); setIsPayAsDebt(false); }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition font-bold ${
                        payingMethod === 'cod' && !isPayAsDebt
                          ? 'border-orange-500 bg-orange-500/20 text-orange-650 font-black'
                          : `border ${cm.borderClass} ${cm.secCardBg} hover:opacity-85 ${cm.textSecondary}`
                      }`}
                    >
                      <Coins className="w-5 h-5 text-orange-500" />
                      <span>Tiền Mặt (Cash)</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => { setPayingMethod('banking'); setIsPayAsDebt(false); }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition font-bold ${
                        payingMethod === 'banking' && !isPayAsDebt
                          ? 'border-[#0078d4] bg-[#0078d4]/20 text-[#0078d4] font-black'
                          : `border ${cm.borderClass} ${cm.secCardBg} hover:opacity-85 ${cm.textSecondary}`
                      }`}
                    >
                      <QrCode className="w-5 h-5 text-[#0078d4]" />
                      <span>Chuyển Khoản</span>
                    </button>
                  </div>
                </div>

                {/* Debt (Ghi sổ nợ) */}
                <div className="mt-1 flex items-center justify-between p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pos-is-debt"
                      checked={isPayAsDebt}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsPayAsDebt(checked);
                        if (checked) {
                          setPayingMethod('cod'); // Treat as unpaid paper cod ledger
                          const currentOrder = currentActiveOrder;
                          if (currentOrder) {
                            const tName = currentSelectedTableDetail?.name || '';
                            const cName = currentOrder.customerName || '';
                            const cPhone = currentOrder.customerPhone || '';
                            
                            const cleanCName = cName.trim().toLowerCase();
                            const cleanTName = tName.trim().toLowerCase();
                            const cleanPhone = cPhone.replace(/\s+/g, '');
                            
                            const isDefaultName = cleanCName === '' || cleanCName === 'khách vãng lai' || cleanCName === 'khach vang lai' || (cleanTName && cleanCName === cleanTName);
                            const isDefaultPhone = cleanPhone === '0900000000' || cleanPhone === '';
                            
                            setDebtName(isDefaultName ? '' : cName);
                            setDebtPhone(isDefaultPhone ? '' : cPhone);
                            setDebtNote('');
                          }
                        }
                      }}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-black/10 cursor-pointer"
                    />
                    <label htmlFor="pos-is-debt" className="text-[10px] font-black text-rose-550 uppercase cursor-pointer">
                      Ghi Sổ Nợ Khách Hàng
                    </label>
                  </div>
                  <span className="text-[9px] text-rose-500 font-extrabold italic">Tính vào nợ SĐT</span>
                </div>

              </div>

            </div>

            {/* Advanced Input: Diners change calculation OR dynamic bank VietQR code generator */}
            {payingMethod === 'cod' && !isPayAsDebt ? (
              <div className={`p-3 rounded-xl border mb-5 text-[11px] ${cm.secCardBg} ${cm.borderClass}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bold ${cm.textSecondary}`}>Tiền khách đưa (đ):</span>
                  <input
                    type="text"
                    placeholder="vd: 200.000"
                    value={customerPaidCash}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setCustomerPaidCash(digits ? Number(digits).toLocaleString('vi-VN') : '');
                    }}
                    className={`rounded px-2 py-1 font-mono font-bold text-right w-40 border ${cm.inputBg} ${cm.borderClass}`}
                  />
                </div>
                {refundCashBack > 0 && (
                  <div className="flex justify-between items-center text-emerald-500 font-extrabold text-[12.5px] pt-1.5 border-t border-stone-300 border-dashed">
                    <span>Tiền thừa trả khách:</span>
                    <span className="font-mono font-black">{refundCashBack.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
              </div>
            ) : payingMethod === 'banking' && !isPayAsDebt ? (
              <div className="p-3 bg-[#e6f2fc]/10 rounded-xl border border-[#0078d4]/30 mb-5 flex flex-col sm:flex-row items-center gap-4 text-slate-300">
                {/* Simulated Real Dynamic Bank QRCode using VietQR APIs */}
                <div className="w-28 h-28 bg-white p-2 rounded-xl border border-[#0078d4]/20 shrink-0 flex items-center justify-center shadow-xs">
                  {storeConfig.bankAccount && storeConfig.bankName ? (
                    (() => {
                      const isDynamicQr = storeConfig.useDynamicQrAmount !== false;
                      const qrUrl = isDynamicQr
                        ? `https://img.vietqr.io/image/${getVietQrBankId(storeConfig.bankName)}-${storeConfig.bankAccount.replace(/\s+/g, '')}-compact.png?amount=${finalCheckoutAmount}&addInfo=${currentActiveOrder.billCode}%20thanh%20toan%20${currentSelectedTableDetail?.name}&accountName=${encodeURIComponent(storeConfig.bankAccountName || 'Khai Vi Diner')}`
                        : `https://img.vietqr.io/image/${getVietQrBankId(storeConfig.bankName)}-${storeConfig.bankAccount.replace(/\s+/g, '')}-compact.png?amount=0`;
                      return (
                        <img
                          referrerPolicy="no-referrer"
                          src={qrUrl}
                          alt="VietQR code"
                          className="w-full h-full object-contain"
                        />
                      );
                    })()
                  ) : (
                    <QrCode className="w-12 h-12 text-[#0078d4] animate-pulse" />
                  )}
                </div>
                <div>
                  <h4 className="font-black text-[#0078d4] uppercase text-[10px] tracking-tight mb-1">
                    {storeConfig.useDynamicQrAmount !== false ? "Mã Quét VietQR Thanh Toán" : "Mã Quét VietQR Tài Khoản Tiệm"}
                  </h4>
                  <p className={`text-[10px] leading-relaxed ${cm.textSecondary}`}>
                    {storeConfig.useDynamicQrAmount !== false ? (
                      <>Mã QR trên được tạo <strong>hoàn toàn chính xác</strong> cho số tiền tài khoản ngân hàng của quán:</>
                    ) : (
                      <>Mã QR tài khoản của quán. <strong>Khách quét để nhận diện tài khoản, có thể tự nhập số tiền và nội dung tùy ý</strong> (thuận tiện để thưởng thêm/tip nhé!):</>
                    )}
                  </p>
                  <p className={`text-[10px] font-bold mt-1 ${cm.textSecondary}`}>
                    🏦 {storeConfig.bankName} • STK: {storeConfig.bankAccount}
                  </p>
                  {storeConfig.useDynamicQrAmount !== false ? (
                    <p className="text-[10px] font-mono text-[#0078d4] mt-0.5 font-bold">
                      Nội dung quét: "{currentActiveOrder.billCode} thanh toan {currentSelectedTableDetail?.name}"
                    </p>
                  ) : (
                    <div className="text-[9.5px] text-emerald-600 mt-1 space-y-0.5 leading-snug">
                      <p className="font-bold">💡 Hướng dẫn khách tự nhập:</p>
                      <p>• Số tiền cần trả: <strong className="text-orange-600 font-mono text-[10.5px]">{finalCheckoutAmount.toLocaleString('vi-VN')} đ</strong></p>
                      <p>• Nội dung chuyển khoản nên ghi: <strong className="text-blue-800 font-mono">"{currentActiveOrder.billCode} thanh toan {currentSelectedTableDetail?.name}"</strong></p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {isPayAsDebt ? (
              <div className={`p-4 rounded-2xl border border-dashed text-[11px] mb-5 ${cm.secCardBg} ${cm.borderClass} space-y-3`}>
                <p className={`text-[10px] font-extrabold uppercase tracking-wide ${cm.textSecondary}`}>THÔNG TIN BỔ SUNG</p>
                
                <div className="grid grid-cols-2 gap-3 text-[11px] relative">
                  <div className="relative">
                    <label className={`block font-extrabold text-[9px] uppercase mb-1 ${cm.textMuted}`}>Tên Khách</label>
                    <input
                      type="text"
                      value={debtName}
                      onFocus={() => setActiveSuggestionField('debt_name')}
                      onBlur={() => setTimeout(() => setActiveSuggestionField(null), 250)}
                      onChange={(e) => setDebtName(e.target.value)}
                      placeholder="Nhập tên khách..."
                      className={`w-full rounded-xl p-2 outline-none font-bold border ${cm.inputBg} ${cm.borderClass}`}
                    />
                    {activeSuggestionField === 'debt_name' && debtNameSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[999] divide-y divide-slate-100 dark:divide-slate-705">
                        {debtNameSuggestions.map((cust) => (
                          <button
                            key={cust.phone}
                            type="button"
                            onMouseDown={() => {
                              setDebtName(cust.name);
                              setDebtPhone(cust.phone);
                              setActiveSuggestionField(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-slate-700 text-[10px] flex justify-between items-center transition"
                          >
                            <span className="font-bold text-slate-700 dark:text-slate-200 block truncate max-w-[100px]">{cust.name}</span>
                            <span className="text-slate-400 dark:text-slate-400 font-mono text-[9px] shrink-0">{cust.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className={`block font-extrabold text-[9px] uppercase mb-1 ${cm.textMuted}`}>Số Điện Thoại</label>
                    <input
                      type="text"
                      value={debtPhone}
                      onFocus={() => setActiveSuggestionField('debt_phone')}
                      onBlur={() => setTimeout(() => setActiveSuggestionField(null), 250)}
                      onChange={(e) => setDebtPhone(e.target.value)}
                      placeholder="Nhập SĐT..."
                      className={`w-full rounded-xl p-2 outline-none font-bold font-mono border ${cm.inputBg} ${cm.borderClass}`}
                    />
                    {activeSuggestionField === 'debt_phone' && debtPhoneSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[999] divide-y divide-slate-100 dark:divide-slate-705">
                        {debtPhoneSuggestions.map((cust) => (
                          <button
                            key={cust.phone}
                            type="button"
                            onMouseDown={() => {
                              setDebtName(cust.name);
                              setDebtPhone(cust.phone);
                              setActiveSuggestionField(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-slate-700 text-[10px] flex justify-between items-center transition"
                          >
                            <span className="font-bold text-slate-700 dark:text-slate-200 block truncate max-w-[100px]">{cust.name}</span>
                            <span className="text-slate-400 dark:text-slate-400 font-mono text-[9px] shrink-0">{cust.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={`block font-extrabold text-[9px] uppercase mb-1 ${cm.textMuted}`}>Yêu Cầu Nhà Bếp / Ghi chú</label>
                  <input
                    type="text"
                    value={debtNote}
                    onChange={(e) => setDebtNote(e.target.value)}
                    placeholder="vd: không cay, nhiều đá..."
                    className={`w-full rounded-xl p-2 outline-none font-medium border ${cm.inputBg} ${cm.borderClass}`}
                  />
                </div>
              </div>
            ) : null}

            {/* Drawer Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className={`flex-1 py-2.5 rounded-xl border ${cm.borderClass} ${cm.secCardBg} hover:opacity-85 font-bold ${cm.textMuted} transition`}
              >
                Hủy Bỏ
              </button>
              
              <button
                type="button"
                onClick={handleFinalizePayment}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wide transition shadow-md"
              >
                ✓ Hoàn Tất Giao Dịch
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. BILL INVOICE THERMAL PRINT MODAL */}
      {showPrintPreview && printBillData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#2a2a2a] rounded-2xl max-w-sm w-full p-6 border border-zinc-700 shadow-2xl animate-scale-up text-xs text-white">
            
            {/* Header controls */}
            <div className="flex justify-between items-center pb-3 border-b border-zinc-700 mb-4">
              <h3 className="font-extrabold text-[#66fcf1] flex items-center gap-1">
                <Printer className="w-4 h-4" /> IN PHIẾU THANH TOÁN
              </h3>
              <button
                onClick={() => { setShowPrintPreview(false); setPrintBillData(null); }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRINT OPTIMIZED CONTAINER: Thermostatic layout replica */}
            <div 
              id="thermal-receipt-content"
              className="bg-white p-5 rounded font-mono shadow-inner text-[10px] max-h-[420px] overflow-y-auto relative print-preview-scroll-strip border-4 border-slate-300"
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
            >
              
              {/* Thermal receipt header */}
              <div className="text-center mb-4 pb-3 border-b border-dashed border-stone-400" style={{ borderColor: '#a8a29e' }}>
                <h1 className="font-black text-xs uppercase tracking-tight" style={{ color: '#0f172a' }}>{storeConfig.name || 'QUÁN KHAI VỊ'}</h1>
                <p className="text-[8px] mt-1" style={{ color: '#78716c' }}>{storeConfig.address || '93 Khai Vị, TP. Hồ Chí Minh'}</p>
                <p className="text-[8px]" style={{ color: '#78716c' }}>ĐT Zalo: {storeConfig.zaloHotline || storeConfig.phone}</p>
                
                <h2 className="font-extrabold text-xs uppercase tracking-wide mt-3 pb-1 border-y border-stone-300 py-1 inline-block" style={{ color: '#0f172a', borderColor: '#d6d3d1' }}>
                  HÓA ĐƠN THANH TOÁN
                </h2>
                
                <div className="text-left mt-3 space-y-0.5 text-[8.5px]" style={{ color: '#475569' }}>
                  <p>Mã hóa đơn: <strong className="font-mono" style={{ color: '#1e293b' }}>{printBillData.billCode}</strong></p>
                  <p>Bàn phục vụ: <strong style={{ color: '#1e293b' }}>{printBillData.customerAddress}</strong></p>
                  <p>Ngày lập: {new Date(printBillData.createdAt).toLocaleString('vi-VN')}</p>
                  <p>Nhân viên: POS-Cashier-01</p>
                </div>
              </div>

              {/* Items Table details */}
              <div className="space-y-2 mb-4">
                <div className="grid grid-cols-12 gap-1 font-bold text-[8.5px] pb-1.5 border-b border-dashed border-stone-300 uppercase" style={{ color: '#0f172a', borderColor: '#d6d3d1' }}>
                  <span className="col-span-6 text-left">Tên món</span>
                  <span className="col-span-2 text-center">SL</span>
                  <span className="col-span-4 text-right">Tổng</span>
                </div>

                <div className="space-y-1.5 py-1 border-b border-dashed border-stone-300" style={{ borderColor: '#d6d3d1' }}>
                  {printBillData.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1 text-[8.5px]">
                      <span className="col-span-6 font-bold" style={{ color: '#1e293b' }}>{item.productName}</span>
                      <span className="col-span-2 text-center" style={{ color: '#475569' }}>x{item.quantity}</span>
                      <span className="col-span-4 text-right font-mono" style={{ color: '#1e293b' }}>
                        {(item.quantity * item.priceOnOrder).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receipts stats summation */}
              <div className="space-y-1.5 text-right font-semibold text-[8.5px] border-b border-dashed border-stone-400 pb-3" style={{ color: '#475569', borderColor: '#a8a29e' }}>
                <div className="flex justify-between">
                  <span>Cộng tiền hàng:</span>
                  <span className="font-mono">{printBillData.subTotal.toLocaleString('vi-VN')} đ</span>
                </div>
                {printBillData.discountAmount > 0 && (
                  <div className="flex justify-between" style={{ color: '#e11d48' }}>
                    <span>Chiết khấu mã/Tay:</span>
                    <span className="font-mono">-{printBillData.discountAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                
                <div className="flex justify-between font-black text-xs pt-1 border-t border-stone-200" style={{ color: '#0f172a', borderColor: '#e7e5e4' }}>
                  <span className="uppercase font-extrabold text-[9.5px]">Tổng thanh toán:</span>
                  <span className="font-mono text-xs">
                    {printBillData.totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="flex justify-between font-bold text-[8.5px] pt-1" style={{ color: '#64748b' }}>
                  <span>Trạng thái thanh toán:</span>
                  <span className="uppercase font-bold" style={{ color: '#1e293b' }}>
                    {printBillData.paymentStatus === 'debt' 
                      ? `Ghi Sổ Nợ (${printBillData.customerName || 'Khách'}${printBillData.customerPhone ? ' - ' + printBillData.customerPhone : ''})` 
                      : 'Đã Thanh Toán ✓'}
                  </span>
                </div>
              </div>

              {/* Receipt footer */}
              <div className="text-center mt-4 text-[8px] space-y-1" style={{ color: '#78716c' }}>
                <p className="font-black italic text-[9px]" style={{ color: '#1e293b' }}>Cảm ơn quý khách và hẹn gặp lại!</p>
              </div>

            </div>

            {/* Printing system actions */}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { setShowPrintPreview(false); setPrintBillData(null); }}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 font-bold text-zinc-300 transition text-[10px] uppercase shadow-lg border border-zinc-700"
              >
                Đóng Lại
              </button>
              
              <button
                onClick={handleSaveReceiptAsImage}
                className="flex-[1.5] py-3 rounded-xl bg-[#66fcf1] hover:bg-[#45f3ff] text-zinc-900 font-extrabold font-mono transition text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_4px_15px_rgba(102,252,241,0.4)] active:scale-95"
              >
                <Download className="w-4 h-4 shrink-0" /> Lưu Ảnh Hóa Đơn (JPG)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal for deleting items */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-xs ${cm.cardBg} rounded-2xl p-6 shadow-2xl border-2 ${cm.activeCard} animate-in fade-in zoom-in duration-200`}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className={`text-lg font-black ${cm.textPrimary} mb-2 uppercase tracking-tight`}>Xóa món ăn?</h3>
              <p className={`text-xs ${cm.textSecondary} leading-relaxed`}>
                Bạn có chắc chắn muốn xóa món <strong>"{itemToDelete.productName}"</strong> khỏi đơn hàng không?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setItemToDelete(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${cm.secCardBg} hover:opacity-80 transition`}
              >
                Bỏ qua
              </button>
              <button
                onClick={confirmDeleteItem}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-100 transition"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
