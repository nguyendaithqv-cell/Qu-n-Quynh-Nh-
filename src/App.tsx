import React, { useState, useEffect } from 'react';
import { 
  getInitialData, 
  saveToLocalStorage 
} from './data';
import { 
  Product, 
  Category, 
  Order, 
  StoreConfig, 
  Promotion,
  Table,
  Area,
  Staff
} from './types';
import MobileSimulator from './components/MobileSimulator';
import AdminPanel from './components/AdminPanel';
import AdminLockScreen from './components/AdminLockScreen';
import { 
  Sparkles, 
  Smartphone, 
  Sliders, 
  Settings, 
  Database, 
  ChevronRight,
  Info,
  ClipboardList,
  Phone,
  Utensils,
  LogOut,
  Calculator,
  LayoutGrid,
  Grid,
  BarChart,
  History,
  ShoppingBag,
  FileText,
  Users,
  Lock,
  User,
  Plus,
  Download,
  ExternalLink,
  Share2,
  MoreVertical
} from 'lucide-react';
import CashierPOS from './components/CashierPOS';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  db, 
  handleFirestoreError, 
  OperationType,
  cleanForFirestore
} from './firebase';
import { 
  sendTelegramMessage, 
  formatNewOrderMessage, 
  formatOrderStatusChangeMessage, 
  checkAndSendAutoSummary 
} from './utils/telegram';

export default function App() {
  // Load initial local dataset as high-performance local cache
  const initialData = getInitialData();

  const [categories, setCategories] = useState<Category[]>(initialData.categories);
  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [promotions, setPromotions] = useState<Promotion[]>(initialData.promotions);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(initialData.storeConfig);
  const [orders, setOrders] = useState<Order[]>(initialData.orders);
  const [tables, setTables] = useState<Table[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  
  // Real-time synchronization loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Layout states
  // On desktop views, we show the split workspace (Admin central, Simulator right)
  // On mobile devices, we switch view mode: 'client' (the customer ordering app), 'history' (their personal orders history), or 'admin' (the dashboard)
  const [mobileMode, setMobileMode] = useState<'client' | 'history' | 'contact' | 'admin'>('client');
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);
  const [authenticatedStaff, setAuthenticatedStaff] = useState<Staff | null>(null);
  const isAdminAuthenticated = !!authenticatedStaff;
  const [adminViewMode, setAdminViewMode] = useState<'picker' | 'admin' | 'cashier'>('picker');

  // A2HS (Add to Home screen) PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  // Lightweight style presets passed down to isolated Cashier POS component
  const appThemeStyles = {
    cyberpunk: {
      tabActive: 'bg-[#66fcf1] text-[#0b0c10] font-black border border-[#66fcf1] shadow-[0_0_10px_rgba(102,252,241,0.35)]',
      tabInactive: 'bg-[#12161f] hover:bg-[#1a1f26] text-[#c5c6c7]/80 hover:text-white border border-[#2c3540] hover:border-[#66fcf1]/30 active:text-cyan-400',
      tabContainer: 'flex border-[#2c3540] mb-6 bg-[#12161f] p-1 rounded-xl font-semibold text-xs overflow-x-auto no-scrollbar',
    },
    dai: {
      tabActive: 'bg-[#7052ff] text-white shadow-md shadow-[#7052ff]/20 rounded-xl',
      tabInactive: 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl',
      tabContainer: 'flex gap-2 mb-6 bg-white p-2 rounded-2xl font-semibold text-xs shadow-sm overflow-x-auto no-scrollbar',
    }
  };

  const cashierHeaderStyles = {
    cyberpunk: {
      outerBg: 'bg-[#0b0c10]',
      headerBg: 'bg-[#121420]/95 border-b border-[#45f3ff]/20 text-[#c5c6c7] shadow-[0_4px_12px_rgba(0,0,0,0.45)]',
      logoBg: 'bg-[#66fcf1] text-[#0b0c10] font-black',
      subText: 'text-[#66fcf1]/70 font-mono tracking-wider',
      titleText: 'text-[#66fcf1] font-mono font-black drop-shadow-[0_0_4px_rgba(102,252,241,0.25)]',
      btnBack: 'bg-[#1f2833] hover:bg-[#1f2833]/80 text-[#66fcf1] border border-[#45f3ff]/30 hover:border-[#66fcf1]',
      btnLock: 'bg-[#2a0c12] hover:bg-rose-950 text-rose-500 border border-rose-900/40 font-mono'
    },
    dai: {
      outerBg: 'bg-[#f8f9fe]',
      headerBg: 'bg-[#f8f9fe] border-b-0 text-slate-800 pt-6 px-8',
      logoBg: 'bg-gradient-to-br from-[#7052ff] to-[#5136e0] text-white shadow-lg shadow-indigo-500/30 rounded-2xl',
      subText: 'text-slate-400 font-bold text-[10px]',
      titleText: 'text-[#2e335b] font-black',
      btnBack: 'bg-white hover:bg-indigo-50 text-[#7052ff] border border-indigo-100 px-4 py-2 rounded-xl shadow-sm font-semibold transition-all',
      btnLock: 'bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-100 px-4 py-2 rounded-xl font-semibold transition-all'
    }
  };

  const adminTheme = storeConfig.theme || 'dai';

  // Helper to extract initials and dynamic subtitle for branding
  const getStoreLogoInfo = () => {
    const rawName = storeConfig.name || 'Khai Vị';
    // Remove common prefixes
    const cleanName = rawName.replace(/^(Quán Nhậu|Quan Nhau|Quán|Quan|Cửa hàng|Cua hang|Nhà hàng|Nha hang)\s+/i, '');
    const words = cleanName.trim().split(/\s+/).filter(Boolean);
    let initials = 'KV';
    let subtitle = 'Khai Vị';
    
    if (words.length >= 2) {
      initials = (words[0][0] + words[1][0]).toUpperCase();
      subtitle = words[0];
    } else if (words.length === 1 && words[0]) {
      initials = words[0].slice(0, 2).toUpperCase();
      subtitle = words[0];
    }
    
    if (subtitle.length > 7) {
      subtitle = subtitle.slice(0, 6) + '.';
    }
    return { initials, subtitle };
  };
  
  const logoInfo = getStoreLogoInfo();

  // Dynamic Browser Tab Title Management
  useEffect(() => {
    const baseName = storeConfig.name || 'Khai Vị POS';
    let pageTitle = baseName;

    if (isMobileViewport) {
      if (!isAdminAuthenticated) {
        if (mobileMode === 'client') pageTitle = `Thực Đơn Menu - ${baseName}`;
        else if (mobileMode === 'history') pageTitle = `Lịch Sử Đơn Hàng - ${baseName}`;
        else if (mobileMode === 'contact') pageTitle = `Liên Hệ - ${baseName}`;
        else pageTitle = `Đăng Nhập - ${baseName}`;
      } else {
        if (adminViewMode === 'picker') pageTitle = `Phân Hệ Làm Việc - ${baseName}`;
        else if (adminViewMode === 'cashier') pageTitle = `Thu Ngân POS - ${baseName}`;
        else if (adminViewMode === 'admin') pageTitle = `Báo Cáo Admin - ${baseName}`;
      }
    } else {
      // Desktop
      if (!isAdminAuthenticated) {
        pageTitle = `Màn Hình Chờ - ${baseName}`;
      } else {
        if (adminViewMode === 'picker') pageTitle = `Trung Tâm Điều Khiển - ${baseName}`;
        else if (adminViewMode === 'cashier') pageTitle = `Máy Bán Hàng POS - ${baseName}`;
        else if (adminViewMode === 'admin') pageTitle = `Trang Quản Trị - ${baseName}`;
      }
    }

    document.title = pageTitle;
  }, [isAdminAuthenticated, adminViewMode, mobileMode, isMobileViewport, storeConfig.name]);

  // Monitor screen size to supply genuine mobile adaptation
  useEffect(() => {
    const checkViewport = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Listen for beforeinstallprompt event to enable direct PWA shortcut trigger
  useEffect(() => {
    const handleBeforePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('PWA installation event captured successfully');
    };
    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
  }, []);

  // Sync to localStorage on every state modification as a fast-load local mirror
  useEffect(() => {
    saveToLocalStorage('bv_categories_v2', categories);
  }, [categories]);

  useEffect(() => {
    saveToLocalStorage('bv_products_v2', products);
  }, [products]);

  useEffect(() => {
    saveToLocalStorage('bv_promotions_v2', promotions);
  }, [promotions]);

  useEffect(() => {
    saveToLocalStorage('bv_store_config_v2', storeConfig);
  }, [storeConfig]);

  useEffect(() => {
    saveToLocalStorage('bv_orders_v2', orders);
  }, [orders]);

  // Hook real-time Firebase listeners upon mounting
  useEffect(() => {
    let resolvedCount = 0;
    const checkLogged = () => {
      resolvedCount++;
      if (resolvedCount >= 6) {
        setIsLoading(false);
      }
    };

    // 0. Synchronize Tables
    const unsubTables = onSnapshot(collection(db, 'tables'), async (snapshot) => {
      if (snapshot.empty) {
        setTables([]);
      } else {
        const list: Table[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Table);
        });
        list.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
        setTables(list);
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tables');
    });

    // 0.1 Synchronize Areas
    const unsubAreas = onSnapshot(collection(db, 'areas'), async (snapshot) => {
      if (snapshot.empty) {
        setAreas([]);
      } else {
        const list: Area[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Area);
        });
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setAreas(list);
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'areas');
    });

    // 1. Synchronize Categories (autofill with defaults if DB is fresh and unpopulated)
    const unsubCategories = onSnapshot(collection(db, 'categories'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const init = getInitialData();
          for (const cat of init.categories) {
            await setDoc(doc(db, 'categories', cat.id), cat);
          }
        } catch (e) {
          console.error("Failed to seed default categories", e);
        }
      } else {
        const list: Category[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Category);
        });
        // Sắp xếp theo sortOrder tăng dần, nếu bằng nhau thì theo tên Tiếng Việt
        list.sort((a, b) => {
          const orderA = a.sortOrder !== undefined ? a.sortOrder : 999;
          const orderB = b.sortOrder !== undefined ? b.sortOrder : 999;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name, 'vi');
        });
        setCategories(list);
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'categories');
    });

    // 2. Synchronize Products
    const unsubProducts = onSnapshot(collection(db, 'products'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const init = getInitialData();
          for (const prod of init.products) {
            await setDoc(doc(db, 'products', prod.id), prod);
          }
        } catch (e) {
          console.error("Failed to seed default products", e);
        }
      } else {
        const list: Product[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Product);
        });
        setProducts(list);
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    // 3. Synchronize Promotions
    const unsubPromotions = onSnapshot(collection(db, 'promotions'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const init = getInitialData();
          for (const promo of init.promotions) {
            await setDoc(doc(db, 'promotions', promo.id), promo);
          }
        } catch (e) {
          console.error("Failed to seed default promotions", e);
        }
      } else {
        const list: Promotion[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Promotion);
        });
        setPromotions(list);
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'promotions');
    });

    // 4. Synchronize Store configuration
    const unsubStoreConfig = onSnapshot(doc(db, 'storeConfig', 'global'), async (snapshot) => {
      if (!snapshot.exists()) {
        try {
          const init = getInitialData();
          await setDoc(doc(db, 'storeConfig', 'global'), init.storeConfig);
        } catch (e) {
          console.error("Failed to seed store config", e);
        }
      } else {
        setStoreConfig(snapshot.data() as StoreConfig);
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'storeConfig/global');
    });

    // 5. Synchronize Customer Orders list
    const unsubOrders = onSnapshot(collection(db, 'orders'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const init = getInitialData();
          for (const order of init.orders) {
            await setDoc(doc(db, 'orders', order.id), order);
          }
        } catch (e) {
          console.error("Failed to seed default orders", e);
        }
      } else {
        const list: Order[] = [];
        let hasNewAddedOrder = false;
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data() as Order;
            if (data.status === 'pending') {
              hasNewAddedOrder = true;
            }
          }
        });

        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Order);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setOrders(prev => {
          if (prev.length > 0 && hasNewAddedOrder) {
            const audioEnabled = localStorage.getItem('system-audio-enabled') !== 'false';
            if (audioEnabled) {
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
              } catch (e) {
                console.warn(e);
              }
            }
          }
          return list;
        });
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return () => {
      unsubCategories();
      unsubProducts();
      unsubPromotions();
      unsubStoreConfig();
      unsubOrders();
      unsubTables();
      unsubAreas();
    };
  }, []);

  // Automated background scheduler for Telegram daily sumaries
  useEffect(() => {
    if (isLoading) return;

    if (storeConfig.telegram?.enabled && storeConfig.telegram?.notifySummaryEnabled) {
      const intervalId = setInterval(() => {
        checkAndSendAutoSummary(orders, storeConfig, handleUpdateStoreConfig);
      }, 30000); // Check every 30 seconds
      
      // Run once immediately on config activation
      checkAndSendAutoSummary(orders, storeConfig, handleUpdateStoreConfig);
      
      return () => clearInterval(intervalId);
    }
  }, [isLoading, orders, storeConfig]);

  // Clean and monitor promotion limits automatically in the background
  useEffect(() => {
    if (!promotions || promotions.length === 0 || !orders || orders.length === 0) return;

    let changed = false;
    const updatedPromotions = promotions.map(promo => {
      if (promo.isActive && promo.maxUsageCount && promo.maxUsageCount > 0) {
        // Count valid, non-cancelled orders that used this promotion
        const useCount = orders.filter(o => o.promoCodeUsed === promo.code && o.status !== 'cancelled').length;
        if (useCount >= promo.maxUsageCount) {
          changed = true;
          return { ...promo, isActive: false };
        }
      }
      return promo;
    });

    if (changed) {
      handleUpdatePromotions(updatedPromotions);
    }
  }, [orders, promotions]);

  // Unified dynamic sync helper for modifying collections based on arrays of data
  const syncWithFirestore = async <T extends { id: string }>(
    collectionName: string,
    newArray: T[],
    currentArray: T[]
  ) => {
    try {
      const newKeys = new Set(newArray.map(x => x.id));
      
      // Update additions and modifications
      for (const item of newArray) {
        const currentItem = currentArray.find(x => x.id === item.id);
        if (!currentItem || JSON.stringify(currentItem) !== JSON.stringify(item)) {
          // Wrapped item with cleanForFirestore to omit undefined values
          await setDoc(doc(db, collectionName, item.id), cleanForFirestore(item));
        }
      }

      // Handle deletions smoothly in Firestore
      for (const item of currentArray) {
        if (!newKeys.has(item.id)) {
          await deleteDoc(doc(db, collectionName, item.id));
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, collectionName);
    }
  };

  // Actions triggerable by Mobile app and Admin app, synced immediately to Firebase
  const handleAddOrder = async (newOrder: Order) => {
    // Determine the creator if not explicitly set
    if (!newOrder.createdBy) {
      newOrder.createdBy = authenticatedStaff ? authenticatedStaff.fullName : 'Khách';
    }

    // 1. Local optimistic update to show instantly in local UI tabs
    setOrders(prev => {
      if (prev.some(o => o.id === newOrder.id)) return prev;
      return [newOrder, ...prev];
    });

    try {
      // 2. Perform live setDoc in Firestore - wrap in cleanForFirestore
      await setDoc(doc(db, 'orders', newOrder.id), cleanForFirestore(newOrder));

      // 3. Trigger Telegram Notification
      if (storeConfig.telegram?.enabled && storeConfig.telegram?.notifyNewOrder && storeConfig.telegram.botToken && storeConfig.telegram.chatId) {
        const isExtraOrder = !!(newOrder.tableId && newOrder.tableId !== 'BOOKING' && orders.some(o => 
          o.tableId === newOrder.tableId && 
          o.id !== newOrder.id && 
          o.status !== 'completed' && 
          o.status !== 'cancelled'
        ));
        const msg = formatNewOrderMessage(newOrder, storeConfig.name, isExtraOrder);
        sendTelegramMessage(storeConfig.telegram.botToken, storeConfig.telegram.chatId, msg);
      }
    } catch (e) {
      // Revert optimistic state back on write failure
      setOrders(prev => prev.filter(o => o.id !== newOrder.id));
      handleFirestoreError(e, OperationType.WRITE, `orders/${newOrder.id}`);
    }
  };

  const handleUpdateOrders = async (updatedOrders: Order[]) => {
    // Automatically set paidBy when order paymentStatus transitions to 'paid'
    const modifiedOrders = updatedOrders.map(updated => {
      const original = orders.find(o => o.id === updated.id);
      if (original && updated.paymentStatus === 'paid' && original.paymentStatus !== 'paid' && !updated.paidBy) {
        return {
          ...updated,
          paidBy: authenticatedStaff ? authenticatedStaff.fullName : 'Khách'
        };
      }
      return updated;
    });

    // Check transitions before syncing for Telegram notifications
    if (storeConfig.telegram?.enabled && storeConfig.telegram.botToken && storeConfig.telegram.chatId) {
      for (const updated of modifiedOrders) {
        const original = orders.find(o => o.id === updated.id);
        if (original) {
          const statusChanged = original.status !== updated.status;
          const paymentChanged = original.paymentStatus !== updated.paymentStatus;
          
          if (statusChanged || paymentChanged) {
            let shouldNotify = false;
            
            if (updated.status === 'cancelled' && original.status !== 'cancelled' && storeConfig.telegram.notifyCancel) {
              shouldNotify = true;
            } else if (updated.paymentStatus === 'paid' && original.paymentStatus !== 'paid' && storeConfig.telegram.notifyPayment) {
              shouldNotify = true;
            } else if (updated.status === 'completed' && original.status !== 'completed' && storeConfig.telegram.notifyPayment) {
              shouldNotify = true;
            }
            
            if (shouldNotify) {
              const msg = formatOrderStatusChangeMessage(updated, original.status, original.paymentStatus, storeConfig.name);
              sendTelegramMessage(storeConfig.telegram.botToken, storeConfig.telegram.chatId, msg);
            }
          }
        }
      }
    }
    await syncWithFirestore('orders', modifiedOrders, orders);
  };

  const handleUpdateProducts = async (updatedProducts: Product[]) => {
    await syncWithFirestore('products', updatedProducts, products);
  };

  const handleUpdateCategories = async (updatedCategories: Category[]) => {
    await syncWithFirestore('categories', updatedCategories, categories);
  };

  const handleUpdatePromotions = async (updatedPromotions: Promotion[]) => {
    await syncWithFirestore('promotions', updatedPromotions, promotions);
  };

  const handleUpdateTables = async (updatedTables: Table[]) => {
    await syncWithFirestore('tables', updatedTables, tables);
  };

  const handleUpdateAreas = async (updatedAreas: Area[]) => {
    await syncWithFirestore('areas', updatedAreas, areas);
  };

  const handleUpdateStoreConfig = async (updatedConfig: StoreConfig) => {
    try {
      await setDoc(doc(db, 'storeConfig', 'global'), cleanForFirestore(updatedConfig));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'storeConfig/global');
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User installation decision: ${outcome}`);
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Error triggering PWA install dialog:', err);
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const renderModulePicker = () => {
    const isManagerOrAdmin = authenticatedStaff?.role?.toLowerCase().includes('quản lý') || 
                             authenticatedStaff?.role?.toLowerCase().includes('admin') || 
                             authenticatedStaff?.role?.toLowerCase().includes('chủ');

    return (
      <div className="w-full h-full min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-8 font-sans text-white animate-fade-in z-50">
        <div className="w-full max-w-4xl bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-slate-700/50 shadow-2xl flex flex-col items-center">
          
          {/* Brand logo & Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex flex-col items-center justify-center font-black text-white text-2xl shadow-xl select-none mb-4">
              {logoInfo.initials}
              <span className="text-[8px] text-orange-200 font-extrabold uppercase tracking-tighter block -mt-1">{logoInfo.subtitle}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
              CHỌN PHÂN HỆ LÀM VIỆC ⚙_
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-medium mt-2 max-w-lg leading-relaxed">
              Hệ thống phân chia hiệu năng cao. Để tránh giật lag khi phục vụ khách bận rộn, hãy dùng Trang Thu Ngân POS độc lập.
            </p>
          </div>

          {/* Dual Workspace Choices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
            
            {/* Card 1: Independent Standalone Cashier POS */}
            <div 
              onClick={() => setAdminViewMode('cashier')}
              className="group cursor-pointer bg-slate-855 hover:bg-slate-750 border border-orange-500/35 hover:border-orange-500 rounded-2xl p-6 shadow-lg transition-all duration-300 hover:shadow-orange-500/10 flex flex-col justify-between hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Speed Badge */}
              <div className="absolute top-4 right-4 bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                Chạy cực nhẹ 🚀
              </div>

              <div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                  <Utensils className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-orange-400 transition-colors uppercase tracking-wide">
                  1. Thu Ngân POS 🪑
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed mt-2.5">
                  Giao diện tinh gọn, tập trung bán hàng tại quầy. Mở bàn, chọn món, gộp bàn và in hóa đơn thanh toán cực nhanh mà không tải các báo cáo đồ sộ.
                </p>
              </div>

              <div className="mt-6">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAdminViewMode('cashier'); }}
                  className="w-full py-2.5 rounded-xl bg-orange-600 group-hover:bg-orange-500 text-white text-[11px] font-black uppercase tracking-wider transition-colors shadow-md"
                >
                  Mở Màn Hình Thu Ngân ➜
                </button>
              </div>
            </div>

            {/* Card 2: Administrative Control Board */}
            <div 
              onClick={() => isManagerOrAdmin ? setAdminViewMode('admin') : alert(`Nhân viên phân quyền "${authenticatedStaff?.role || 'Nhân viên'}" không có quyền truy cập Trang Quản Trị.`)}
              className={`group bg-slate-855 border rounded-2xl p-6 shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                isManagerOrAdmin 
                  ? 'cursor-pointer hover:bg-slate-755 border-slate-700 hover:border-sky-500 hover:shadow-sky-500/10 hover:-translate-y-1' 
                  : 'cursor-not-allowed border-slate-800 opacity-60'
              }`}
            >
              {/* Speed Badge */}
              <div className="absolute top-4 right-4 bg-slate-800 border border-slate-700 text-slate-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                Quản trị viên 👑
              </div>

              <div>
                <div className={`w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4 transition-all duration-300 ${isManagerOrAdmin ? 'group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white' : 'opacity-50'}`}>
                  <Sliders className="w-6 h-6" />
                </div>
                <h3 className={`text-lg font-black text-white uppercase tracking-wide transition-colors ${isManagerOrAdmin ? 'group-hover:text-sky-400' : ''}`}>
                  2. Trang Quản Lý Admin 📊
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed mt-2.5">
                  Bản tin quản lý toàn hệ thống. Cấu hình thực đơn món ăn, quản lý danh sách danh mục, tạo chương trình khuyến mãi, xem biểu đồ báo cáo doanh số, cấu hình phần cứng.
                </p>
                {!isManagerOrAdmin && (
                  <p className="text-rose-400 text-[10px] font-bold mt-3 bg-rose-500/10 border border-rose-500/20 px-2 py-1.5 rounded-md">
                    🔒 Yêu cầu phân quyền "Quản lý" hoặc "Admin"
                  </p>
                )}
              </div>

              <div className="mt-6">
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (isManagerOrAdmin) {
                      setAdminViewMode('admin');
                    } else {
                      alert(`Nhân viên phân quyền "${authenticatedStaff?.role || 'Nhân viên'}" không có quyền truy cập Trang Quản Trị.`);
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl text-white text-[11px] font-black uppercase tracking-wider transition-colors shadow-md border ${
                    isManagerOrAdmin 
                      ? 'bg-slate-750 group-hover:bg-sky-600 border-slate-700 cursor-pointer' 
                      : 'bg-slate-800 border-slate-700/50 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isManagerOrAdmin ? 'Vào Trang Quản Trị Hệ Thống ➜' : 'Không Có Quyền Truy Cập 🔒'}
                </button>
              </div>
            </div>

          </div>

          {/* Add to Home Screen Quick Action Pill */}
          <div className="flex flex-col items-center gap-2.5 w-full max-w-sm mb-8 p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30 text-center animate-fade-in">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-[11px] font-black uppercase tracking-wider shadow-md hover:shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 animate-bounce" />
              Thêm Khai Vị POS vào Màn Hình Chính
            </button>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Tạo lối tắt ứng dụng với logo cực đẹp ngoài màn hình điện thoại hoặc máy tính để mở nhanh không qua trình duyệt.
            </p>
          </div>

          {/* INSTALLATION GUIDE DIALOG MODAL */}
          {showInstallGuide && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-2xl relative animate-fade-in text-xs text-slate-200">
                <button 
                  type="button" 
                  onClick={() => setShowInstallGuide(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer text-base font-black p-1"
                >
                  ✕
                </button>

                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center p-0.5 shadow-lg mb-3 overflow-hidden">
                    <img 
                      src="/icon.jpg" 
                      alt="Logo App" 
                      className="w-full h-full object-cover rounded-xl"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider mb-1">
                    Cài Đặt Lối Tắt Màn Hình
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {storeConfig.name || 'Khai Vị POS'}
                  </p>
                </div>

                {/* Detect Platform Instructions */}
                {(() => {
                  const ua = navigator.userAgent;
                  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                  
                  if (isIOS) {
                    return (
                      <div className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl p-3 text-[11px] leading-relaxed font-medium">
                          👉 <strong>Lưu ý cho iOS (iPhone/iPad):</strong> Trình duyệt Safari trên iOS không cho phép tự động cài đặt qua nút bấm. Bạn vui lòng tự thêm thủ công theo 3 bước chạm dưới đây:
                        </div>
                        <ol className="space-y-3.5 text-[11px] leading-relaxed text-left">
                          <li className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">1</span>
                            <div>
                              Chạm vào nút <strong>Chia sẻ</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-sky-400" /> ở thanh menu công cụ dưới đáy màn hình Safari.
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">2</span>
                            <div>
                              Cuộn nhẹ danh sách lên rồi nhấn vào tuỳ chọn <strong>"Thêm vào MH chính"</strong> (Add to Home Screen) <Plus className="w-3.5 h-3.5 inline mx-1 text-slate-200 bg-slate-800 rounded p-0.5" />.
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">3</span>
                            <div>
                              Nhấn nút <strong>Thêm</strong> (Add) ở góc trên bên phải để hoàn tất cài đặt!
                            </div>
                          </li>
                        </ol>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded-xl p-3 text-[11px] leading-relaxed font-medium">
                        Hướng dẫn thêm phím tắt lối tắt trực tiếp ra màn hình chính điện thoại hoặc máy tính:
                      </div>
                      <ol className="space-y-3.5 text-[11px] leading-relaxed text-left">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">1</span>
                          <div>
                            Click vào nút <strong>Ba chấm đứng</strong> <MoreVertical className="w-3.5 h-3.5 inline mx-1 text-slate-400" /> ở góc thanh trình duyệt.
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">2</span>
                          <div>
                            Nhấn chọn mục <strong>"Cài đặt ứng dụng"</strong> (Install App) hoặc <strong>"Thêm vào màn hình chính"</strong> (Add to Home screen).
                          </div>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">3</span>
                          <div>
                            Nhấn <strong>Xác nhận cài đặt</strong> để tạo lối tắt mở nhanh POS bất kỳ lúc nào!
                          </div>
                        </li>
                      </ol>
                    </div>
                  );
                })()}

                {/* Dev / iframe advice wrapper */}
                <div className="pt-3 border-t border-slate-800 space-y-2.5">
                  <div className="text-[10px] text-slate-500 text-center leading-relaxed font-semibold">
                    💡 <strong>Mẹo nhỏ:</strong> Nếu đang chạy thử nghiệm của AI Studio, vui lòng mở trang độc lập trong tab mới để hiển thị đầy đủ pop-up cài đặt của hệ điều hành.
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase tracking-wider border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Mở Trang Độc Lập Mới
                  </button>
                </div>
                
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInstallGuide(false)}
                    className="py-1.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold tracking-wide transition-colors text-[10px] cursor-pointer uppercase"
                  >
                    Đã hiểu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Global Exit */}
          {isMobileViewport ? (
            <button
              onClick={() => {
                setAuthenticatedStaff(null);
                setMobileMode('client');
              }}
              className="text-slate-500 hover:text-white font-bold text-xs uppercase tracking-wide transition pb-1 border-b border-transparent hover:border-slate-500 flex items-center gap-1.5"
            >
              Quay lại đặt hàng 📱
            </button>
          ) : (
            <button
              onClick={() => setAuthenticatedStaff(null)}
              className="text-rose-400 hover:text-rose-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 px-4 py-1.5 bg-rose-500/10 rounded-full border border-rose-500/20 transition-all hover:bg-rose-500/20 cursor-pointer"
            >
              🔒 Đăng Xuất & Khóa Hệ Thống
            </button>
          )}

        </div>
      </div>
    );
  };

  // Real-time Cloud Synced Database Loading Veil
  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-white p-6">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-600/10 border-2 border-orange-500 border-t-transparent animate-spin flex items-center justify-center mb-6">
            <span className="sr-only">Đang đồng bộ</span>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl flex flex-col items-center justify-center font-black text-orange-600 text-[10px] shadow-lg mb-4 select-none">
            {logoInfo.initials}
            <span className="text-[5px] text-orange-800 font-extrabold uppercase tracking-tighter block -mt-1">{logoInfo.subtitle}</span>
          </div>
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider">Hệ Thống Đang Đồng Bộ...</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Đang đồng bộ thực đơn món ăn, cấu hình nhà hàng và danh sách hóa đơn từ dịch vụ đám mây Google Firebase.
          </p>
          <div className="mt-8 flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] text-orange-400 font-semibold uppercase tracking-wider animate-pulse">
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
            Cloud Firestore Online
          </div>
        </div>
      </div>
    );
  }

  // Render on actual Mobile viewport (phone screen)
  if (isMobileViewport) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Content view */}
        <div className="flex-1 w-full relative">
          {mobileMode === 'client' || mobileMode === 'history' || mobileMode === 'contact' ? (
            <MobileSimulator
              products={products}
              categories={categories}
              promotions={promotions}
              storeConfig={storeConfig}
              tables={tables}
              onUpdateTables={handleUpdateTables}
              onAddOrder={handleAddOrder}
              isStandaloneMobile={true}
              onToggleAdminView={() => setMobileMode('admin')}
              viewMode={mobileMode === 'history' ? 'history' : mobileMode === 'contact' ? 'contact' : 'menu'}
              onViewModeChange={(mode) => setMobileMode(mode === 'history' ? 'history' : mode === 'contact' ? 'contact' : 'client')}
              orders={orders}
              isAdminAuthenticated={isAdminAuthenticated}
            />
          ) : !isAdminAuthenticated ? (
            <div className="bg-slate-900 min-h-screen pb-16 flex flex-col justify-center">
              <AdminLockScreen 
                onSuccess={(staff) => {
                  setAuthenticatedStaff(staff);
                  setAdminViewMode('picker');
                }}
                onCancel={() => setMobileMode('client')}
                staffList={storeConfig.staff || []}
                adminPin={storeConfig.adminPin}
              />
            </div>
          ) : adminViewMode === 'picker' ? (
            <div className="bg-slate-900 min-h-screen pb-16 flex flex-col justify-center">
              {renderModulePicker()}
            </div>
          ) : adminViewMode === 'admin' ? (
            <div className="bg-white min-h-screen pb-16 flex flex-col">
              <AdminPanel
                products={products}
                categories={categories}
                promotions={promotions}
                storeConfig={storeConfig}
                orders={orders}
                tables={tables}
                areas={areas}
                onUpdateOrders={handleUpdateOrders}
                onUpdateProducts={handleUpdateProducts}
                onUpdateCategories={handleUpdateCategories}
                onUpdatePromotions={handleUpdatePromotions}
                onUpdateTables={handleUpdateTables}
                onUpdateAreas={handleUpdateAreas}
                onUpdateStoreConfig={handleUpdateStoreConfig}
                onAddOrder={handleAddOrder}
                onLogout={() => {
                  setAuthenticatedStaff(null);
                  setMobileMode('client');
                }}
                onBackToPicker={() => setAdminViewMode('picker')}
                authenticatedStaff={authenticatedStaff}
              />
            </div>
          ) : (
            /* Standalone Lightweight Cashier POS on Mobile Screen */
            <div className={`${(cashierHeaderStyles[adminTheme] || cashierHeaderStyles.dai).outerBg} min-h-screen pb-16 flex flex-col`}>
              <div className={`${(cashierHeaderStyles[adminTheme] || cashierHeaderStyles.dai).headerBg} p-2.5 px-3 shrink-0 flex items-center justify-between`}>
                <div className={`text-[10px] uppercase font-black tracking-wider ${(cashierHeaderStyles[adminTheme] || cashierHeaderStyles.dai).subText} flex flex-col`}>
                  <span>Thu Ngân POS</span>
                  {authenticatedStaff && <span className="opacity-75 text-[8.5px] font-semibold mt-1 tracking-normal">👤 {authenticatedStaff.fullName}</span>}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdminViewMode('picker')}
                    className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition duration-150 shadow-xs ${(cashierHeaderStyles[adminTheme] || cashierHeaderStyles.dai).btnBack}`}
                  >
                    Đổi Phân Hệ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthenticatedStaff(null);
                      setMobileMode('client');
                    }}
                    className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition duration-150 shadow-xs ${(cashierHeaderStyles[adminTheme] || cashierHeaderStyles.dai).btnLock}`}
                  >
                    Khóa Máy
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CashierPOS
                  products={products}
                  categories={categories}
                  promotions={promotions}
                  storeConfig={storeConfig}
                  orders={orders}
                  tables={tables}
                  areas={areas}
                  onUpdateOrders={handleUpdateOrders}
                  onUpdateTables={handleUpdateTables}
                  onAddOrder={handleAddOrder}
                  t={appThemeStyles[adminTheme] || appThemeStyles.dai}
                  adminTheme={adminTheme}
                  isMobileViewport={isMobileViewport}
                  authenticatedStaff={authenticatedStaff}
                />
              </div>
            </div>
          )}
        </div>

        {/* Fixed mobile bottom quick switcher - Only visible for customers (non-admin modes) */}
        {!isAdminAuthenticated && mobileMode !== 'admin' && (
          <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-2.5 px-6 flex justify-around items-center z-50 shadow-lg">
            <button
              onClick={() => setMobileMode('client')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-black uppercase ${
                mobileMode === 'client' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Smartphone className="w-5 h-5 text-current" />
              Mua Hàng
            </button>
            
            <button
              onClick={() => setMobileMode('history')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-black uppercase ${
                mobileMode === 'history' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <ClipboardList className="w-5 h-5 text-current" />
              Đơn Của Tôi
            </button>

            <button
              onClick={() => setMobileMode('contact')}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-black uppercase ${
                mobileMode === 'contact' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Phone className="w-5 h-5 text-current" />
              Liên Hệ
            </button>
          </div>
        )}
      </div>
    );
  }

  // If authenticated on desktop, let's check for fullscreen workflows (picker and cashier)
  if (isAdminAuthenticated) {
    if (adminViewMode === 'picker') {
      return renderModulePicker();
    }
    
    if (adminViewMode === 'cashier') {
      const ch = cashierHeaderStyles[adminTheme] || cashierHeaderStyles.dai;
      
      if (adminTheme === 'dai') {
        return (
          <div className={`w-full h-screen flex flex-col md:flex-row font-sans animate-fade-in overflow-hidden select-none bg-[#f8f9fe]`}>
            {/* Left Minimalist Sidebar for Dai Theme */}
            <div className="hidden md:flex w-[80px] bg-white border-r border-indigo-50 flex-col items-center py-6 justify-between shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
              <div className="flex flex-col items-center gap-6 w-full">
                <div onClick={() => setAdminViewMode('picker')} className="w-[42px] h-[42px] bg-gradient-to-br from-[#7052ff] to-[#5136e0] rounded-[14px] flex items-center justify-center shadow-lg shadow-indigo-500/30 cursor-pointer hover:scale-105 transition-transform text-white">
                  <Grid className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-center gap-4 w-full mt-4">
                  <button className="w-12 h-12 flex items-center justify-center text-indigo-200 hover:text-[#7052ff] hover:bg-indigo-50 rounded-2xl transition-all"><BarChart className="w-5 h-5" /></button>
                  <button className="w-12 h-12 flex items-center justify-center text-indigo-200 hover:text-[#7052ff] hover:bg-indigo-50 rounded-2xl transition-all"><ShoppingBag className="w-5 h-5" /></button>
                  <button className="w-12 h-12 flex items-center justify-center text-indigo-200 hover:text-[#7052ff] hover:bg-indigo-50 rounded-2xl transition-all"><History className="w-5 h-5" /></button>
                  <button className="w-12 h-12 flex items-center justify-center text-indigo-200 hover:text-[#7052ff] hover:bg-indigo-50 rounded-2xl transition-all"><FileText className="w-5 h-5" /></button>
                  <button className="w-12 h-12 flex items-center justify-center text-indigo-200 hover:text-[#7052ff] hover:bg-indigo-50 rounded-2xl transition-all"><Users className="w-5 h-5" /></button>
                  <button className="w-12 h-12 flex items-center justify-center text-indigo-200 hover:text-[#7052ff] hover:bg-indigo-50 rounded-2xl transition-all"><Settings className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="w-[42px] h-[42px] bg-indigo-50 rounded-full flex items-center justify-center font-black text-[#7052ff] text-sm cursor-pointer border border-indigo-100">
                {logoInfo.initials.substring(0,2)}
              </div>
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden p-0 md:p-6 pb-0">
              {/* Top Header */}
              <div className="flex items-center justify-between mb-0 md:mb-6 px-4 md:px-2 pt-4 md:pt-0 shrink-0">
                <div>
                  <h1 className="text-xl md:text-[22px] font-black text-[#2e335b] tracking-tight uppercase flex items-center gap-2">
                    THU NGÂN POS
                  </h1>
                  {authenticatedStaff && (
                    <div className="flex items-center gap-1.5 mt-1 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      <span className="w-3 h-3 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden"><User className="w-2.5 h-2.5" /></span>
                      {authenticatedStaff.fullName}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAdminViewMode('picker')} className="flex items-center gap-1.5 px-4 md:px-5 py-2.5 bg-white border border-indigo-100 text-[#7052ff] rounded-[14px] text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-indigo-50 transition-all">
                    <Grid className="w-3.5 h-3.5" /> Đổi phân hệ
                  </button>
                  <button onClick={() => setAuthenticatedStaff(null)} className="flex items-center gap-1.5 px-4 md:px-5 py-2.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-[14px] text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-rose-100 transition-all">
                    <Lock className="w-3.5 h-3.5" /> Khóa máy
                  </button>
                </div>
              </div>

              {/* Main Cashier Workspace wrapped in big white canvas */}
              <div className="flex-1 bg-white md:rounded-t-[32px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-slate-100/50 flex flex-col">
                <CashierPOS
                  products={products}
                  categories={categories}
                  promotions={promotions}
                  storeConfig={storeConfig}
                  orders={orders}
                  tables={tables}
                  areas={areas}
                  onUpdateOrders={handleUpdateOrders}
                  onUpdateTables={handleUpdateTables}
                  onAddOrder={handleAddOrder}
                  t={appThemeStyles[adminTheme] || appThemeStyles.dai}
                  adminTheme={adminTheme}
                  isMobileViewport={isMobileViewport}
                  authenticatedStaff={authenticatedStaff}
                />
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className={`w-full h-screen flex flex-col font-sans animate-fade-in overflow-hidden select-none ${ch.outerBg}`}>
          {/* Standalone Cashier Top Utility Header */}
          <div className={`${ch.headerBg} p-3 py-6 shrink-0 flex items-center justify-between`}>
            <div className="flex items-center gap-4">
              <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-black text-[13px] shadow-sm select-none ${ch.logoBg}`}>
                {logoInfo.initials}
                <span className="text-[5.5px] font-extrabold uppercase tracking-tighter block -mt-1.5 font-sans">{logoInfo.subtitle}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`${ch.subText} uppercase text-[8.5px] tracking-widest leading-tight`}>
                    HỆ THỐNG QUẢN LÝ TẠI QUẦY
                  </span>
                  {authenticatedStaff && (
                    <span className="px-2 py-0.5 rounded-sm bg-white/10 border border-white/20 text-[8px] font-bold uppercase tracking-wider text-white shadow-sm flex items-center gap-1">
                      <span className="opacity-70">{authenticatedStaff.role || 'Nhân viên'}:</span> {authenticatedStaff.fullName}
                    </span>
                  )}
                </div>
                <h1 className={`text-sm font-black uppercase tracking-wider flex items-center gap-1.5 leading-none ${ch.titleText}`}>
                  🪑 PHÂN HỆ THU NGÂN POS ĐỘC LẬP SIỆU NHẸ
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setAdminViewMode('picker')}
                className={`px-4 py-1.5 rounded-full text-[10.5px] font-black uppercase tracking-wider transition duration-150 flex items-center gap-1 cursor-pointer shadow-sm ${ch.btnBack}`}
                title="Quay về bảng chọn phân hệ"
              >
                ◀ Chuyển Phân Hệ
              </button>

              <button
                type="button"
                onClick={() => setAuthenticatedStaff(null)}
                className={`px-4 py-1.5 rounded-full text-[10.5px] font-black uppercase tracking-wider transition duration-150 flex items-center gap-1 cursor-pointer shadow-sm ${ch.btnLock}`}
                title="Khóa màn hình máy"
              >
                🔒 Khóa POS
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <CashierPOS
              products={products}
              categories={categories}
              promotions={promotions}
              storeConfig={storeConfig}
              orders={orders}
              tables={tables}
              areas={areas}
              onUpdateOrders={handleUpdateOrders}
              onUpdateTables={handleUpdateTables}
              onAddOrder={handleAddOrder}
              t={appThemeStyles[adminTheme] || appThemeStyles.dai}
              adminTheme={adminTheme}
              isMobileViewport={isMobileViewport}
              authenticatedStaff={authenticatedStaff}
            />
          </div>
        </div>
      );
    }
  }

  // Render on Desktop/Tablet viewport (Majestic dual workspace representing Geometric Balance UI preview)
  return (
    <div className="w-full h-screen flex bg-slate-50 overflow-hidden font-sans text-slate-800">
      
      {/* 1. Left Navigation Control Sidebar */}
      <nav className="w-20 bg-orange-600 flex flex-col items-center py-8 justify-between border-r border-orange-700 shrink-0">
        
        <div className="flex flex-col items-center gap-10">
          {/* Logo brand */}
          <div className="w-12 h-12 bg-white rounded-2xl flex flex-col items-center justify-center font-black text-orange-600 text-lg shadow-lg border border-orange-100 select-none cursor-default">
            {logoInfo.initials}
            <span className="text-[7px] text-orange-800 font-extrabold uppercase tracking-tighter block -mt-1">{logoInfo.subtitle}</span>
          </div>
 
          {/* Quick Menu Icons (Stylized layout decorations) */}
          <div className="flex flex-col gap-5">
            <div 
              className="p-3 bg-orange-500 rounded-xl text-white shadow-md shadow-orange-700/55 cursor-pointer hover:bg-orange-400 transition-all group relative"
              title="Tổng quản trị viên"
            >
              <Database className="w-5 h-5" />
              <div className="absolute left-16 bg-slate-900 text-white rounded p-1 text-[9px] uppercase font-bold tracking-wider hidden group-hover:block z-50 shadow-xs">
                Hệ_Thống
              </div>
            </div>
 
            <div 
              className="p-3 text-orange-200 hover:text-white rounded-xl hover:bg-orange-500 transition-all cursor-pointer group relative"
              title="Đồng bộ sản phẩm"
            >
              <Sparkles className="w-5 h-5" />
              <div className="absolute left-16 bg-slate-900 text-white rounded p-1 text-[9px] uppercase font-bold tracking-wider hidden group-hover:block z-50">
                Làm_Mới
              </div>
            </div>
 
            <div 
              className="p-3 text-orange-200 hover:text-white rounded-xl hover:bg-orange-500 transition-all cursor-pointer group relative"
              onClick={() => alert(`QR Hotline Zalo hỗ trợ: ${storeConfig.zaloHotline}`)}
              title="Liên hệ Hotline"
            >
              <Settings className="w-5 h-5" />
              <div className="absolute left-16 bg-slate-900 text-white rounded p-1 text-[9px] uppercase font-bold tracking-wider hidden group-hover:block z-50">
                Thông_Tin
              </div>
            </div>
          </div>
        </div>
 
        {/* Profile Avatar mimic decoration */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-500/80 border-2 border-orange-400/50 shadow-inner flex items-center justify-center text-white font-bold select-none text-sm uppercase">
            AD
          </div>
        </div>
 
      </nav>
 
      {/* 2. Middle Main Custom Admin Workspace Pane */}
      <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden relative">
        {!isAdminAuthenticated ? (
          <AdminLockScreen 
            onSuccess={(staff) => {
              setAuthenticatedStaff(staff);
              setAdminViewMode('picker');
            }}
            staffList={storeConfig.staff || []}
            adminPin={storeConfig.adminPin}
          />
        ) : (
          <AdminPanel
            products={products}
            categories={categories}
            promotions={promotions}
            storeConfig={storeConfig}
            orders={orders}
            tables={tables}
            areas={areas}
            onUpdateOrders={handleUpdateOrders}
            onUpdateProducts={handleUpdateProducts}
            onUpdateCategories={handleUpdateCategories}
            onUpdatePromotions={handleUpdatePromotions}
            onUpdateTables={handleUpdateTables}
            onUpdateAreas={handleUpdateAreas}
            onUpdateStoreConfig={handleUpdateStoreConfig}
            onAddOrder={handleAddOrder}
            onLogout={() => setAuthenticatedStaff(null)}
            onBackToPicker={() => setAdminViewMode('picker')}
            authenticatedStaff={authenticatedStaff}
          />
        )}
      </div>

      {/* 3. Right Sidebar: Mobile Smartphone Simulator Preview */}
      <div className="w-[380px] bg-slate-100/90 flex flex-col items-center justify-center p-6 border-l border-slate-200 shrink-0">
        
        {/* Helper title above mockup */}
        <div className="w-[332px] text-center mb-3">
          <h2 className="text-xs font-black text-slate-500 tracking-wider uppercase flex items-center justify-center gap-1">
            <Smartphone className="w-4 h-4 text-orange-600" /> Giả Lập Ứng Dụng Điện Thoại
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
            Khách hàng đặt món phía dưới sẽ tự động chuyển hóa đơn tới Admin bên trái ngay lập tức!
          </p>
        </div>

        {/* Smartphone Hardware Frame Model Mockup */}
        <div className="w-[332px] h-[670px] bg-white rounded-[44px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.22)] border-[10px] border-slate-900 relative overflow-hidden flex flex-col select-none ring-1 ring-slate-950/5">
          
          {/* Smartphone Top Speaker and camera notch */}
          <div className="absolute top-0 inset-x-0 h-6 bg-transparent flex justify-center items-start z-50 pointer-events-none">
            <div className="w-28 h-4.5 bg-slate-900 rounded-b-xl flex items-center justify-center gap-1.5 px-3">
              {/* Camera lens */}
              <span className="w-2 h-2 rounded-full bg-slate-800"></span>
              {/* Speaker bar */}
              <span className="w-10 h-1 bg-slate-800 rounded-full"></span>
            </div>
          </div>

          {/* Screen Content embedded frame */}
          <div className="flex-1 overflow-hidden relative bg-slate-50 flex flex-col">
            <MobileSimulator
              products={products}
              categories={categories}
              promotions={promotions}
              storeConfig={storeConfig}
              tables={tables}
              onUpdateTables={handleUpdateTables}
              onAddOrder={handleAddOrder}
              isStandaloneMobile={false}
              orders={orders}
              isAdminAuthenticated={isAdminAuthenticated}
            />
          </div>

          {/* Smartphone Hardware bottom Home slide indicator bar */}
          <div className="h-4 bg-white flex items-center justify-center shrink-0 border-t border-slate-50/50">
            <div className="h-1 w-24 bg-slate-800 rounded-full"></div>
          </div>

        </div>

        {/* Instruction footer banner */}
        <div className="bg-orange-50/80 rounded-xl p-2.5 px-4 max-w-[320px] border border-orange-100/70 mt-3 text-center">
          <p className="text-[9.5px] leading-relaxed text-slate-500">
            💡 <strong className="text-orange-600 uppercase font-black text-[9px] tracking-wide block mb-0.5">Đặt Hàng Thử Nghiệm:</strong> 
            Chọn món trên điện thoại sọc phải, điền thông tin và bấm đặt hàng. Sau đó quét lấy Zalo sao chép bill, đồng thời kiểm chứng bảng Admin bên trái tăng vù vù nhé!
          </p>
        </div>

      </div>

    </div>
  );
}
