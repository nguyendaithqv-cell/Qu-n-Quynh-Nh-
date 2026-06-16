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
            // Nếu món đã có isNew thì giữ nguyên, nếu chưa có thì là món mới
            if (item.isNew === undefined) return { ...item, isNew: true };
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
      orderStatus: order.status
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
        items: [] 
      };
    }
    acc[item.orderId].items.push(item);
    return acc;
  }, {} as Record<string, { orderId: string, billCode: string, tableName: string, orderStatus: OrderStatus, items: typeof filteredItems }>));

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
      <header className="flex items-center justify-between p-6 bg-slate-800 border-b border-slate-700 select-none">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-600 rounded-[20px] flex items-center justify-center shadow-lg shadow-emerald-900/40">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Khu Vực Bếp</h1>
            <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Hệ thống chế biến chuyên dụng</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={onBack} className="p-4 bg-rose-900/30 hover:bg-rose-900/60 text-rose-400 rounded-2xl transition flex items-center gap-2">
            <Power className="w-6 h-6" /> Thoát bếp
          </button>
          <button onClick={() => setShowSettings(true)} className="p-4 bg-slate-700 hover:bg-slate-600 rounded-2xl transition">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 bg-slate-850">
        {(['pending', 'preparing', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-6 text-xl font-black uppercase tracking-wider transition-all ${
              activeTab === tab ? 'bg-emerald-600 text-white shadow-inner' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
            }`}
          >
            {tab === 'pending' ? 'Đang Chờ' : tab === 'preparing' ? 'Đang Chế Biến' : 'Đã Xong'}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
        {orderTickets.length === 0 ? (
          <div className="border-4 border-dashed border-slate-800 rounded-3xl p-12 text-slate-700 text-center py-20 text-3xl font-black uppercase tracking-widest flex flex-col items-center gap-6">
            <ChefHat className="w-20 h-20 opacity-30" />
            Không có đơn hàng nào
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {orderTickets.map(ticket => (
              <div key={ticket.orderId} className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex flex-col">
                <div className="p-3 bg-slate-700/50 rounded-t-xl font-black text-emerald-400 border-b border-slate-700 flex justify-between items-center">
                  <span>{ticket.billCode} - {ticket.tableName}</span>
                  {ticket.orderStatus === 'completed' && (
                    <span className="text-[10px] bg-sky-600 text-sky-100 px-1.5 py-0.5 rounded uppercase font-bold">Đã TT</span>
                  )}
                </div>
                <div className="p-2 flex-1 space-y-2">
                  {ticket.items.map(item => (
                    <div key={`${item.orderId}-${item.index}`} className="p-2 bg-slate-900 rounded border border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-bold leading-tight">{item.quantity}x {item.productName}</div>
                        {item.isNew && <span className="px-1.5 py-0.5 bg-red-600 text-[10px] uppercase font-black rounded">Mới</span>}
                      </div>
                      <div className="flex gap-1">
                        {activeTab === 'pending' && (
                          <button
                            onClick={() => handleItemStatusChange(item.orderId, item.index, 'preparing')}
                            className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-xs font-bold uppercase transition"
                          >
                            Nấu
                          </button>
                        )}
                        {activeTab === 'preparing' && (
                          <>
                            <button
                              onClick={() => handleItemStatusChange(item.orderId, item.index, 'pending')}
                              className="flex-1 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-xs font-bold uppercase transition"
                            >
                              Chờ
                            </button>
                            <button
                              onClick={() => handleItemStatusChange(item.orderId, item.index, 'completed')}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-bold uppercase transition"
                            >
                              Xong
                            </button>
                          </>
                        )}
                        {activeTab === 'completed' && (
                          <button
                            onClick={() => handleItemStatusChange(item.orderId, item.index, 'preparing')}
                            className="w-full py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-xs font-bold uppercase transition"
                          >
                            Bỏ Xong
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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

                      if (batchOperations >= 400) {
                          await batch.commit();
                          batch = writeBatch(db);
                          batchOperations = 0;
                      }
                    }
                    
                    if (batchOperations > 0) {
                      await batch.commit();
                    }

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
