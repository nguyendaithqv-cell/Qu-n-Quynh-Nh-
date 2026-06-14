import React, { useMemo, useState } from 'react';
import { Product, Order, Category, StoreConfig } from '../types';
import { Calendar, Clock, TrendingUp, FileSpreadsheet, Info, Sparkles, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, DollarSign, ShoppingBag, Utensils, BarChart2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportSectionProps {
  products: Product[];
  orders: Order[];
  categories: Category[];
  storeConfig?: StoreConfig;
}

type TimeRangeType = 'all' | 'today' | 'yesterday' | '7days' | 'month_this' | 'month_last' | 'custom';
type SortByType = 'name' | 'qty' | 'revenue' | 'cost' | 'profit';

export default function ReportSection({ products, orders, categories, storeConfig }: ReportSectionProps) {
  // Simple time selector state
  const [timeRange, setTimeRange] = useState<TimeRangeType>('all');
  
  // Custom dates
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Sorting state
  const [sortBy, setSortBy] = useState<SortByType>('revenue');
  const [sortDesc, setSortDesc] = useState<boolean>(true);

  // Helper to determine group type based strictly on category
  const getGroupType = (p: Product, cat: Category | undefined): 'food' | 'drink' => {
    if (cat?.type) {
      return cat.type;
    }
    // Fallback using ONLY category name if type is not defined
    const catName = cat?.name || '';
    const isD = /đồ uống|bia|nước|coca|sting|trà|cafe|café|rượu|mơ/i.test(catName);
    return isD ? 'drink' : 'food';
  };

  // Memoized time bounding dates
  const dateRanges = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(todayEnd.getDate() - 1);

    const sevenDaysAgoStart = new Date(todayStart);
    sevenDaysAgoStart.setDate(todayStart.getDate() - 6);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return {
      todayStart, todayEnd,
      yesterdayStart, yesterdayEnd,
      sevenDaysAgoStart,
      thisMonthStart,
      lastMonthStart, lastMonthEnd
    };
  }, [timeRange, startDate, endDate]);

  // Check if order falls in specified range
  const isOrderInTimeRange = (createdAtStr: string) => {
    const date = new Date(createdAtStr);
    const {
      todayStart, todayEnd,
      yesterdayStart, yesterdayEnd,
      sevenDaysAgoStart,
      thisMonthStart,
      lastMonthStart, lastMonthEnd
    } = dateRanges;

    if (timeRange === 'all') return true;
    if (timeRange === 'today') return date >= todayStart && date <= todayEnd;
    if (timeRange === 'yesterday') return date >= yesterdayStart && date <= yesterdayEnd;
    if (timeRange === '7days') return date >= sevenDaysAgoStart && date <= todayEnd;
    if (timeRange === 'month_this') return date >= thisMonthStart && date <= todayEnd;
    if (timeRange === 'month_last') return date >= lastMonthStart && date <= lastMonthEnd;
    if (timeRange === 'custom') {
      if (!startDate || !endDate) return true;
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      return date >= start && date <= end;
    }
    return true;
  };

  // Generate and filter sales statistics based on timing
  const reportData = useMemo(() => {
    const productSales = new Map<string, { qty: number, revenue: number, cost: number, profit: number, categoryName: string }>();

    orders
      .filter(o => o.status === 'completed' && isOrderInTimeRange(o.createdAt))
      .forEach(o => {
        o.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const current = productSales.get(product.id) || { qty: 0, revenue: 0, cost: 0, profit: 0, categoryName: categories.find(c => c.id === product.categoryId)?.name || 'Khác' };
            current.qty += item.quantity;
            current.revenue += item.quantity * item.priceOnOrder;
            current.cost += item.quantity * (product.cost || 0);
            current.profit = current.revenue - current.cost;
            productSales.set(product.id, current);
          }
        });
      });

    const salesArray = Array.from(productSales.entries()).map(([id, data]) => ({ id, ...data }));
    
    const totals = salesArray.reduce((acc, sale) => {
        const prod = products.find(p => p.id === sale.id);
        const cat = prod ? categories.find(c => c.id === prod.categoryId) : undefined;
        const group = prod ? getGroupType(prod, cat) : 'food';
        
        // Add to specific group
        acc[group].revenue += sale.revenue;
        acc[group].cost += sale.cost;
        acc[group].profit += sale.profit;
        acc[group].qty += sale.qty;

        // Add to grand total
        acc.grand.revenue += sale.revenue;
        acc.grand.cost += sale.cost;
        acc.grand.profit += sale.profit;
        acc.grand.qty += sale.qty;

        return acc;
    }, { 
      food: { revenue:0, cost:0, profit:0, qty:0 }, 
      drink: { revenue:0, cost:0, profit:0, qty:0 },
      grand: { revenue:0, cost:0, profit:0, qty:0 }
    });

    // Calculate totals and order counts
    let cashRevenue = 0;
    let bankingRevenue = 0;
    let totalDiscount = 0;
    
    let totalCompletedOrders = 0;
    let pendingOrdersCount = 0;
    let preparingOrdersCount = 0;

    orders
      .filter(o => isOrderInTimeRange(o.createdAt))
      .forEach(o => {
        if (o.status === 'completed') {
          totalCompletedOrders++;
          totalDiscount += o.discountAmount || 0;
          if (o.paymentMethod === 'banking') {
            bankingRevenue += o.totalAmount;
          } else {
            cashRevenue += o.totalAmount;
          }
        } else if (o.status === 'pending') {
          pendingOrdersCount++;
        } else if (o.status === 'preparing') {
          preparingOrdersCount++;
        }
      });

    return { salesArray, totals, cashRevenue, bankingRevenue, totalDiscount, totalCompletedOrders, pendingOrdersCount, preparingOrdersCount };
  }, [orders, products, categories, timeRange, startDate, endDate]);

  // Handle head click for sorting
  const handleSort = (field: SortByType) => {
    if (sortBy === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(field);
      setSortDesc(true);
    }
  };

  // Sort Sales Array
  const sortedSales = useMemo(() => {
    const list = [...reportData.salesArray];
    return list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        const pA = products.find(p => p.id === a.id)?.name || '';
        const pB = products.find(p => p.id === b.id)?.name || '';
        comparison = pA.localeCompare(pB, 'vi');
      } else {
        const valA = a[sortBy];
        const valB = b[sortBy];
        comparison = valA - valB;
      }
      return sortDesc ? -comparison : comparison;
    });
  }, [reportData.salesArray, sortBy, sortDesc, products]);

  // Render sorting arrow icon
  const getSortIcon = (field: SortByType) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 ml-1 inline-block" />;
    }
    return sortDesc ? (
      <ArrowDown className="w-3.5 h-3.5 text-sky-600 font-bold ml-1 inline-block" />
    ) : (
      <ArrowUp className="w-3.5 h-3.5 text-sky-600 font-bold ml-1 inline-block" />
    );
  };

  // Export to Excel function
  const exportToExcel = () => {
    let timeStr = "Tất cả thời gian";
    if (timeRange === 'today') timeStr = "Hôm nay";
    else if (timeRange === 'yesterday') timeStr = "Hôm qua";
    else if (timeRange === '7days') timeStr = "7 ngày qua";
    else if (timeRange === 'month_this') timeStr = "Tháng này";
    else if (timeRange === 'month_last') timeStr = "Tháng trước";
    else if (timeRange === 'custom') timeStr = `Từ ngày ${startDate} đến ngày ${endDate}`;

    const storeHeaderName = storeConfig?.name ? storeConfig.name.toUpperCase() : "QUÁN NHẬU KHAI VỊ";
    const wsData: any[][] = [
      [`BÁO CÁO DOANH THU & LỢI NHUẬN - ${storeHeaderName}`],
      ["Thời gian áp dụng:", timeStr],
      ["Ngày xuất dữ liệu:", new Date().toLocaleString('vi-VN')],
      [], 
      ["I. TỔNG HỢP NHÓM SẢN PHẨM"],
      ["Phân Loại", "Số Lượng Bán", "Doanh Thu (đ)", "Chi Phí (đ)", "Lợi Nhuận (đ)"]
    ];

    const fTotal = reportData.totals.food;
    const dTotal = reportData.totals.drink;
    wsData.push(["Món Ăn", fTotal.qty, fTotal.revenue, fTotal.cost, fTotal.profit]);
    wsData.push(["Đồ Uống / Bia", dTotal.qty, dTotal.revenue, dTotal.cost, dTotal.profit]);
    wsData.push(["TỔNG CỘNG", fTotal.qty + dTotal.qty, fTotal.revenue + dTotal.revenue, fTotal.cost + dTotal.cost, fTotal.profit + dTotal.profit]);
    wsData.push([]); 

    wsData.push(["II. THỐNG KÊ CHI TIẾT TÀI CHÍNH & KHUYẾN MÃI"]);
    wsData.push(["Chỉ Tiêu Tài Chính / Phương Thức Thanh Toán", "Giá Trị (đ)"]);
    wsData.push(["Tổng Doanh Thu Tạm Tính (Trước giảm giá)", reportData.totals.grand.revenue]);
    wsData.push(["Tổng Tiền Khuyến Mãi Đã Chiết Khấu (-)", reportData.totalDiscount]);
    wsData.push(["Tổng Doanh Thu Thực Tế (Sau giảm giá)", reportData.cashRevenue + reportData.bankingRevenue]);
    wsData.push(["  + Doanh Thu Nhận Tiền Mặt (COD)", reportData.cashRevenue]);
    wsData.push(["  + Doanh Thu Nhận Chuyển Khoản (Banking)", reportData.bankingRevenue]);
    wsData.push(["Tổng Lợi Nhuận Kinh Doanh Thực Tế", reportData.totals.grand.profit]);
    wsData.push([]);

    wsData.push(["III. CHI TIẾT SẢN PHẨM"]);
    wsData.push(["STT", "Tên Sản Phẩm", "Danh Mục", "SL Bán", "Doanh Thu (đ)", "Chi Phí (đ)", "Lợi Nhuận (đ)"]);

    reportData.salesArray.forEach((s, index) => {
      const prod = products.find(p => p.id === s.id);
      wsData.push([
        index + 1,
        prod?.name || '',
        s.categoryName,
        s.qty,
        s.revenue,
        s.cost,
        s.profit
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Báo Cáo Doanh Thu");
    XLSX.writeFile(wb, `Bao_Cao_${timeRange}_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="relative font-sans text-slate-800 bg-white w-full py-4 xs:py-6 space-y-4 xs:space-y-6">
      
      {/* HEADER WITH EXCEL EXPORT */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3 xs:pb-4">
        <div>
          <h2 className="text-lg xs:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 xs:w-6 xs:h-6 text-sky-600" />
            BÁO CÁO KINH DOANH
          </h2>
          <p className="text-[10px] xs:text-xs text-slate-500 font-medium mt-0.5">Dữ liệu được cập nhật theo thời gian thực</p>
        </div>

        <button
          onClick={exportToExcel}
          type="button"
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 xs:px-6 py-2 xs:py-2.5 rounded-xl shadow-lg shadow-emerald-200 transition-all uppercase text-[10px] xs:text-xs tracking-wider select-none shrink-0"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 xs:w-4 xs:h-4" /> 
          <span>Xuất Báo Cáo Excel</span>
        </button>
      </div>

      {/* FILTER BAR SECTION */}
      <div className="bg-slate-50 border border-slate-200 p-3 xs:p-5 rounded-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 xs:w-10 xs:h-10 rounded-xl bg-sky-100 flex items-center justify-center border border-sky-200 shrink-0">
              <Clock className="w-4 h-4 xs:w-5 xs:h-5 text-sky-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-700 text-xs xs:text-sm uppercase tracking-wide">Bộ lọc thời gian</h4>
              <p className="text-[9px] xs:text-[10px] text-slate-400 font-bold uppercase font-mono">Lọc dữ liệu theo chu kỳ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 -mx-3 px-3 lg:mx-0 lg:px-0 lg:pb-0 no-scrollbar scroll-smooth">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'today', label: 'Hôm nay' },
              { key: 'yesterday', label: 'Hôm qua' },
              { key: '7days', label: '7 ngày' },
              { key: 'month_this', label: 'Tháng này' },
              { key: 'month_last', label: 'Tháng trước' },
              { key: 'custom', label: 'Tùy chọn' },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setTimeRange(p.key as TimeRangeType)}
                className={`text-[10px] xs:text-[11px] font-bold uppercase px-3.5 py-2 rounded-xl transition-all border whitespace-nowrap shrink-0 ${
                  timeRange === p.key
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-200 border-sky-600'
                    : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* CUSTOM DATES CONTAINER */}
        {timeRange === 'custom' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 mt-3 border-t border-slate-200">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-[10px] xs:text-[11px] font-bold text-slate-500 uppercase w-16 xs:w-20 shrink-0">Từ ngày:</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || todayStr}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 pl-8 font-mono"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-1">
              <span className="text-[10px] xs:text-[11px] font-bold text-slate-500 uppercase w-16 xs:w-20 shrink-0">Đến ngày:</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={todayStr}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 pl-8 font-mono"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STATISTICS CARDS */}
      <div className="grid grid-cols-1 gap-4 xs:gap-6">
        
        {/* TOTAL SUMMARY CARD */}
        <div className="group relative rounded-2xl xs:rounded-3xl border-2 border-sky-600 bg-sky-50/50 p-4 xs:p-6 transition-all">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-black text-sky-900 uppercase text-sm xs:text-base tracking-wider flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-600" /> TỔNG THỐNG KÊ KINH DOANH
              </h3>
              <p className="text-[10px] text-sky-600 font-bold uppercase mt-0.5">Tổng cộng (Món ăn + Đồ uống)</p>
            </div>
            <div className="p-2 xs:p-3 rounded-xl xs:rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-200 shrink-0">
              <TrendingUp className="w-5 h-5 xs:w-6 xs:h-6" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/60 p-4 rounded-xl border border-sky-100 shadow-sm">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Tổng Doanh Thu (Tạm tính)</p>
              <div className="font-mono font-black text-slate-900 text-lg xs:text-2xl flex items-baseline gap-1 flex-wrap">
                <span>{reportData.totals.grand.revenue.toLocaleString('vi-VN')}</span>
                <span className="text-xs font-bold text-slate-400">đ</span>
              </div>
            </div>
            <div className="bg-emerald-600 p-4 rounded-xl shadow-lg shadow-emerald-100">
              <p className="text-[10px] text-emerald-100 font-black uppercase tracking-widest mb-0.5">Tổng Lợi Nhuận</p>
              <div className="font-mono font-black text-white text-lg xs:text-2xl flex items-baseline gap-1 flex-wrap">
                <span>{reportData.totals.grand.profit.toLocaleString('vi-VN')}</span>
                <span className="text-xs font-bold text-emerald-200">đ</span>
              </div>
            </div>
          </div>

          {/* FINANCIAL BREAKDOWN & DISCOUNTS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-sky-200/50">
            <div className="bg-white/70 p-3 rounded-xl border border-sky-100/80 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">💵 TIỀN MẶT COD</p>
                <div className="font-mono font-black text-slate-800 text-xs xs:text-sm mt-0.5">
                  {reportData.cashRevenue.toLocaleString('vi-VN')} <span className="text-[9px] text-slate-400 font-bold">đ</span>
                </div>
              </div>
              <span className="text-lg select-none">💵</span>
            </div>

            <div className="bg-white/70 p-3 rounded-xl border border-sky-100/80 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">🏦 CHUYỂN KHOẢN</p>
                <div className="font-mono font-black text-slate-800 text-xs xs:text-sm mt-0.5">
                  {reportData.bankingRevenue.toLocaleString('vi-VN')} <span className="text-[9px] text-slate-400 font-bold">đ</span>
                </div>
              </div>
              <span className="text-lg select-none">💳</span>
            </div>

            <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100/80 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[9px] text-rose-600 font-extrabold uppercase tracking-widest">🎁 TIỀN KHUYẾN MÃI</p>
                <div className="font-mono font-black text-rose-700 text-xs xs:text-sm mt-0.5">
                  {reportData.totalDiscount.toLocaleString('vi-VN')} <span className="text-[9px] text-rose-450 font-bold">đ</span>
                </div>
              </div>
              <span className="text-lg select-none">🎁</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 xs:gap-6">
          {/* FOODS CARD */}
          <div className="group relative rounded-2xl xs:rounded-3xl border border-emerald-100 bg-white p-4 xs:p-5 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-emerald-900 uppercase text-[11px] xs:text-xs tracking-wider flex items-center gap-1.5">
                <span className="text-lg">🥗</span> THỐNG KÊ MÓN ĂN
              </h3>
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center border-b border-dashed border-slate-100 pb-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Doanh thu:</span>
                <span className="font-mono font-bold text-slate-800 text-sm xs:text-base">
                  {reportData.totals.food.revenue.toLocaleString('vi-VN')} <span className="text-[10px] text-slate-400 font-medium">đ</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-emerald-600 font-bold uppercase">Lợi nhuận:</span>
                <span className="font-mono font-black text-emerald-600 text-sm xs:text-base">
                  {reportData.totals.food.profit.toLocaleString('vi-VN')} <span className="text-[10px]">đ</span>
                </span>
              </div>
            </div>
          </div>

          {/* DRINKS CARD */}
          <div className="group relative rounded-2xl xs:rounded-3xl border border-sky-100 bg-white p-4 xs:p-5 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-sky-900 uppercase text-[11px] xs:text-xs tracking-wider flex items-center gap-1.5">
                <span className="text-lg">🍺</span> THỐNG KÊ ĐỒ UỐNG
              </h3>
              <div className="p-1.5 rounded-lg bg-sky-100 text-sky-600 shrink-0">
                <Info className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center border-b border-dashed border-slate-100 pb-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Doanh thu:</span>
                <span className="font-mono font-bold text-slate-800 text-sm xs:text-base">
                  {reportData.totals.drink.revenue.toLocaleString('vi-VN')} <span className="text-[10px] text-slate-400 font-medium">đ</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-sky-600 font-bold uppercase">Lợi nhuận:</span>
                <span className="font-mono font-black text-sky-600 text-sm xs:text-base">
                  {reportData.totals.drink.profit.toLocaleString('vi-VN')} <span className="text-[10px]">đ</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DATA TABLE SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50/50 p-3 xs:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-200/50 flex items-center justify-center border border-slate-300/30">
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Chi tiết bảng kê sản phẩm</span>
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase">
            Chạm tiêu đề cột để sắp xếp
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-100">
              <tr>
                <th 
                  onClick={() => handleSort('name')} 
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors group text-left"
                >
                  Sản phẩm {getSortIcon('name')}
                </th>
                <th 
                  onClick={() => handleSort('qty')} 
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors group text-right"
                >
                  SL bán {getSortIcon('qty')}
                </th>
                <th 
                  onClick={() => handleSort('revenue')} 
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors group text-right"
                >
                  Doanh thu {getSortIcon('revenue')}
                </th>
                <th 
                  onClick={() => handleSort('cost')} 
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors group text-right"
                >
                  Chi phí {getSortIcon('cost')}
                </th>
                <th 
                  onClick={() => handleSort('profit')} 
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors group text-right"
                >
                  Lợi nhuận {getSortIcon('profit')}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest bg-slate-50/20">
                    Không có số liệu kinh tế trong khoảng thời gian này
                  </td>
                </tr>
              ) : (
                sortedSales.map((s) => {
                  const p = products.find(prod => prod.id === s.id);
                  const cat = p ? categories.find(c => c.id === p.categoryId) : undefined;
                  const isD = p ? getGroupType(p, cat) === 'drink' : false;
                  return (
                    <tr 
                      key={s.id} 
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">{p?.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                          <span>{s.categoryName}</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                            isD ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {isD ? 'Đồ uống' : 'Đồ ăn'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-600">
                        {s.qty}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900 border-x border-slate-50/50">
                        {s.revenue.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-4 text-right font-mono font-medium text-slate-400">
                        {s.cost.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-4 text-right font-mono font-black text-emerald-600 bg-emerald-50/10">
                        {s.profit.toLocaleString('vi-VN')} đ
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
}
