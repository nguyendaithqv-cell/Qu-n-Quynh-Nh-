import React, { useState, useEffect } from 'react';
import { ChefHat, Settings, Power } from 'lucide-react';
import { collection, onSnapshot, query, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { Order } from '../types';

interface KitchenPanelProps {
  onBack: () => void;
}

export default function KitchenPanel({ onBack }: KitchenPanelProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'completed'>('pending');
  const [viewMode, setViewMode] = useState<'order' | 'item'>('order');
  const [showSettings, setShowSettings] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const prevOrdersRef = React.useRef<Order[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      // Đánh dấu món mới và giữ trạng thái cũ
      const processedOrders = allOrders.map(order => {
        const updatedItems = order.items.map(item => {
            // Nếu món chưa có trạng thái isNew hoặc isNew là undefined -> là món mới
            if (item.isNew === undefined) return { ...item, isNew: true };
            
            // Nếu món đang ở trạng thái 'preparing' hoặc 'completed', nó không còn là 'Mới'
            if (item.status !== 'pending') return { ...item, isNew: false };
            
            return item;
        });
        return { ...order, items: updatedItems };
      });

      setOrders(processedOrders);
      prevOrdersRef.current = processedOrders;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return unsubscribe;
  }, []);

  // Dữ liệu thô từ các đơn hàng chưa hủy (kể cả đã thanh toán nếu còn món chưa xong)
  const allItems = orders
    .filter(order => order.status !== 'cancelled')
    .flatMap(order => order.items.map((item, index) => ({
      ...item, 
      status: item.status || 'pending', 
      index, 
      orderId: order.id, 
      billCode: order.billCode, 
      tableName: order.tableName,
      orderStatus: order.status,
      note: order.note
    })));

  // Lọc theo tab
  const filteredItems = allItems.filter(item => {
    if (activeTab === 'pending') return item.status === 'pending';
    if (activeTab === 'preparing') return item.status === 'preparing';
    if (activeTab === 'completed') {
      const order = orders.find(o => o.id === item.orderId);
      if (!order) return false;
      const createdAt = new Date(order.createdAt).getTime();
      return item.status === 'completed' && (Date.now() - createdAt) < 24 * 60 * 60 * 1000;
    }
    return false;
  });

  // Gom nhóm theo đơn (Ticket) để hiển thị
  const orderTickets = Object.values(filteredItems.reduce((acc, item) => {
    if (!acc[item.orderId]) {
      acc[item.orderId] = { 
        orderId: item.orderId, 
        billCode: item.billCode, 
        tableName: item.tableName, 
        orderStatus: item.orderStatus,
        items: [],
        note: item.note
      };
    }
    acc[item.orderId].items.push(item);
    return acc;
  }, {} as Record<string, { orderId: string, billCode: string, tableName: string, orderStatus: OrderStatus, items: typeof filteredItems, note?: string }>));

  const itemTickets = Object.values(filteredItems.reduce((acc, item) => {
    if (!acc[item.productName]) {
      acc[item.productName] = { 
        productName: item.productName, 
        items: [] 
      };
    }
    acc[item.productName].items.push(item);
    return acc;
  }, {} as Record<string, { productName: string, items: typeof filteredItems }>));

  const displayTickets = viewMode === 'order' ? orderTickets : itemTickets;

  const handleItemStatusChange = async (orderId: string, itemIndex: number, newStatus: 'pending' | 'preparing' | 'completed') => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = [...order.items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: newStatus, isNew: false };

    // Kiểm tra xem tất cả món đã xong chưa
    const allCompleted = updatedItems.every(item => item.status === 'completed');

    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        items: updatedItems,
        status: allCompleted ? (order.paymentStatus !== 'unpaid' ? 'completed' : 'delivering') : 'preparing' // Tự động chuyển đơn sang preparing, delivering hoặc completed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-900 text-white font-sans flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700 select-none">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/40">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight">Khu Vực Bếp</h1>
            <p className="text-emerald-400 font-bold uppercase tracking-widest text-[9px]">Hệ thống chế biến chuyên dụng</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode(viewMode === 'order' ? 'item' : 'order')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition flex items-center gap-2 ${viewMode === 'item' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          >
            {viewMode === 'order' ? 'Xem theo bàn' : 'Xem theo món'}
          </button>
          <button onClick={onBack} className="px-2 py-1.5 bg-rose-900/30 hover:bg-rose-900/60 text-rose-400 rounded-lg transition flex items-center gap-2 text-xs">
            <Power className="w-3 h-3" /> Thoát bếp
          </button>
          <button onClick={() => setShowSettings(true)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
            <Settings className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 bg-slate-850">
        {(['pending', 'preparing', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-md font-black uppercase tracking-wider transition-all ${
              activeTab === tab ? 'bg-emerald-600 text-white shadow-inner' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
            }`}
          >
            {tab === 'pending' ? 'Đang Chờ' : tab === 'preparing' ? 'Đang Chế Biến' : 'Đã Xong'}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2 bg-slate-950 pt-4">
        {displayTickets.length === 0 ? (
          <div className="border-4 border-dashed border-slate-800 rounded-3xl p-12 text-slate-700 text-center py-20 text-3xl font-black uppercase tracking-widest flex flex-col items-center gap-6">
            <ChefHat className="w-20 h-20 opacity-30" />
            Không có đơn hàng nào
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {displayTickets.map((ticket: any) => {
                const gradientClasses = activeTab === 'pending' ? 'from-amber-400 to-yellow-600' : activeTab === 'preparing' ? 'from-blue-500 to-cyan-600' : 'from-emerald-500 to-green-600';
                
                const title = viewMode === 'order' ? ticket.tableName : ticket.productName;
                const subTitle = viewMode === 'order' ? ticket.billCode : `Tổng: ${ticket.items.reduce((acc: number, i: any) => acc + i.quantity, 0)}`;

                return (
              <div key={viewMode === 'order' ? ticket.orderId : ticket.productName} className={`relative bg-gradient-to-br ${gradientClasses} rounded-3xl p-3 shadow-xl flex flex-col overflow-hidden text-white`}>
                {/* Background Pattern */}
                <ChefHat className="absolute -right-4 -bottom-4 w-24 h-24 text-white opacity-10" />
                
                <div className="flex justify-between items-center mb-2 z-10">
                  <div className="font-black text-xl tracking-tighter truncate" title={title}>{title}</div>
                  <div className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-mono whitespace-nowrap">{subTitle}</div>
                </div>
                {viewMode === 'order' && ticket.note && (
                  <div className="bg-white/20 text-white text-[10px] p-2 rounded-lg mb-2 italic z-10">
                    <span className="font-bold">Ghi chú: </span>{ticket.note}
                  </div>
                )}
                
                <div className="flex-1 space-y-1 z-10">
                  {ticket.items.map((item: any) => (
                    <div key={`${item.orderId}-${item.index}`} className="group p-2 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 flex flex-col gap-1 hover:bg-white/20 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs bg-white/20 px-1.5 py-0.5 rounded-md min-w-[20px] text-center">{item.quantity}</span>
                          <span className="text-xs font-bold">{viewMode === 'item' ? `(Bàn ${item.tableName})` : item.productName}</span>
                        </div>
                        {item.isNew && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-rose-500 text-white rounded-full uppercase font-black tracking-wider shadow-sm">
                            Mới
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {activeTab === 'pending' && (
                          <button
                            onClick={() => handleItemStatusChange(item.orderId, item.index, 'preparing')}
                            className="w-full py-1 bg-white text-yellow-700 font-black rounded-lg text-[10px] uppercase hover:bg-white/90 transition shadow-sm"
                          >
                            Bắt đầu nấu
                          </button>
                        )}
                        {activeTab === 'preparing' && (
                          <>
                            <button
                              onClick={() => handleItemStatusChange(item.orderId, item.index, 'pending')}
                              className="flex-1 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold uppercase transition"
                            >
                              Chờ
                            </button>
                            <button
                              onClick={() => handleItemStatusChange(item.orderId, item.index, 'completed')}
                              className="flex-1 py-1 bg-white text-blue-700 font-black rounded-lg text-[10px] uppercase hover:bg-white/90 transition shadow-sm"
                            >
                              Xong
                            </button>
                          </>
                        )}
                        {activeTab === 'completed' && (
                          <button
                            onClick={() => handleItemStatusChange(item.orderId, item.index, 'preparing')}
                            className="w-full py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold uppercase transition"
                          >
                            Hoàn tác
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
      {showSettings && (
        <div className="absolute inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-6">
          <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 w-full max-w-lg">
            <h2 className="text-2xl font-black uppercase mb-6">Cài đặt Bếp</h2>
            {processing ? (
              <div className="w-full p-4 bg-slate-700 rounded-xl font-bold uppercase transition text-center text-slate-400">
                Đang xử lý...
              </div>
            ) : (
              <button onClick={async () => {
                setProcessing(true);
                try {
                    let count = 0;
                    let batch = writeBatch(db);
                    let batchOperations = 0;
                    for (const order of orders) {
                      if (order.status === 'cancelled') continue;
                      const allCompleted = order.items.every(item => item.status === 'completed');
                      if (allCompleted && (order.status === 'completed' || order.status === 'delivering')) continue;
                      const updatedAllItems = order.items.map(item => {
                        const { isNew, ...rest } = item as any;
                        return { ...rest, status: 'completed' };
                      });
                      const orderDocRef = doc(db, 'orders', order.id);
                      batch.update(orderDocRef, { items: updatedAllItems, status: order.paymentStatus !== 'unpaid' ? 'completed' : 'delivering' });
                      count++;
                      batchOperations++;
                      if (batchOperations >= 400) { await batch.commit(); batch = writeBatch(db); batchOperations = 0; }
                    }
                    if (batchOperations > 0) await batch.commit();
                    console.log(`DEBUG: Đã giải phóng ${count} đơn!`);
                } catch (error) {
                    console.error("DEBUG: Batch Update Error:", error);
                } finally {
                    setProcessing(false);
                    setShowSettings(false);
                }
              }} className="w-full p-4 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold uppercase transition">
                Giải phóng đơn cũ
              </button>
            )}
            <button onClick={() => setShowSettings(false)} className="w-full mt-4 p-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold uppercase transition">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
