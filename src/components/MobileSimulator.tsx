import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, 
  ShoppingBag, 
  X, 
  Plus, 
  Minus, 
  CheckCircle, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  CreditCard, 
  Info,
  Gift,
  ArrowRight,
  ClipboardCheck,
  Smartphone,
  ExternalLink,
  ClipboardList,
  History,
  Calendar,
  ArrowLeft,
  Clock,
  MessageCircle
} from 'lucide-react';
import { Product, Category, Order, StoreConfig, Promotion, CartItem, CustomerCookieData, Table } from '../types';
import { setCustomerCookie, getCustomerCookie } from '../data';
import { getVietQrBankId } from '../utils';

interface MobileSimulatorProps {
  products: Product[];
  categories: Category[];
  promotions: Promotion[];
  storeConfig: StoreConfig;
  onAddOrder: (newOrder: Order) => Promise<void> | void;
  isStandaloneMobile?: boolean; // if true, render full layout directly
  onToggleAdminView?: () => void; // toggle to view admin on mobile devices
  viewMode?: 'menu' | 'history' | 'contact';
  onViewModeChange?: (mode: 'menu' | 'history' | 'contact') => void;
  orders?: Order[];
  tables?: Table[];
  onUpdateTables?: (tables: Table[]) => void;
  isAdminAuthenticated?: boolean;
}

export default function MobileSimulator({
  products,
  categories,
  promotions,
  storeConfig,
  onAddOrder,
  isStandaloneMobile = false,
  onToggleAdminView,
  viewMode,
  onViewModeChange,
  orders,
  tables,
  onUpdateTables,
  isAdminAuthenticated = false
}: MobileSimulatorProps) {
  // Controlled or uncontrolled view mode state
  const [internalViewMode, setInternalViewMode] = useState<'menu' | 'history' | 'contact'>('menu');
  const activeViewMode = viewMode !== undefined ? viewMode : internalViewMode;

  const handleViewModeChange = (mode: 'menu' | 'history' | 'contact') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
    setInternalViewMode(mode);
  };

  // Local customer orders
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  // Clipboard copy state & handler
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleCopyText = (text: string, label: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error(err);
    }
    document.body.removeChild(textArea);
  };

  // Load patient/order history on mount
  useEffect(() => {
    const historical = localStorage.getItem('bv_my_placed_orders_v3');
    if (historical) {
      try {
        setCustomerOrders(JSON.parse(historical));
      } catch (e) {
        console.error("Failed to parse previous customer orders:", e);
      }
    }
  }, []);

  // Keep customer orders up-to-date with live Firestore statuses
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    
    const historical = localStorage.getItem('bv_my_placed_orders_v3');
    if (historical) {
      try {
        const parsed: Order[] = JSON.parse(historical);
        let hasChanges = false;
        const updated = parsed.map(localOrder => {
          const live = orders.find(o => o.id === localOrder.id);
          if (live && (live.status !== localOrder.status || JSON.stringify(live) !== JSON.stringify(localOrder))) {
            hasChanges = true;
            return live;
          }
          return localOrder;
        });
        
        if (hasChanges) {
          setCustomerOrders(updated);
          localStorage.setItem('bv_my_placed_orders_v3', JSON.stringify(updated));
        }
      } catch (e) {
        console.error("Failed to sync customer orders with live data:", e);
      }
    }
  }, [orders]);

  // Navigation & UI States
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [promoError, setPromoError] = useState<string>('');
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string>('');

  // Shipping & Billing States
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerNote, setCustomerNote] = useState<string>('');
  const [wantsUtensils, setWantsUtensils] = useState<boolean>(false);
  const [utensilsCount, setUtensilsCount] = useState<number>(1);
  const [wantsDeliveryTime, setWantsDeliveryTime] = useState<boolean>(false);
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cod'); // 'cod' | 'banking'
  const [saveCookie, setSaveCookie] = useState<boolean>(true);

  // Checkout Success Bill State
  const [recentPlacedOrder, setRecentPlacedOrder] = useState<Order | null>(null);
  const [copiedBillText, setCopiedBillText] = useState<boolean>(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);

  // Table recognition state
  const [selectedTable, setSelectedTable] = useState<{id: string, name: string} | null>(null);

  // Table confirmation check-in states
  const [isTableConfirmed, setIsTableConfirmed] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const tId = params.get('tableId');
    if (!tId) return true; // No table, no check-in required
    return sessionStorage.getItem(`table_confirmed_${tId}`) === 'true';
  });

  // Direct access selection states (Ship or Booking)
  const [directSelection, setDirectSelection] = useState<'ship' | 'booking' | null>(() => {
    const val = sessionStorage.getItem('direct_selection');
    return (val === 'ship' || val === 'booking') ? val as 'ship' | 'booking' : null;
  });

  const [isDirectConfirmed, setIsDirectConfirmed] = useState<boolean>(() => {
    return sessionStorage.getItem('direct_confirmed') === 'true';
  });

  const [bookingTime, setBookingTime] = useState<string>(() => {
    return sessionStorage.getItem('booking_time') || '';
  });

  const [bookingGuests, setBookingGuests] = useState<string>(() => {
    return sessionStorage.getItem('booking_guests') || '';
  });

  // Restore direct access table on mount if verified
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tId = params.get('tableId');
    if (!tId) {
      const confirmed = sessionStorage.getItem('direct_confirmed') === 'true';
      const selection = sessionStorage.getItem('direct_selection');
      if (confirmed && selection) {
        if (selection === 'ship') {
          setSelectedTable({ id: 'SHIP', name: 'ĐƠN SHIP' });
        } else if (selection === 'booking') {
          setSelectedTable({ id: 'BOOKING', name: 'ĐƠN ĐẶT BÀN' });
        }
      }
    }
  }, []);

  const [checkInName, setCheckInName] = useState<string>('');
  const [checkInPhone, setCheckInPhone] = useState<string>('');
  const [checkInError, setCheckInError] = useState<string>('');

  const activeTableOrder = useMemo(() => {
    if (!selectedTable || !orders || orders.length === 0) return null;
    return orders.find(order => 
      order.tableId === selectedTable.id && 
      order.status !== 'completed' && 
      order.status !== 'cancelled'
    );
  }, [selectedTable, orders]);

  useEffect(() => {
    if (activeTableOrder) {
      setCheckInName(activeTableOrder.customerName || '');
      setCheckInPhone(activeTableOrder.customerPhone || '');
    } else {
      const cookieData = getCustomerCookie();
      if (cookieData && (cookieData.customerName || cookieData.customerPhone)) {
        setCheckInName(cookieData.customerName || '');
        setCheckInPhone(cookieData.customerPhone || '');
      }
    }
  }, [activeTableOrder]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tId = params.get('tableId');
    if (tId && tables && tables.length > 0) {
      const table = tables.find(t => t.id === tId);
      if (table) {
        setSelectedTable({ id: table.id, name: table.name });
        const confirmed = sessionStorage.getItem(`table_confirmed_${table.id}`) === 'true';
        setIsTableConfirmed(confirmed);
      }
    }
  }, [tables]);

  // Active theme state (flows directly from global store configuration database)
  const customerTheme = storeConfig.theme || 'standard';

  const themeStyles = {
    standard: {
      pageWrapper: 'w-full h-full flex flex-col bg-slate-50 relative',
      headerBg: 'pt-6 pb-4 px-5 bg-white border-b border-slate-100 z-10 shadow-xs',
      logoText: 'text-slate-800 italic font-black text-xl tracking-tight block uppercase',
      logoSubtext: 'text-[10px] text-orange-600 uppercase font-extrabold tracking-widest block',
      logoLetterBg: 'bg-orange-600 text-white shadow-md shadow-orange-100',
      textMuted: 'text-[10px] font-semibold text-slate-400 tracking-wider uppercase',
      tableBadge: 'bg-emerald-50 text-emerald-600 border border-emerald-100 font-black px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider',
      textMain: 'text-slate-800',
      titleText: 'text-slate-800 font-extrabold',
      card: 'bg-white p-3 rounded-2xl shadow-xs border border-slate-100 hover:border-orange-200 transition-colors flex gap-3',
      badge: 'bg-orange-50 text-orange-600 border border-orange-100 font-extrabold',
      accentText: 'text-orange-600 font-extrabold',
      btnAccent: 'px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-lg',
      btnAccentLg: 'w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl shadow-md transition-colors uppercase tracking-wider',
      btnSec: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold',
      tabActive: 'bg-orange-600 text-white shadow-md shadow-orange-100',
      tabInactive: 'bg-slate-100 text-slate-600 hover:bg-slate-201',
      input: 'w-full bg-slate-100 border border-slate-200 text-slate-800 focus:ring-2 focus:ring-orange-200 focus:bg-white',
      iconBg: 'bg-orange-50/70 text-orange-600',
      cartBadge: 'bg-orange-600 text-white',
      searchIcon: 'text-slate-400',
      menuBg: 'bg-slate-50/70',
      subtextClass: 'text-[9px] text-slate-400',
      subtextClass2: 'text-[9px] text-slate-300',
      divider: 'border-slate-100',
      statusCardBg: 'bg-slate-50/70'
    },
    vista: {
      pageWrapper: 'w-full h-full flex flex-col bg-gradient-to-br from-sky-100/30 via-slate-150 to-emerald-100/30 relative text-slate-800',
      headerBg: 'pt-6 pb-4 px-5 bg-white/75 backdrop-blur-md border-b border-white/50 z-10 shadow-[0_4px_12px_rgba(3,105,161,0.03),inset_0_1px_1px_rgba(255,255,255,0.7)]',
      logoText: 'text-sky-900 font-black text-xl tracking-tight block italic drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]',
      logoSubtext: 'text-[10px] text-sky-600 uppercase font-black tracking-widest block',
      logoLetterBg: 'bg-gradient-to-b from-sky-400 to-sky-600 text-white shadow-md border border-white/30',
      textMuted: 'text-[10px] font-bold text-slate-500 tracking-wider uppercase',
      tableBadge: 'bg-white/50 backdrop-blur-sm text-sky-600 border border-sky-100 font-black px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider',
      textMain: 'text-slate-800',
      titleText: 'text-sky-950 font-black',
      card: 'bg-white/70 backdrop-blur-md border border-white/60 shadow-[0_6px_15px_rgba(3,105,161,0.04),inset_0_1px_1px_rgba(255,255,255,0.7)] rounded-2xl p-3 flex gap-3 hover:translate-y-[-1px] transition-all duration-300',
      badge: 'bg-sky-50 text-sky-700 border border-sky-200 font-black',
      accentText: 'text-sky-600 font-black',
      btnAccent: 'px-2.5 py-1 bg-gradient-to-b from-sky-400 via-sky-600 to-sky-700 hover:to-sky-650 text-white font-black border border-sky-600 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[50%] before:bg-white/20 rounded-lg',
      btnAccentLg: 'w-full py-3 bg-gradient-to-b from-sky-400 via-sky-600 to-sky-700 hover:to-sky-650 text-white font-black border border-sky-600 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[50%] before:bg-white/20 rounded-xl shadow-md transition-colors uppercase tracking-wider',
      btnSec: 'bg-gradient-to-b from-white to-slate-100/95 text-slate-705 border border-slate-250 hover:border-slate-350 shadow-xs font-bold rounded-lg',
      tabActive: 'bg-gradient-to-b from-sky-400 via-sky-600 to-sky-700 text-white shadow-[0_2px_6px_rgba(3,105,161,0.25)] border border-sky-650 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[50%] before:bg-white/30 rounded-full',
      tabInactive: 'bg-gradient-to-b from-white to-slate-100/90 hover:from-white hover:to-slate-50 text-sky-850 hover:text-sky-950 border border-slate-200/80 hover:border-slate-300 shadow-xs rounded-full',
      input: 'w-full bg-white/80 border border-slate-250 hover:border-slate-350 focus:border-sky-500 text-slate-850 focus:bg-white focus:ring-1 focus:ring-sky-200 focus:outline-hidden',
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-100',
      cartBadge: 'bg-sky-600 text-white border border-white/20',
      searchIcon: 'text-sky-500/60',
      menuBg: 'bg-transparent',
      subtextClass: 'text-[9.5px] text-slate-500 font-black uppercase tracking-wider',
      subtextClass2: 'text-[9px] text-emerald-600 font-bold uppercase',
      divider: 'border-white/50',
      statusCardBg: 'bg-white/50 backdrop-blur-xs border border-white/30'
    },
    cyberpunk: {
      pageWrapper: 'w-full h-full flex flex-col bg-[#0b0c10] relative text-[#c5c6c7] font-mono',
      headerBg: 'pt-6 pb-4 px-5 bg-[#1f2833]/90 border-b border-[#45f3ff]/30 z-10 shadow-[0_2px_8px_rgba(0,0,0,0.5)]',
      logoText: 'text-[#66fcf1] font-black tracking-widest text-xl block italic drop-shadow-[0_0_3px_rgba(102,252,241,0.3)]',
      logoSubtext: 'text-[10px] text-amber-400 uppercase font-bold tracking-widest block',
      logoLetterBg: 'bg-[#66fcf1] text-[#0b0c10] shadow-[0_0_8px_rgba(102,252,241,0.5)] border border-transparent font-black',
      textMuted: 'text-[9px] font-mono font-bold tracking-widest text-[#66fcf1]/50 uppercase',
      tableBadge: 'bg-[#0b0c10] text-[#66fcf1] border border-[#66fcf1]/40 font-black px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider shadow-[0_0_5px_rgba(102,252,241,0.2)]',
      textMain: 'text-[#c5c6c7]',
      titleText: 'text-[#66fcf1] font-black tracking-wider uppercase',
      card: 'bg-[#1f2833]/95 border border-[#45f3ff]/20 shadow-[0_3px_10px_rgba(0,0,0,0.4)] rounded-xl p-3 flex gap-3 hover:border-[#45f3ff]/50 transition-all duration-300',
      badge: 'bg-[#0b0c10] text-[#66fcf1] border border-[#66fcf1]/20 font-bold',
      accentText: 'text-[#66fcf1] font-black',
      btnAccent: 'px-2.5 py-1 bg-[#66fcf1] text-[#0b0c10] font-black hover:bg-[#45f3ff] shadow-[0_0_8px_rgba(102,252,241,0.35)] hover:shadow-[0_0_15px_rgba(69,243,255,0.6)] border border-transparent rounded-lg',
      btnAccentLg: 'w-full py-3 bg-[#66fcf1] text-[#0b0c10] font-black hover:bg-[#45f3ff] shadow-[0_0_10px_rgba(102,252,241,0.45)] border border-transparent rounded-xl transition-all uppercase tracking-wider',
      btnSec: 'bg-[#12161f] hover:bg-[#1a1f26] text-[#c5c6c7] border border-[#2c3540] hover:border-[#66fcf1]/30 font-bold rounded-lg',
      tabActive: 'bg-[#66fcf1] text-[#0b0c10] font-black border border-[#66fcf1] shadow-[0_0_8px_rgba(102,252,241,0.25)] rounded-full',
      tabInactive: 'bg-[#12161f] hover:bg-[#1a1f26] text-[#c5c6c7]/80 hover:text-white border border-[#2c3540] hover:border-[#66fcf1]/20 rounded-full',
      input: 'w-full bg-[#12171e] border border-[#2c3540] text-[#66fcf1] rounded-xl outline-none focus:border-[#66fcf1] placeholder-[#c5c6c7]/30 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] font-mono',
      iconBg: 'bg-[#1f2833] border border-[#66fcf1]/20 text-[#66fcf1]',
      cartBadge: 'bg-[#45f3ff] text-[#0b0c10] font-black',
      searchIcon: 'text-[#66fcf1]/50',
      menuBg: 'bg-transparent',
      subtextClass: 'text-[9px] text-amber-400 font-bold tracking-widest uppercase',
      subtextClass2: 'text-[9px] text-[#66fcf1]/50 font-bold tracking-wider',
      divider: 'border-[#2c3540]',
      statusCardBg: 'bg-[#12171e] border border-[#2c3540]'
    },
    win11: {
      pageWrapper: 'w-full h-full flex flex-col bg-[#f3f3f3] relative text-zinc-800 font-sans',
      headerBg: 'pt-6 pb-4 px-5 bg-white border-b border-zinc-200 z-10 shadow-xs',
      logoText: 'text-[#0078d4] font-bold text-xl tracking-tight block uppercase',
      logoSubtext: 'text-[10px] text-zinc-500 uppercase font-semibold tracking-wide block',
      logoLetterBg: 'bg-[#0078d4] text-white shadow-xs font-semibold',
      textMuted: 'text-[10px] font-semibold text-zinc-500 tracking-wide uppercase',
      tableBadge: 'bg-white text-[#0078d4] border border-zinc-200 font-black px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider shadow-xs',
      textMain: 'text-zinc-800',
      titleText: 'text-zinc-850 font-bold',
      card: 'bg-white p-3 rounded-xl shadow-xs border border-zinc-200/80 hover:border-[#0078d4]/50 transition-colors flex gap-3',
      badge: 'bg-[#e6f2fc] text-[#0078d4] border border-[#aae0fa]/40 font-semibold',
      accentText: 'text-[#0078d4] font-bold',
      btnAccent: 'px-2.5 py-1 bg-[#0078d4] hover:bg-[#0067b8] text-white font-semibold rounded-lg shadow-xs hover:shadow-sm',
      btnAccentLg: 'w-full py-3 bg-[#0078d4] hover:bg-[#0067b8] text-white font-semibold rounded-xl shadow-xs transition-colors uppercase tracking-wider',
      btnSec: 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200/80 font-medium rounded-lg',
      tabActive: 'bg-white text-[#0078d4] border-b-2 border-[#0078d4] font-bold rounded-none',
      tabInactive: 'bg-transparent text-zinc-550 hover:text-zinc-900 border-none rounded-none',
      input: 'w-full bg-white border border-zinc-300 text-zinc-800 focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] rounded-lg',
      iconBg: 'bg-[#e6f2fc] text-[#0078d4] border border-[#aae0fa]/30',
      cartBadge: 'bg-[#0078d4] text-white',
      searchIcon: 'text-zinc-400',
      menuBg: 'bg-transparent',
      subtextClass: 'text-[9px] text-[#0078d4] font-semibold uppercase',
      subtextClass2: 'text-[9px] text-zinc-400',
      divider: 'border-zinc-200',
      statusCardBg: 'bg-white border border-zinc-200'
    }
  };

  const c_theme = themeStyles[customerTheme];
  
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabsRef = useRef<HTMLDivElement>(null);
  const [isScrollingFromTab, setIsScrollingFromTab] = useState(false);

  // Hydrate user cookies data on load
  useEffect(() => {
    const cookieData = getCustomerCookie();
    if (cookieData && (cookieData.customerName || cookieData.customerPhone)) {
      setCustomerName(cookieData.customerName || '');
      setCustomerPhone(cookieData.customerPhone || '');
      setCustomerAddress(cookieData.customerAddress || '');
      setPaymentMethod(cookieData.paymentMethod || 'cod');
    } else if (customerOrders.length > 0) {
      // Fallback: Use the most recent order from history to pre-fill info
      const lastOrder = customerOrders[0];
      setCustomerName(lastOrder.customerName);
      setCustomerPhone(lastOrder.customerPhone);
      setCustomerAddress(lastOrder.customerAddress);
      setPaymentMethod(lastOrder.paymentMethod || 'cod');
    }
  }, [customerOrders]);

  // Filter products by search only
  const filteredProductsBySearch = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchQuery.trim() || 
                            product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => a.price - b.price);
  }, [products, searchQuery]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const catsInResults = Array.from(new Set(filteredProductsBySearch.map(p => p.categoryId)));
    // Use categories from props, and filter to those that have products in search results
    const sortedCats = [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    return sortedCats
      .filter(c => catsInResults.includes(c.id))
      .map(cat => ({
        category: cat,
        products: filteredProductsBySearch.filter(p => p.categoryId === cat.id)
      }));
  }, [filteredProductsBySearch, categories]);

  // Scroll spy to update active category tab
  useEffect(() => {
    const container = document.getElementById('mobile-menu-viewport');
    if (!container || searchQuery.trim() || activeViewMode !== 'menu') return;

    const handleScroll = () => {
      if (isScrollingFromTab) return;
      
      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top;
      
      // If at the very top, set to "all"
      if (container.scrollTop < 20) {
        if (activeCategory !== 'all') setActiveCategory('all');
        return;
      }
      
      // Get sections and sort them by their appearance order in top-to-bottom
      const sectionEntries = Object.entries(categoryRefs.current)
        .filter((entry): entry is [string, HTMLDivElement] => entry[1] !== null)
        .sort((a, b) => a[1].offsetTop - b[1].offsetTop);
        
      let foundActive = activeCategory;
      
      // Iterate through sections to find the one that has most recently reached or passed the top
      for (const [id, ref] of sectionEntries) {
        const rect = ref.getBoundingClientRect();
        
        // We consider a section "active" if its top is near or above the container's top
        // Threshold adjusted to be more responsive to the top of the viewport
        if (rect.top - containerTop <= 100) {
          foundActive = id;
        } else {
          break;
        }
      }
      
      if (foundActive !== activeCategory) {
        setActiveCategory(foundActive);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [groupedProducts, searchQuery, isScrollingFromTab, activeViewMode, activeCategory]);

  // Ensure active tab is visible in horizontal scroll
  useEffect(() => {
    if (tabsRef.current) {
      const activeTab = tabsRef.current.querySelector('.active-category-tab');
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategory]);

  // Initialize delivery time when wantsDeliveryTime is checked
  useEffect(() => {
    if (wantsDeliveryTime && !deliveryTime) {
      const now = new Date();
      const delivery = new Date(now.getTime() + 30 * 60 * 1000); // +30 mins
      const formatted = delivery.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
      setDeliveryTime(formatted);
    }
  }, [wantsDeliveryTime, deliveryTime]);

  const handleCategoryClick = (id: string) => {
    if (id === activeCategory) return;
    
    setActiveCategory(id);
    setIsScrollingFromTab(true);
    
    const container = document.getElementById('mobile-menu-viewport');
    
    if (id === 'all') {
      container?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const section = categoryRefs.current[id];
      if (section && container) {
        const containerRect = container.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        // Calculate the relative scroll position
        const scrollTarget = container.scrollTop + (sectionRect.top - containerRect.top);
        container.scrollTo({ top: scrollTarget - 2, behavior: 'smooth' });
      }
    }
    
    // Resume scroll spy after animation completes
    setTimeout(() => setIsScrollingFromTab(false), 1000);
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (item && item.quantity === 1 && delta === -1) {
        setItemToRemove(item);
        return prev;
      }
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const getCartCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);
  const getSubtotal = () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Discount calculation
  const getDiscountAmount = () => {
    const sub = getSubtotal();
    if (!appliedPromo) return 0;
    if (sub < appliedPromo.minOrderValue) return 0; // fallback in case cart items reduced

    if (appliedPromo.type === 'percentage') {
      return Math.round((sub * appliedPromo.value) / 100);
    } else {
      return appliedPromo.value; // fixed amount
    }
  };

  const getTotal = () => {
    const sub = getSubtotal();
    const discount = getDiscountAmount();
    return Math.max(0, sub - discount);
  };

  // Keep validation updated if cart prices or items change
  useEffect(() => {
    if (appliedPromo && getSubtotal() < appliedPromo.minOrderValue) {
      setAppliedPromo(null);
      setPromoSuccessMsg('');
      setPromoError(`Mã ${appliedPromo.code} yêu cầu đơn hàng từ ${appliedPromo.minOrderValue.toLocaleString('vi-VN')}đ.`);
    }
  }, [cart, appliedPromo]);

  // Handle promo apply
  const handleApplyPromo = () => {
    setPromoError('');
    setPromoSuccessMsg('');
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoError('Vui lòng nhập mã khuyến mãi');
      return;
    }

    const promo = promotions.find(p => p.code.toUpperCase() === code && p.isActive);
    if (!promo) {
      setPromoError('Mã giảm giá không chính xác hoặc đã hết hạn.');
      return;
    }

    const sub = getSubtotal();
    if (sub < promo.minOrderValue) {
      setPromoError(`Mã này chỉ áp dụng cho đơn hàng từ ${promo.minOrderValue.toLocaleString('vi-VN')}đ.`);
      return;
    }

    setAppliedPromo(promo);
    setPromoSuccessMsg(`Áp dụng mã ${promo.code} thành công!`);
  };

  // Submit Order logic
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || isPlacingOrder) return;

    if (!customerName.trim()) {
      alert('Vui lòng nhập họ và tên nhận hàng');
      return;
    }
    if (!customerPhone.trim()) {
      alert('Vui lòng nhập số điện thoại giao hàng');
      return;
    }
    if (!customerAddress.trim()) {
      alert('Vui lòng nhập địa chỉ giao hàng');
      return;
    }

    // Save details in cookie if requested
    if (saveCookie) {
      const cookieData: CustomerCookieData = {
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod
      };
      setCustomerCookie(cookieData);
    }

    const sub = getSubtotal();
    const discount = getDiscountAmount();
    const total = getTotal();

    // Prepare final note with utensil info if selected
    let finalNote = customerNote.trim();
    if (selectedTable?.id === 'BOOKING') {
      const bookingInfo = `[Đặt trước: ${bookingTime}]${bookingGuests ? ` [Khách: ${bookingGuests}]` : ''}`;
      finalNote = finalNote ? `${bookingInfo} | ${finalNote}` : bookingInfo;
    }

    if (wantsUtensils) {
      const utensilInfo = `[Dụng cụ: ${utensilsCount} người]`;
      finalNote = finalNote ? `${finalNote} ${utensilInfo}` : utensilInfo;
    }
    
    // Add delivery time to note if selected
    if (wantsDeliveryTime && deliveryTime) {
      const deliveryInfo = `[Giao lúc: ${deliveryTime}]`;
      finalNote = finalNote ? `${finalNote} ${deliveryInfo}` : deliveryInfo;
    }

    // Generate readable random bill code
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const billCode = `BV-${dateStr}${randSuffix}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      billCode,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      paymentMethod,
      tableId: selectedTable?.id,
      tableName: selectedTable?.name,
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        priceOnOrder: item.product.price
      })),
      subTotal: sub,
      discountAmount: discount,
      totalAmount: total,
      promoCodeUsed: appliedPromo?.code || undefined,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      note: finalNote || undefined
    };

    setIsPlacingOrder(true);
    try {
      // Direct integration await so the order registers on Firebase before success
      await onAddOrder(newOrder);
      setRecentPlacedOrder(newOrder);

      // Save order in customer orders local storage list
      const updatedCustomerOrders = [newOrder, ...customerOrders];
      setCustomerOrders(updatedCustomerOrders);
      localStorage.setItem('bv_my_placed_orders_v3', JSON.stringify(updatedCustomerOrders));

      // Reset customer cart and ui states
      setCart([]);
      setIsCartOpen(false);
      setPromoCode('');
      setAppliedPromo(null);
      setPromoSuccessMsg('');
      setCustomerNote('');
      setWantsUtensils(false);
      setUtensilsCount(1);
      setWantsDeliveryTime(false);
      setDeliveryTime('');
    } catch (firebaseErr: any) {
      console.error("Firestore Upload Error caught:", firebaseErr);
      alert('⚠️ GỬI ĐƠN HÀNG LÊN CLOUD THẤT BẠI!\n\nHệ thống không thể tải đơn hàng lên máy chủ Google Firestore.\nDo lỗi: ' + (firebaseErr.message || String(firebaseErr)) + '\n\nChúng tôi vẫn lưu tạm lịch sử đơn hàng này trên trình duyệt điện thoại của bạn.');
      
      // Still allow placement locally so they don't lose progress, but warn
      setRecentPlacedOrder(newOrder);
      const updatedCustomerOrders = [newOrder, ...customerOrders];
      setCustomerOrders(updatedCustomerOrders);
      localStorage.setItem('bv_my_placed_orders_v3', JSON.stringify(updatedCustomerOrders));
      
      setCart([]);
      setIsCartOpen(false);
      setPromoCode('');
      setAppliedPromo(null);
      setPromoSuccessMsg('');
      setCustomerNote('');
      setWantsUtensils(false);
      setUtensilsCount(1);
      setWantsDeliveryTime(false);
      setDeliveryTime('');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Generate complete formatted text invoice for Zalo clipboard sharing
  const generateZaloBillText = (order: Order) => {
    const itemsText = order.items.map(item => 
      `- ${item.productName} (x${item.quantity}): ${(item.priceOnOrder * item.quantity).toLocaleString('vi-VN')}đ`
    ).join('\n');

    const promoText = order.promoCodeUsed 
      ? `Khuyến mãi: -${order.discountAmount.toLocaleString('vi-VN')}đ (${order.promoCodeUsed})` 
      : 'Khuyến mãi: Khác';

    const payMethodText = order.paymentMethod === 'cod' 
      ? 'Tiền mặt khi giao hàng (COD)' 
      : `Chuyển khoản (${storeConfig.bankName})`;

    const orderTimeFormatted = new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' ngày ' + new Date(order.createdAt).toLocaleDateString('vi-VN');

    return `=== ĐƠN HÀNG ${storeConfig.name?.toUpperCase() || 'BẾP VIỆT'} ONLINE SHIP ===
Mã Đơn: ${order.billCode}
Khách hàng: ${order.customerName}
SĐT liên hệ: ${order.customerPhone}
Địa chỉ giao: ${order.customerAddress}
Giờ đặt: ${orderTimeFormatted}
-------------------------------
CHI TIẾT MÓN ĂN:
${itemsText}
-------------------------------
Tạm tính: ${order.subTotal.toLocaleString('vi-VN')}đ
${order.promoCodeUsed ? `${promoText}\n` : ''}Tổng thanh toán: ${order.totalAmount.toLocaleString('vi-VN')}đ
Thanh toán: ${payMethodText}
${order.note ? `Ghi chú khách: ${order.note}\n` : ''}-------------------------------
Hotline cửa hàng: ${storeConfig.zaloHotline}
Cảm ơn quý khách đã tin cậy nâng niu khẩu vị cùng ${storeConfig.name || 'Quán Nhậu KHAI VỊ'}!`;
  };

  // Copy structured bill to clipboard and redirect to Zalo chat client
  const handleZaloShare = (order: Order) => {
    const billText = generateZaloBillText(order);
    
    // Attempt standard navigator clipboard copy with fallback
    if (navigator.clipboard) {
      navigator.clipboard.writeText(billText)
        .then(() => {
          setCopiedBillText(true);
          setTimeout(() => setCopiedBillText(false), 4000);
        })
        .catch(err => {
          console.error('Could not copy text to clipboard: ', err);
        });
    } else {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = billText;
      textArea.style.position = "fixed"; 
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedBillText(true);
        setTimeout(() => setCopiedBillText(false), 4000);
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
    }

    // Direct url to zalo.me/0969320229 or dynamic API
    setTimeout(() => {
      window.open(`https://zalo.me/${storeConfig.zaloHotline}`, '_blank');
    }, 800);
  };

  const getProductImageSymbol = (product: Product) => {
    if (product.image && (product.image.startsWith('data:image') || product.image.startsWith('http'))) {
      return (
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover rounded-[10px]"
        />
      );
    }
    return product.image || '🍛';
  };

  // Standard standalone mobile header/footer
  const showDirectOnboarding = !isAdminAuthenticated && !selectedTable && !isDirectConfirmed;

  return (
    <div className={`${c_theme.pageWrapper} ${!isStandaloneMobile ? 'h-[640px] overflow-hidden' : 'h-screen overflow-hidden'}`}>
      {/* Onboarding Selector Overlay for Direct Customer Visitors */}
      {showDirectOnboarding && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-slate-150 dark:border-slate-800 space-y-4 flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="text-center space-y-1.5">
              <div className="w-14 h-14 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto text-white select-none">
                <span className="text-2xl">🍲</span>
              </div>
              <p className="text-[9px] uppercase tracking-widest font-extrabold text-orange-600 block pt-1">Chào mừng bạn ghé thăm</p>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                {storeConfig.name || 'Quán của chúng tôi'}
              </h2>
              <p className="text-slate-400 dark:text-slate-500 text-[10.5px] leading-relaxed">
                Vui lòng chọn hình thức đặt món phía dưới để nhận món ngon nhanh nhất nhé!
              </p>
            </div>

            {/* Direct Selection Menu */}
            {!directSelection ? (
              <div className="space-y-3 py-2">
                <button
                  onClick={() => setDirectSelection('ship')}
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-orange-500 dark:hover:border-orange-500 bg-slate-50 hover:bg-orange-50/20 dark:bg-slate-950 transition-all flex items-center gap-3.5 text-left active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-xl shrink-0">
                    🚀
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-[12px] uppercase">Giao Hàng Tận Nơi</h3>
                    <p className="text-slate-400 dark:text-slate-550 text-[10px] leading-snug">Ship đồ ăn thức uống nóng hổi tận nhà, thanh toán khi nhận hàng.</p>
                  </div>
                </button>

                <button
                  onClick={() => setDirectSelection('booking')}
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-orange-500 dark:hover:border-orange-500 bg-slate-50 hover:bg-orange-50/20 dark:bg-slate-950 transition-all flex items-center gap-3.5 text-left active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-xl shrink-0">
                    📅
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-[12px] uppercase">Đặt Trước Bàn Ăn</h3>
                    <p className="text-slate-400 dark:text-slate-550 text-[10px] leading-snug">Chọn giờ đến & gọi trước món, đến bàn là có sẵn luôn không đợi.</p>
                  </div>
                </button>
              </div>
            ) : (
              /* Information Entry Form based on selection */
              <div className="space-y-3.5 pt-1">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    {directSelection === 'ship' ? '🚀 ĐƠN SHIP TẬN NƠI' : '📅 ĐẶT BÀN TRƯỚC'}
                  </span>
                  <button 
                    onClick={() => {
                      setDirectSelection(null);
                      setCheckInError('');
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-orange-600 flex items-center gap-1"
                  >
                    ← Chọn lại
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên người nhận *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400">👤</span>
                      <input
                        type="text"
                        required
                        placeholder="Nhập họ tên của bạn..."
                        value={checkInName}
                        onChange={(e) => {
                          setCheckInName(e.target.value);
                          if (checkInError) setCheckInError('');
                        }}
                        className="w-full rounded-xl py-2 pl-8 pr-3 text-[11px] font-bold border border-slate-250 dark:border-slate-700 outline-none focus:border-orange-500 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Số điện thoại *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400">📞</span>
                      <input
                        type="tel"
                        required
                        placeholder="Nhập số điện thoại liên hệ..."
                        value={checkInPhone}
                        onChange={(e) => {
                          setCheckInPhone(e.target.value);
                          if (checkInError) setCheckInError('');
                        }}
                        className="w-full rounded-xl py-2 pl-8 pr-3 text-[11px] font-black font-mono border border-slate-250 dark:border-slate-700 outline-none focus:border-orange-500 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>

                  {directSelection === 'ship' ? (
                    <div className="space-y-1 animate-in slide-in-from-top-1">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Địa chỉ giao hàng *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400">📍</span>
                        <input
                          type="text"
                          required
                          placeholder="Số nhà, tên đường, phường..."
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full rounded-xl py-2 pl-8 pr-3 text-[11px] font-medium border border-slate-250 dark:border-slate-700 outline-none focus:border-orange-500 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Giờ đến nhận *</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-slate-450 z-10 font-sans">⏰</span>
                          <input
                            type="text"
                            required
                            placeholder="Ví dụ: 19h tối"
                            value={bookingTime}
                            onChange={(e) => setBookingTime(e.target.value)}
                            className="w-full rounded-xl py-2 pl-7 pr-2 text-[10px] font-extrabold border border-slate-250 dark:border-slate-700 outline-none focus:border-orange-500 dark:bg-slate-950 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Số lượng khách</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-slate-450 z-10 font-sans">🪑</span>
                          <input
                            type="text"
                            placeholder="Ví dụ: 4 người"
                            value={bookingGuests}
                            onChange={(e) => setBookingGuests(e.target.value)}
                            className="w-full rounded-xl py-2 pl-7 pr-2 text-[10px] font-extrabold border border-slate-250 dark:border-slate-700 outline-none focus:border-orange-500 dark:bg-slate-950 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {checkInError && (
                    <p className="text-[9.5px] font-bold text-red-500 text-center animate-pulse">
                      ⚠️ {checkInError}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (!checkInName.trim()) {
                      setCheckInError('Vui lòng điền Họ và tên!');
                      return;
                    }
                    if (!checkInPhone.trim()) {
                      setCheckInError('Vui lòng điền Số điện thoại!');
                      return;
                    }
                    const cleanPhone = checkInPhone.trim().replace(/\s+/g, '');
                    if (cleanPhone.length < 9 || cleanPhone.length > 11) {
                      setCheckInError('SĐT không hợp lệ! Vui lòng nhập từ 9-11 số.');
                      return;
                    }

                    if (directSelection === 'ship' && !customerAddress.trim()) {
                      setCheckInError('Vui lòng điền Địa chỉ nhận hàng!');
                      return;
                    }

                    if (directSelection === 'booking' && !bookingTime.trim()) {
                      setCheckInError('Vui lòng điền Thời gian đến!');
                      return;
                    }

                    // Save verified details to cookie state
                    setCustomerName(checkInName.trim());
                    setCustomerPhone(cleanPhone);
                    
                    const addressVal = directSelection === 'ship' 
                      ? customerAddress.trim() 
                      : 'ĐẶT BÀN TRƯỚC (Booking)';
                    setCustomerAddress(addressVal);

                    // Set cookie
                    setCustomerCookie({
                      customerName: checkInName.trim(),
                      customerPhone: cleanPhone,
                      customerAddress: addressVal,
                      paymentMethod: paymentMethod
                    });

                    // Set table target dynamically
                    if (directSelection === 'ship') {
                      setSelectedTable({ id: 'SHIP', name: 'ĐƠN SHIP' });
                    } else {
                      setSelectedTable({ id: 'BOOKING', name: 'ĐƠN ĐẶT BÀN' });
                      sessionStorage.setItem('booking_time', bookingTime);
                      sessionStorage.setItem('booking_guests', bookingGuests);
                    }

                    // Confirm onboarding
                    setIsDirectConfirmed(true);
                    sessionStorage.setItem('direct_selection', directSelection);
                    sessionStorage.setItem('direct_confirmed', 'true');
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black rounded-xl text-[10px] tracking-wider uppercase shadow-md active:scale-[0.98] transition-all block text-center"
                >
                  Bắt đầu đặt món →
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Table Checking & Customer Identification Screen Overlay */}
      {selectedTable && !isTableConfirmed && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-slate-150 dark:border-slate-800 space-y-5 flex flex-col justify-between max-h-[90vh] overflow-y-auto">
            
            {/* Header / Table designation */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto text-white select-none relative">
                <span className="text-3xl animate-bounce">🪑</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-extrabold text-orange-600 block pt-1">Xác nhận gọi món tại bàn</p>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                {selectedTable.name}
              </h2>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] leading-relaxed">
                Chào mừng bạn đến với <strong className="text-slate-700 dark:text-slate-300 font-bold">{storeConfig.name || 'Quán'}</strong>. Vui lòng nhập thông tin để chúng tôi phục vụ bạn chính xác nhất.
              </p>
            </div>

            {/* Warning if table currently has active orders */}
            {activeTableOrder && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 space-y-1.5 animate-in slide-in-from-top-2 duration-300 pointer-events-auto">
                <p className="text-[10.5px] font-black text-amber-800 dark:text-amber-400 flex items-center gap-1">
                  ⚠️ BÀN ĐANG CÓ MÓN ĂN/UỐNG!
                </p>
                <p className="text-[9.5px] text-amber-700 dark:text-amber-500 leading-normal font-semibold">
                  Hiện tại bàn này đang có đơn hàng từ trước chưa hoàn tất thanh toán. Bạn muốn <strong>gọi thêm món</strong> vào bàn này đúng không?
                </p>
                <div className="flex gap-2 pt-1 font-sans">
                  <div className="text-[8px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md font-bold">
                    Khách: {activeTableOrder.customerName}
                  </div>
                  {activeTableOrder.customerPhone && (
                    <div className="text-[8px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md font-mono">
                      SĐT: {activeTableOrder.customerPhone}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inputs Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tên của bạn *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">👤</span>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên của bạn hoặc đoàn khách..."
                    value={checkInName}
                    onChange={(e) => {
                      setCheckInName(e.target.value);
                      if (checkInError) setCheckInError('');
                    }}
                    className={`w-full rounded-xl py-2.5 pl-9 pr-4 text-[11px] font-bold border outline-none transition-all ${
                      checkInError && !checkInName.trim()
                        ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:bg-slate-950 dark:text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Số điện thoại *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">📞</span>
                  <input
                    type="tel"
                    required
                    placeholder="Nhập số điện thoại liên hệ..."
                    value={checkInPhone}
                    onChange={(e) => {
                      setCheckInPhone(e.target.value);
                      if (checkInError) setCheckInError('');
                    }}
                    className={`w-full rounded-xl py-2.5 pl-9 pr-4 text-[11px] font-bold font-mono border outline-none transition-all ${
                      checkInError && !checkInPhone.trim()
                        ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-700 focus:border-orange-500 dark:bg-slate-950 dark:text-white'
                    }`}
                  />
                </div>
              </div>

              {checkInError && (
                <p className="text-[10px] font-bold text-red-500 animate-pulse text-center font-sans">
                  ⚠️ {checkInError}
                </p>
              )}
            </div>

            {/* Check-in submission action button */}
            <button
              onClick={() => {
                if (!checkInName.trim()) {
                  setCheckInError('Vui lòng nhập Tên của bạn / Tên nhóm!');
                  return;
                }
                if (!checkInPhone.trim()) {
                  setCheckInError('Vui lòng nhập Số điện thoại liên hệ!');
                  return;
                }
                const phoneClean = checkInPhone.trim().replace(/\s+/g, '');
                if (phoneClean.length < 9 || phoneClean.length > 11) {
                  setCheckInError('Số điện thoại không hợp lệ! Vui lòng nhập từ 9 - 11 chữ số.');
                  return;
                }

                // Proceed with successful check-in
                setCustomerName(checkInName.trim());
                setCustomerPhone(phoneClean);
                
                // Keep checkout details consistent
                setCustomerAddress('Tại bàn: ' + selectedTable.name);

                // Save to cookies
                setCustomerCookie({
                  customerName: checkInName.trim(),
                  customerPhone: phoneClean,
                  customerAddress: 'Tại bàn: ' + selectedTable.name,
                  paymentMethod: paymentMethod // current or default
                });

                // Set confirmed status
                setIsTableConfirmed(true);
                sessionStorage.setItem(`table_confirmed_${selectedTable.id}`, 'true');
              }}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black rounded-xl shadow-lg shadow-orange-500/10 active:scale-[0.98] transition-all uppercase tracking-wider text-[11px] block text-center"
            >
              {activeTableOrder ? 'Đồng ý & Gọi thêm món ✓' : 'Xác nhận vào gọi món →'}
            </button>

          </div>
        </div>
      )}

      {/* Floating Copy Feedback Toast */}
      {copiedText && (
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 bg-slate-800 text-white font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-xl z-50 flex items-center gap-1 animate-fade-in border border-slate-700">
          <span>✓</span> Đã sao chép {copiedText}
        </div>
      )}
      
      {/* Mobile Top Header */}
      <div className={`${c_theme.headerBg}`}>
        <div className="flex flex-col gap-1.5">
          {/* Top Bar: Logo, Name and Shop Status */}
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {storeConfig.logoUrl ? (
                <img 
                  src={storeConfig.logoUrl} 
                  alt="Logo" 
                  className="w-9 h-9 rounded-xl object-cover shrink-0 select-none shadow-sm border border-zinc-200/30"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-base uppercase shrink-0 ${c_theme.logoLetterBg}`}>
                  {storeConfig.name ? storeConfig.name.trim().charAt(0) : 'B'}
                </span>
              )}
              <div className="min-w-0 flex flex-col">
                <span className={`${c_theme.logoText} truncate text-[15px] leading-tight uppercase whitespace-nowrap`}>
                  {storeConfig.name || 'BẾP VIỆT'}
                </span>
                <div className="flex items-center gap-1">
                  <span className={`${c_theme.logoSubtext} text-[7px]`}>TRỰC TUYẾN</span>
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse block shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {selectedTable && (
                <div className={`${(c_theme as any).tableBadge} flex items-center gap-1 shadow-xs border hidden xs:flex py-0.5`}>
                  <span className="text-[10px]">🪑</span> {selectedTable.name}
                </div>
              )}
              {onToggleAdminView && (
                <button 
                  onClick={onToggleAdminView}
                  className={`p-1.5 rounded-xl transition-all shadow-xs border border-transparent hover:border-orange-200 ${c_theme.btnSec}`}
                  title="Vào Admin"
                >
                  <Smartphone className="w-3.5 h-3.5 text-orange-600" />
                </button>
              )}
              <button 
                onClick={() => cart.length > 0 && setIsCartOpen(true)}
                className={`p-1.5 relative rounded-xl transition-all shadow-xs border border-transparent ${c_theme.btnSec}`}
              >
                <ShoppingBag className="w-4.5 h-4.5 text-current" />
                {getCartCount() > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 font-mono text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce border-2 border-white ${c_theme.cartBadge}`}>
                    {getCartCount()}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="min-h-[38px]">
            {activeViewMode === 'menu' ? (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                {/* Searching Interface */}
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="Tìm món: gà, bò, lẩu..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full rounded-xl py-2 pl-9 pr-9 text-[11px] font-medium transition-all outline-none shadow-xs border border-slate-100 focus:border-orange-300 ${c_theme.input}`}
                  />
                  <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 transition-colors ${searchQuery ? 'text-orange-600' : c_theme.searchIcon}`} />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2 bg-slate-200/50 hover:bg-slate-300/50 rounded-full p-0.5 text-slate-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Dynamic Categories Scrollbar */}
                {!searchQuery && (
                  <div ref={tabsRef} className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 scroll-smooth">
                    <button
                      onClick={() => handleCategoryClick('all')}
                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all shrink-0 shadow-xs border ${
                        activeCategory === 'all'
                          ? `${c_theme.tabActive} active-category-tab border-transparent`
                          : `${c_theme.tabInactive} border-slate-100`
                      }`}
                    >
                      Tất cả
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id)}
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all shrink-0 flex items-center gap-1 shadow-xs border ${
                          activeCategory === cat.id
                            ? `${c_theme.tabActive} active-category-tab border-transparent`
                            : `${c_theme.tabInactive} border-slate-100`
                        }`}
                      >
                        <span className="text-xs shrink-0">{cat.icon}</span>
                        <span className="truncate max-w-[80px]">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : activeViewMode === 'history' ? (
              <div className="flex items-center gap-2.5 py-1 animate-in fade-in slide-in-from-left-2 duration-300 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 ${c_theme.iconBg}`}>
                  <ClipboardList className="w-5 h-5 text-current" />
                </div>
                <div className="min-w-0">
                  <h2 className={`font-black text-[11px] uppercase tracking-tight truncate ${c_theme.titleText}`}>Đơn hàng của tôi</h2>
                  <p className={`${c_theme.subtextClass} text-[8px] font-bold uppercase`}>Lịch sử {customerOrders.length} đơn</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 py-1 animate-in fade-in slide-in-from-left-2 duration-300 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 ${c_theme.iconBg}`}>
                  <Phone className="w-5 h-5 text-current" />
                </div>
                <div className="min-w-0">
                  <h2 className={`font-black text-[11px] uppercase tracking-tight truncate ${c_theme.titleText}`}>Liên hệ quán</h2>
                  <p className={`${c_theme.subtextClass} text-[8px] font-bold uppercase`}>Hotline & Địa chỉ</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Main Dishes Area */}
      {activeViewMode === 'menu' ? (
        <div 
          className={`flex-1 relative overflow-y-auto ${c_theme.menuBg} scroll-smooth ${
            getCartCount() > 0 
              ? (isStandaloneMobile ? 'pb-[210px]' : 'pb-[180px]') 
              : (isStandaloneMobile ? 'pb-16' : 'pb-20')
          }`} 
          id="mobile-menu-viewport"
        >
          {groupedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <span className="text-4xl mb-4">🔍</span>
              <p className="font-black text-sm text-slate-700 uppercase tracking-tight">Không tìm thấy món ăn!</p>
              <p className="text-[10px] text-slate-400 mt-2">Vui lòng thử tìm với từ khóa khác.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {groupedProducts.map(({ category, products: catProducts }) => (
                <div 
                  key={category.id} 
                  ref={el => categoryRefs.current[category.id] = el}
                  data-cat-id={category.id}
                  className="mb-2"
                >
                  <div className={`flex items-center gap-2 px-5 py-2.5 border-b shadow-xs ${c_theme.divider} bg-white`}>
                    <span className="text-sm shrink-0">{category.icon}</span>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${c_theme.accentText} flex-1 truncate`}>
                      {category.name}
                    </h4>
                    <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full uppercase shrink-0">
                      {catProducts.length} món
                    </span>
                  </div>
                  
                  <div className="px-3.5 pt-3.5 space-y-3.5">
                    {catProducts.map(product => (
                      <div 
                        key={product.id}
                        className={`${c_theme.card} relative overflow-hidden group active:scale-[0.99] transition-transform duration-200 ${!product.isAvailable ? 'opacity-60 grayscale-[0.3]' : ''}`}
                      >
                        {/* Product Image representation */}
                        <div className="relative w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center text-5xl shrink-0 select-none overflow-hidden border border-slate-100/50">
                          {getProductImageSymbol(product)}
                          {!product.isAvailable && (
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="bg-white/90 text-slate-900 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase transform -rotate-12 shadow-sm">Hết món</span>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0 flex flex-col py-0.5">
                          <div className="flex-1">
                            <h3 className={`font-black text-[13px] leading-tight mb-1 truncate ${!product.isAvailable ? 'text-slate-500' : 'text-slate-800'}`}>
                              {product.name}
                            </h3>
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mb-2">{product.description}</p>
                          </div>
                          
                          <div className="flex justify-between items-end gap-2 mt-auto">
                            <div className="flex flex-col">
                              <span className={`text-[13px] ${c_theme.accentText}`}>
                                {product.price.toLocaleString('vi-VN')}
                                <span className="text-[10px] ml-0.5">đ</span>
                              </span>
                            </div>
                            
                            {/* Action Button */}
                            {product.isAvailable && (
                              <div className="shrink-0">
                                {cart.find(c => c.product.id === product.id) ? (
                                  <div className={`flex items-center gap-1.5 rounded-xl p-0.5 shadow-xs border border-orange-100 ${c_theme.iconBg}`}>
                                    <button 
                                      onClick={() => updateQuantity(product.id, -1)}
                                      className={`w-6 h-6 flex items-center justify-center text-xs font-black shadow-xs rounded-lg active:scale-90 transition-transform ${c_theme.btnSec}`}
                                    >
                                      -
                                    </button>
                                    <span className={`text-xs font-black px-0.5 min-w-[14px] text-center ${c_theme.accentText}`}>
                                      {cart.find(c => c.product.id === product.id)?.quantity}
                                    </span>
                                    <button 
                                      onClick={() => addToCart(product)}
                                      className={`w-6 h-6 flex items-center justify-center text-xs font-black shadow-xs rounded-lg active:scale-90 transition-transform ${c_theme.btnAccent}`}
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => addToCart(product)}
                                    className={`py-1.5 px-4 rounded-xl text-[11px] font-black uppercase transition-all active:scale-95 flex items-center gap-1.5 shadow-sm hover:shadow-md ${c_theme.btnAccent}`}
                                  >
                                    + Thêm
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Simple operating notice */}
          <div className="mt-8 mb-4 text-center">
            <p className={c_theme.subtextClass}>Giờ phục vụ: {storeConfig.openHours} hằng ngày</p>
            <p className={`${c_theme.subtextClass2} mt-0.5`}>Cam kết nguyên liệu sạch, thơm nóng giao nhanh</p>
          </div>
        </div>
      ) : activeViewMode === 'history' ? (
        /* History View Area */
        <div 
          className="flex-1 overflow-y-auto px-4 pt-4 bg-slate-50/70 pb-20 animate-fade-in"
          id="mobile-history-viewport"
        >
          {customerOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-4 text-slate-400 select-none">
                📥
              </div>
              <p className="font-extrabold text-sm text-slate-700">Chưa có đơn hàng nào!</p>
              <p className="text-[10px] text-slate-400 mt-1.5 max-w-[240px] leading-relaxed">
                Các đơn hàng bạn đặt tại quán sẽ xuất hiện ở đây để bạn tiện theo dõi trạng thái món ăn.
              </p>
              <button 
                onClick={() => handleViewModeChange('menu')}
                className="mt-6 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[10px] rounded-xl shadow-md uppercase tracking-wider"
              >
                Trở lại Thực Đơn
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 pb-20">
              <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-1">
                Lịch sử đặt món ({customerOrders.length} đơn hàng)
              </p>
              {customerOrders.map((localOrder) => {
                const liveOrder = orders?.find(o => o.id === localOrder.id);
                const order = liveOrder || localOrder;
                const isPaidViaBank = order.paymentMethod === 'banking';
                const statusLabels: Record<string, { text: string, color: string, bg: string }> = {
                  'pending': { text: 'Chờ duyệt', color: 'text-orange-600', bg: 'bg-orange-50 border border-orange-100' },
                  'preparing': { text: 'Đang nấu', color: 'text-blue-600', bg: 'bg-blue-50 border border-blue-100' },
                  'delivering': { text: 'Đang giao', color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100' },
                  'shipping': { text: 'Đang giao', color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100' },
                  'completed': { text: 'Đã giao', color: 'text-green-600', bg: 'bg-green-50 border border-green-100' },
                  'cancelled': { text: 'Đã hủy', color: 'text-rose-600', bg: 'bg-rose-50 border border-rose-100' }
                };
                const statusMeta = statusLabels[order.status] || { text: 'Chờ duyệt', color: 'text-orange-600', bg: 'bg-orange-50 border border-orange-100' };

                const paymentStatusLabels: Record<string, { text: string, color: string, bg: string }> = {
                  'unpaid': { text: 'Chưa TT', color: 'text-amber-600', bg: 'bg-amber-50 border border-amber-100' },
                  'paid': { text: 'Đã TT', color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-100' },
                  'debt': { text: 'Ghi nợ', color: 'text-rose-600', bg: 'bg-rose-50 border border-rose-100' }
                };
                const payStatusMeta = paymentStatusLabels[order.paymentStatus || 'unpaid'] || paymentStatusLabels['unpaid'];

                return (
                  <div 
                    key={order.id}
                    className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-100 hover:border-slate-200 transition-colors space-y-2.5 relative overflow-hidden"
                  >
                    {/* Status badge in top-right corner */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-orange-600 font-extrabold text-[13px] block tracking-wide">
                          {order.billCode}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono">
                          {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider ${statusMeta.color} ${statusMeta.bg}`}>
                          {statusMeta.text}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider ${payStatusMeta.color} ${payStatusMeta.bg}`}>
                          {payStatusMeta.text}
                        </span>
                      </div>
                    </div>
                    {order.status === 'cancelled' && order.cancellationReason && (
                        <div className="bg-rose-50 p-2 rounded-lg text-[10px] text-rose-800 font-medium">
                            <strong>Lý do hủy:</strong> {order.cancellationReason}
                        </div>
                    )}

                    {/* Displayer for ordered dishes */}
                    <div className="bg-slate-50/70 p-2.5 rounded-xl text-xs text-slate-700 space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span className="font-medium text-slate-800">
                            {item.productName} <span className="text-slate-400 text-[10px]">x{item.quantity}</span>
                          </span>
                          <span className="font-mono text-slate-600">
                            {(item.priceOnOrder * item.quantity).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Technical values summary */}
                    <div className="flex justify-between items-center text-xs border-t border-slate-50 pt-2 font-medium">
                      <span className="text-[10px] text-slate-400">
                        Thanh toán: <span className="font-bold text-slate-600 uppercase">{order.paymentMethod === 'cod' ? 'COD' : 'Momo/Bank'}</span>
                      </span>
                      <span className="text-slate-800 font-extrabold text-[11px]">
                        Tổng: <span className="text-orange-600 text-sm font-mono">{order.totalAmount.toLocaleString('vi-VN')}đ</span>
                      </span>
                    </div>

                    {/* Utilities footer action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-50 shrink-0">
                      <button
                        onClick={() => handleZaloShare(order)}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-xl text-[9px] font-extrabold transition-colors flex items-center justify-center gap-1 uppercase"
                      >
                        <div className="w-3.5 h-3.5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[7.5px] font-black">Z</div>
                        Gửi lại Zalo
                      </button>

                      {isPaidViaBank && order.status === 'pending' ? (
                        <button
                          onClick={() => {
                            setRecentPlacedOrder(order);
                          }}
                          className="w-full bg-orange-50 hover:bg-orange-100 text-orange-600 py-2 rounded-xl text-[9px] font-extrabold transition-colors flex items-center justify-center gap-1 uppercase"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-current" />
                          Xem QR CK
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            // Copy complete details
                            const billText = generateZaloBillText(order);
                            const textArea = document.createElement("textarea");
                            textArea.value = billText;
                            textArea.style.position = "fixed"; 
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            try {
                              document.execCommand('copy');
                              alert(`Đã sao chép hóa đơn ${order.billCode} vào bộ nhớ tạm!`);
                            } catch (e) {
                              console.error(e);
                            }
                            document.body.removeChild(textArea);
                          }}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-[9px] font-extrabold transition-colors flex items-center justify-center gap-1 uppercase"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 text-current" />
                          Sao chép bill
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Contact/Liên hệ View Area */
        <div 
          className="flex-1 overflow-y-auto px-4 pt-4 bg-slate-50/70 pb-20 animate-fade-in text-slate-800"
          id="mobile-contact-viewport"
        >
          <div className="flex flex-col gap-4 pb-16">
            
            {/* 1. Shop Info & Operating Hours */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                  🏪
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Thông tin quán</h3>
                  <p className="text-[9px] text-slate-400 font-medium font-sans">Giới thiệu quán ăn của chúng tôi</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Store Name */}
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Tên cửa hàng</label>
                  <p className="font-black text-slate-850 text-xs">{storeConfig.name}</p>
                </div>

                {/* Address */}
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Địa chỉ quán</label>
                  <div className="flex items-start gap-1.5 justify-between">
                    <p className="font-medium text-slate-600 leading-normal text-[11px] max-w-[80%]">{storeConfig.address}</p>
                    <button 
                      onClick={() => handleCopyText(storeConfig.address, 'địa chỉ')}
                      className="text-[9px] font-extrabold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100/80 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Sao chép
                    </button>
                  </div>
                </div>

                {/* Operating Hours */}
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Thời gian mở cửa</label>
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px] mt-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase shrink-0">Đang phục vụ</span>
                    <span className="font-bold text-slate-800">{storeConfig.openHours}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Hotline & Zalo Contact Area */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3.5">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                  📞
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Hotline & Chat Zalo</h3>
                  <p className="text-[9px] text-slate-400 font-medium font-sans">Liên hệ khẩn cấp hoặc đặt trước</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100/50">
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Số Điện Thoại</span>
                    <p className="font-black text-slate-800 text-sm font-mono tracking-wider">{storeConfig.phone}</p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleCopyText(storeConfig.phone, 'hotline')}
                      className="text-[9px] font-extrabold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Sao chép
                    </button>
                    <a 
                      href={`tel:${storeConfig.phone.replace(/\s+/g, '')}`}
                      className="text-[9px] font-black uppercase text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs shadow-orange-100 flex items-center gap-1"
                    >
                      Gọi điện
                    </a>
                  </div>
                </div>

                {/* ZALO CHAT REDIRECT CLIENT BUTTON */}
                <div className="pt-1">
                  <a 
                    href={`https://zalo.me/${storeConfig.phone.replace(/\s+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#0068ff] hover:bg-[#005ad4] text-white py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-100/50 transition-all uppercase tracking-wide cursor-pointer text-center"
                  >
                    <MessageCircle className="w-4 h-4 fill-white text-transparent" />
                    Nhắn tin trực tuyến Zalo
                  </a>
                  <p className="text-[8px] text-center text-slate-400 mt-2 font-medium leading-relaxed">
                    *Khách hàng click để tự động chuyển sang ứng dụng Zalo bắt đầu trò chuyện trực tiếp với chúng tôi qua số điện thoại trên.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Bank Transfer Details & VietQR Code */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3.5">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                  💳
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Tài khoản thanh toán</h3>
                  <p className="text-[9px] text-slate-400 font-medium font-sans">Chuyển khoản thanh toán đơn hàng</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Account metadata Table */}
                <div className="space-y-2.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center text-[11px] pb-1.5 border-b border-slate-200/50">
                    <span className="text-slate-400 font-semibold">Tên ngân hàng</span>
                    <span className="font-extrabold text-slate-800">{storeConfig.bankName}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pb-1.5 border-b border-slate-200/50">
                    <span className="text-slate-400 font-semibold">Chủ tài khoản</span>
                    <span className="font-black text-slate-800 uppercase tracking-wide">{storeConfig.bankAccountName}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-semibold">Số tài khoản</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-850 font-mono tracking-wider">{storeConfig.bankAccount}</span>
                      <button 
                        onClick={() => handleCopyText(storeConfig.bankAccount, 'số tài khoản')}
                        className="text-[8px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                      >
                        Sao chép
                      </button>
                    </div>
                  </div>
                </div>

                {/* Real-time VietQR render */}
                <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 font-extrabold text-[8px] uppercase tracking-wider rounded-full mb-3">
                    Mã QR Thanh Toán Bằng Camera
                  </span>
                  
                  <div className="relative w-40 h-40 bg-white border border-slate-100 rounded-2xl p-2 flex items-center justify-center shadow-xs overflow-hidden">
                    <img 
                      src={storeConfig.customQrCodeUrl || `https://img.vietqr.io/image/${getVietQrBankId(storeConfig.bankName)}-${storeConfig.bankAccount?.replace(/\s+/g, '') || '0000'}-compact2.png?amount=0&addInfo=Thanh%20Toan%20Bep%20Viet`} 
                      alt="Quét để chuyển khoản" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <p className="text-[8.5px] text-center text-slate-400 font-bold max-w-[210px] leading-relaxed mt-2.5">
                    {storeConfig.customQrCodeUrl 
                      ? 'Hình ảnh mã QR thanh toán cá nhân được tải lên bởi cửa hàng.' 
                      : 'Quét nhanh để thanh toán không chạm. Hệ thống tự nhận diện ngân hàng nhận mà không cần nhập thủ công.'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Floating Cart Tab */}
      {getCartCount() > 0 && (
        <div className={`absolute ${isStandaloneMobile ? 'bottom-20' : 'bottom-4'} inset-x-4 bg-orange-600 text-white p-3 rounded-2xl shadow-xl shadow-orange-200 flex justify-between items-center z-10 animate-bounce-subtle`}>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2"
          >
            <div className="p-1.5 bg-white/20 rounded-lg relative">
              <ShoppingBag className="w-4 h-4 text-white" />
              <span className="absolute -top-1 -right-1 bg-white text-orange-600 text-[8px] font-extrabold w-3 h-3 rounded-full flex items-center justify-center">
                {getCartCount()}
              </span>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-white/95">Đang chọn {getCartCount()} món</p>
              <p className="text-xs font-extrabold block -mt-0.5">{getTotal().toLocaleString('vi-VN')}đ</p>
            </div>
          </button>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-white text-orange-600 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 uppercase tracking-wide hover:bg-orange-50 whitespace-nowrap"
          >
            Xem giỏ hàng <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Cart & Checkout Drawer Panel */}
      {isCartOpen && (
        <div className={`${isStandaloneMobile ? 'fixed' : 'absolute'} inset-0 bg-slate-900/40 z-50 flex flex-col justify-end ${isStandaloneMobile ? 'pb-[64px]' : ''}`}>
          <div className="bg-white w-full max-h-[95%] rounded-t-3xl shadow-[0_-15px_30px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-600" />
                <h2 className="font-bold text-sm text-slate-800">Giỏ hàng ({getCartCount()} món)</h2>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 bg-slate-200/60 hover:bg-slate-200 rounded-full text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Cart Content & Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              
              {/* Added Items List */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Món ăn đã chọn</p>
                <div className="divide-y divide-slate-100">
                  {cart.map(item => (
                    <div key={item.product.id} className="py-2.5 flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Remove or minimize the image part */}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-800">{item.product.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {item.product.price.toLocaleString('vi-VN')}đ / phần
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-6 h-6 bg-white text-slate-700 border border-slate-200 rounded flex items-center justify-center text-xs font-bold active:scale-95"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-slate-800 px-1 min-w-4 text-center">
                            {item.quantity}
                          </span>
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-6 h-6 bg-white text-slate-700 border border-slate-200 rounded flex items-center justify-center text-xs font-bold active:scale-95"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-bold text-slate-900">
                          {(item.product.price * item.quantity).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation Removal Modal */}
              {itemToRemove && (
                <div className="absolute inset-0 bg-slate-900/50 z-[60] flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-xl animate-fade-in">
                    <p className="text-sm font-bold text-slate-800 text-center mb-4">
                      Bạn có muốn xóa <span className="text-orange-600">"{itemToRemove.product.name}"</span> khỏi giỏ hàng?
                    </p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setItemToRemove(null)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={() => {
                          setCart(prev => prev.filter(i => i.product.id !== itemToRemove.product.id));
                          setItemToRemove(null);
                        }}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Promo code Section */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-orange-600" /> Mã khuyến mãi
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Mã: FREE_SHIP, GIAM10_PHO..." 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-orange-200 focus:bg-white outline-none uppercase text-slate-800"
                  />
                  <button 
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-bold transition-all shrink-0 uppercase"
                  >
                    Áp dụng
                  </button>
                </div>
                {promoError && <p className="text-[9px] text-red-500 font-semibold px-1">{promoError}</p>}
                {promoSuccessMsg && <p className="text-[9px] text-green-600 font-semibold px-1">{promoSuccessMsg}</p>}
              </div>

              {/* Delivery Checkout Info Form */}
              <form onSubmit={handlePlaceOrder} className="pt-3 border-t border-slate-100 space-y-3 pb-8">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-600" /> Thông tin giao hàng
                </p>

                <div className="space-y-2.5">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Họ và tên người nhận" 
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-1 focus:ring-orange-200 focus:bg-white transition-all outline-none text-slate-800"
                    />
                    <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <div className="relative">
                    <input 
                      type="tel" 
                      placeholder="Số điện thoại nhận hàng" 
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-1 focus:ring-orange-200 focus:bg-white transition-all outline-none text-slate-800 font-mono"
                    />
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Địa chỉ giao cụ thể" 
                      required
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-1 focus:ring-orange-200 focus:bg-white transition-all outline-none text-slate-800"
                    />
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ghi chú người bán (ví dụ: Không hành, nhiều ớt...)" 
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-1 focus:ring-orange-200 focus:bg-white transition-all outline-none text-slate-800"
                    />
                    <FileText className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  {/* Extra Options: Utensils and Delivery Time */}
                  <div className="py-0.5 space-y-2">
                    {/* Utensils Option */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={wantsUtensils}
                            onChange={(e) => setWantsUtensils(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight group-hover:text-orange-600 transition-colors">Thêm dụng cụ ăn uống</span>
                      </label>

                      {wantsUtensils && (
                        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                           <div className="flex items-center gap-1.5 bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                              <button 
                                type="button"
                                onClick={() => setUtensilsCount(Math.max(1, utensilsCount - 1))}
                                className="w-5 h-5 flex items-center justify-center bg-slate-50 text-slate-600 rounded-md active:scale-90"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="min-w-[14px] text-center text-[11px] font-black text-orange-600">{utensilsCount}</span>
                              <button 
                                type="button"
                                onClick={() => setUtensilsCount(Math.min(20, utensilsCount + 1))}
                                className="w-5 h-5 flex items-center justify-center bg-slate-50 text-slate-600 rounded-md active:scale-90"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                           </div>
                        </div>
                      )}
                    </div>

                    {/* Delivery Time Option */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={wantsDeliveryTime}
                            onChange={(e) => setWantsDeliveryTime(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight group-hover:text-orange-600 transition-colors">Chọn giờ giao hàng</span>
                      </label>

                      {wantsDeliveryTime && (
                        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                           <div className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-slate-200 shadow-sm">
                              <Clock className="w-3 h-3 text-orange-600 shrink-0" />
                              <input 
                                type="time" 
                                value={deliveryTime}
                                onChange={(e) => setDeliveryTime(e.target.value)}
                                className="bg-transparent border-none text-[11px] font-black text-orange-600 outline-none p-0 focus:ring-0 w-16"
                              />
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cookie Checkbox Option */}
                <div className="flex items-start gap-2 pt-1 font-sans">
                  <input 
                    type="checkbox" 
                    id="save_cookie" 
                    checked={saveCookie} 
                    onChange={(e) => setSaveCookie(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 accent-orange-600 focus:ring-orange-400 h-3.5 w-3.5"
                  />
                  <label htmlFor="save_cookie" className="text-[10px] font-medium text-slate-500 cursor-pointer select-none">
                    Ghi nhớ thông tin giao hàng của tôi cho lần sau <span className="text-orange-600 font-semibold">(Sử dụng Cookie)</span>
                  </label>
                </div>

                {/* Payment Method Selector */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-orange-600" /> Hình thức thanh toán
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-2.5 border rounded-xl text-left transition-all ${
                        paymentMethod === 'cod'
                          ? 'border-orange-600 bg-orange-50/50 text-orange-600 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 font-semibold'
                      }`}
                    >
                      <p className="text-[11px]">Tiền mặt COD</p>
                      <p className="text-[8px] text-slate-400 font-medium">Nhận hàng trả tiền</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('banking')}
                      className={`p-2.5 border rounded-xl text-left transition-all ${
                        paymentMethod === 'banking'
                          ? 'border-orange-600 bg-orange-50/50 text-orange-600 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 font-semibold'
                      }`}
                    >
                      <p className="text-[11px]">Chuyển khoản</p>
                      <p className="text-[8px] text-slate-400 font-medium">Quét mã QR ngân hàng</p>
                    </button>
                  </div>
                </div>

                {/* Display Banking Transfer Instructions if selected */}
                {paymentMethod === 'banking' && (
                  <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1 text-slate-700 animate-fade-in text-[10px] leading-relaxed">
                    <p className="font-bold text-blue-800 flex items-center gap-1">
                      <Info className="w-3 h-3 text-blue-700" /> HƯỚNG DẪN CHUYỂN KHOẢN NGÂN HÀNG:
                    </p>
                    <div className="pl-1 space-y-0.5 text-slate-600">
                      <p>🏦 Ngân hàng: <strong className="text-slate-800">{storeConfig.bankName}</strong></p>
                      <p>💳 Số tài khoản: <strong className="text-slate-800">{storeConfig.bankAccount}</strong></p>
                      <p>👤 Chủ tài khoản: <strong className="text-slate-800 uppercase">{storeConfig.bankAccountName}</strong></p>
                      <p>📝 Nội dung chuyển khoản cần ghi: <strong className="text-orange-600 text-[11px] font-mono font-bold tracking-wider">{customerName ? customerName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toUpperCase() : "TEN KHACH HANG"} Chuyen tien</strong></p>
                    </div>
                  </div>
                )}

                {/* Summary prices */}
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between items-center">
                    <span>Tạm tính ({getCartCount()} món)</span>
                    <span className="font-mono">{getSubtotal().toLocaleString('vi-VN')}đ</span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between items-center text-green-600 font-semibold">
                      <span>Giảm giá ({appliedPromo.code})</span>
                      <span className="font-mono">-{getDiscountAmount().toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-bold text-slate-800 pt-0.5 text-sm">
                    <span>Tổng thanh toán</span>
                    <span className="font-mono text-orange-600 text-base">{getTotal().toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                {/* Place Order CTA */}
                <button
                  type="submit"
                  disabled={isPlacingOrder}
                  className={`w-full text-white font-extrabold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 mt-4 uppercase text-xs tracking-wider shadow-md ${
                    isPlacingOrder 
                      ? 'bg-slate-500 cursor-not-allowed shadow-none' 
                      : 'bg-orange-600 hover:bg-orange-700 shadow-orange-100'
                  }`}
                >
                  {isPlacingOrder ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang gửi đơn lên đám mây...
                    </>
                  ) : (
                    `Xác nhận đặt hàng • ${getTotal().toLocaleString('vi-VN')}đ`
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Success Bill Modal Screen */}
      {recentPlacedOrder && (
        <div className={`${isStandaloneMobile ? 'fixed' : 'absolute'} inset-0 bg-white z-50 p-5 flex flex-col justify-between overflow-y-auto ${isStandaloneMobile ? 'pb-24' : ''}`}>
          
          <div className="space-y-4">
            
            {/* Success icon header */}
            <div className="text-center pt-4">
              <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md shadow-green-100">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h1 className="text-lg font-black text-slate-800">Đặt hàng thành công!</h1>
              <p className="text-[10px] text-slate-400 font-medium">{storeConfig.name || 'Quán Nhậu KHAI VỊ'} đã nhận đơn hàng và chuẩn bị chế biến</p>
            </div>

            {/* Bill Details Invoice */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 font-sans relative overflow-hidden">
              <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-black tracking-widest px-2 py-0.5 rounded-bl-lg uppercase">
                Hóa đơn chính thức
              </div>

              <div className="border-b border-dashed border-slate-200 pb-2 mb-2">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Mã đơn đặt hàng</p>
                <p className="text-sm font-black font-mono text-orange-600 tracking-wider -mt-0.5">{recentPlacedOrder.billCode}</p>
                <p className="text-[8px] text-slate-400 font-mono mt-0.5">Đặt lúc: {new Date(recentPlacedOrder.createdAt).toLocaleString('vi-VN')}</p>
              </div>

              {/* Items Table details */}
              <div className="space-y-1 mb-2 border-b border-slate-100 pb-2">
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Món ăn chi tiết</p>
                {recentPlacedOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-xs text-slate-700">
                    <span className="font-semibold line-clamp-1">{item.productName} <span className="text-slate-400 text-[10px]">x{item.quantity}</span></span>
                    <span className="font-mono shrink-0">{(item.priceOnOrder * item.quantity).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
              </div>

              {/* Customer summary */}
              <div className="text-[10px] space-y-0.5 text-slate-600 border-b border-slate-100 pb-2 mb-2">
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Thông tin giao nhận</p>
                <p>🙋‍♂️ Người nhận: <strong className="text-slate-800">{recentPlacedOrder.customerName}</strong></p>
                <p>📞 Điện thoại: <strong className="text-slate-800 font-mono">{recentPlacedOrder.customerPhone}</strong></p>
                <p>📍 Địa chỉ: <strong className="text-slate-800 line-clamp-1">{recentPlacedOrder.customerAddress}</strong></p>
                {recentPlacedOrder.note && <p>💬 Ghi chú: <strong className="text-slate-600 italic">"{recentPlacedOrder.note}"</strong></p>}
              </div>

              {/* Financial summary calculations */}
              <div className="text-[11px] text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span className="font-mono">{recentPlacedOrder.subTotal.toLocaleString('vi-VN')}đ</span>
                </div>
                {recentPlacedOrder.promoCodeUsed && (
                  <div className="flex justify-between text-green-600 font-bold">
                    <span>Mã giảm ({recentPlacedOrder.promoCodeUsed}):</span>
                    <span className="font-mono">-{recentPlacedOrder.discountAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="flex justify-between text-[13px] font-black text-orange-600 pt-1 border-t border-slate-100">
                  <span>Tổng thanh toán:</span>
                  <span className="font-mono">{recentPlacedOrder.totalAmount.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="text-[9px] font-semibold text-slate-500 mt-1 uppercase text-right">
                  Hình thức: {recentPlacedOrder.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : `Chuyển khoản Vietcombank`}
                </div>
              </div>
            </div>

            {/* Banking scan helper details after checkout */}
            {recentPlacedOrder.paymentMethod === 'banking' && (
              (() => {
                const isDynamicQr = storeConfig.useDynamicQrAmount !== false;
                const cleanAccount = storeConfig.bankAccount?.replace(/\s+/g, '') || '0000';
                const memoText = (recentPlacedOrder.customerName 
                  ? recentPlacedOrder.customerName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toUpperCase() 
                  : "TEN KHACH HANG") + " Chuyen tien";
                
                const qrUrl = storeConfig.customQrCodeUrl || (isDynamicQr
                  ? `https://img.vietqr.io/image/${getVietQrBankId(storeConfig.bankName)}-${cleanAccount}-compact2.png?amount=${recentPlacedOrder.totalAmount}&addInfo=${encodeURIComponent(memoText)}`
                  : `https://img.vietqr.io/image/${getVietQrBankId(storeConfig.bankName)}-${cleanAccount}-compact2.png?amount=0`);

                return (
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-slate-600 space-y-2">
                    <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1">🏦 Thao tác Chuyển khoản QR:</p>
                    <p className="text-[9px] leading-relaxed">
                      Ngân hàng: <strong>{storeConfig.bankName}</strong><br />
                      Số tài khoản: <strong>{storeConfig.bankAccount}</strong><br />
                      {isDynamicQr ? (
                        <>
                          Số tiền chuyển: <strong className="text-orange-600 text-[10px] font-mono">{recentPlacedOrder.totalAmount.toLocaleString('vi-VN')}đ</strong><br />
                          Nội dung chuyển khoản: <strong className="text-blue-800 font-mono font-bold">{memoText}</strong>
                        </>
                      ) : (
                        <>
                          Số tiền và nội dung: <strong className="text-emerald-700 block mb-1">Khách tự nhập (quý khách có thể điều chỉnh số tiền để tip thưởng thêm cho quán nhé!)</strong>
                          <span className="block border-t border-blue-100/60 pt-1 space-y-0.5">
                            • Số tiền cần trả: <strong className="text-orange-600 font-mono text-[10px]">{recentPlacedOrder.totalAmount.toLocaleString('vi-VN')}đ</strong> <br/>
                            • Nội dung chuyển khoản gợi ý: <strong className="text-blue-800 font-mono text-[9px]">{memoText}</strong>
                          </span>
                        </>
                      )}
                    </p>
                    {/* Visual QR Image */}
                    <div className="flex flex-col items-center justify-center bg-white p-2 border border-blue-100 rounded-lg mt-1">
                      <div className="w-24 h-24 relative bg-slate-50 border border-slate-100 rounded-md overflow-hidden flex items-center justify-center shadow-xs">
                        <img 
                          src={qrUrl} 
                          alt="Quét Mã Chuyển Khoản" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[7.5px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                        {isDynamicQr ? "Mở app ngân hàng quét mã tự điền" : "Mã QR chuyển khoản (Quét & tự nhập số tiền)"}
                      </span>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          <div className="space-y-2 mt-4 shrink-0">
            {/* Zalo Button Integration (Zalo code, copies order details to clipboard) */}
            <button 
              onClick={() => handleZaloShare(recentPlacedOrder)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-100"
            >
              <div className="w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center text-[11px] font-black">Z</div>
              <div className="text-left leading-normal">
                <span className="block font-extrabold text-[12px] uppercase">Gửi qua Zalo (Hotline)</span>
                <span className="block text-[8px] text-blue-100 font-medium -mt-0.5">Tự động sao chép hóa đơn và mở Zalo</span>
              </div>
            </button>

            {/* Feedback alert for Clipboard copying */}
            {copiedBillText && (
              <div className="p-1 px-3 bg-blue-50 text-blue-600 font-semibold border border-blue-200 rounded-lg text-[9px] text-center flex items-center justify-center gap-1 animate-bounce">
                <ClipboardCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                Sao chép hóa đơn thành công! Hãy dán để gửi cho Zalo Hotline <strong>{storeConfig.zaloHotline}</strong>.
              </div>
            )}

            <button 
              onClick={() => setRecentPlacedOrder(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-normal"
            >
              Quay lại Thực đơn chính
            </button>
            <p className="text-[8px] text-center text-slate-300">Tổng đài hỗ trợ gấp: {storeConfig.phone}</p>
          </div>
        </div>
      )}

      {/* Embedded Simulated Bottom Navigation Bar inside Desktop mockup */}
      {!isStandaloneMobile && (
        <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-100 p-2 flex justify-around items-center z-40 shadow-xs">
          <button
            onClick={() => handleViewModeChange('menu')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-black uppercase transition-all ${
              activeViewMode === 'menu' ? 'text-orange-600 scale-102 font-black' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Smartphone className="w-4.5 h-4.5 text-current" />
            Mua Hàng
          </button>
          
          <button
            onClick={() => handleViewModeChange('history')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-black uppercase transition-all ${
              activeViewMode === 'history' ? 'text-orange-600 scale-102 font-black' : 'text-slate-400 hover:text-slate-600 font-bold'
            }`}
          >
            <ClipboardList className="w-4.5 h-4.5 text-current" />
            Đơn Của Tôi
          </button>

          <button
            onClick={() => handleViewModeChange('contact')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-black uppercase transition-all ${
              activeViewMode === 'contact' ? 'text-orange-600 scale-102 font-black' : 'text-slate-400 hover:text-slate-600 font-bold'
            }`}
          >
            <Phone className="w-4.5 h-4.5 text-current" />
            Liên Hệ
          </button>
        </div>
      )}
    </div>
  );
}
