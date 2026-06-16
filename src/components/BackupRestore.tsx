import React, { useRef, useState } from 'react';
import { Save, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { Product, Category, Order, Promotion, Table, Area, StoreConfig, InventoryReceipt } from '../types';
import { doc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface BackupRestoreProps {
  products: Product[];
  categories: Category[];
  promotions: Promotion[];
  storeConfig: StoreConfig;
  orders: Order[];
  tables: Table[];
  areas: Area[];
  inventoryReceipts: InventoryReceipt[];
  onUpdateOrders: (orders: Order[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdatePromotions: (promotions: Promotion[]) => void;
  onUpdateTables: (tables: Table[]) => void;
  onUpdateAreas: (areas: Area[]) => void;
  onUpdateInventoryReceipts: (receipts: InventoryReceipt[]) => void;
  onUpdateStoreConfig: (config: StoreConfig) => void;
  themeStyles: any;
}

export default function BackupRestore({
  products, categories, promotions, storeConfig, orders, tables, areas, inventoryReceipts,
  onUpdateOrders, onUpdateProducts, onUpdateCategories, onUpdatePromotions, onUpdateTables, onUpdateAreas, onUpdateInventoryReceipts, onUpdateStoreConfig,
  themeStyles: t
}: BackupRestoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      // Fetch system activity logs dynamically from firesore so they are backed up together
      const logsSnapshot = await getDocs(collection(db, 'activityLogs'));
      const activityLogs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const backupData = {
        products, 
        categories, 
        promotions, 
        storeConfig, 
        orders, 
        tables, 
        areas, 
        inventoryReceipts,
        activityLogs,
        backupDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const restaurantName = storeConfig.name ? storeConfig.name.replace(/\s+/g, '_') : 'quan';
      const date = new Date().toLocaleString('vi-VN').replace(/[/:]/g, '-');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${restaurantName}_${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi sao lưu dữ liệu.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("CẢNH BÁO: Phục hồi dữ liệu sẽ ghi đè toàn bộ dữ liệu hiện tại của hệ thống. Bạn có chắc chắn muốn tiếp tục?")) {
      return;
    }

    setIsRestoring(true);
    setProgress(10);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        
        if (!data.products || !data.categories) {
          throw new Error("File không đúng định dạng dữ liệu.");
        }

        setProgress(30);

        // Collect all write operations
        const operations: { col: string; id: string; data: any }[] = [];
        
        const itemsToSave = [
            { col: 'products', items: data.products || [] },
            { col: 'categories', items: data.categories || [] },
            { col: 'promotions', items: data.promotions || [] },
            { col: 'orders', items: data.orders || [] },
            { col: 'tables', items: data.tables || [] },
            { col: 'areas', items: data.areas || [] },
            { col: 'inventoryReceipts', items: data.inventoryReceipts || [] },
            { col: 'activityLogs', items: data.activityLogs || [] },
        ];
        
        itemsToSave.forEach(({ col, items }) => {
            items.forEach((item: any) => {
                if (item && item.id) {
                    operations.push({ col, id: item.id, data: item });
                }
            });
        });

        // Setup sanitized storeConfig to maintain structure safety
        const sanitizedStoreConfig = data.storeConfig || {};
        const validThemes = ['cyberpunk', 'aura2026', 'dai'];
        if (!sanitizedStoreConfig.theme || !validThemes.includes(sanitizedStoreConfig.theme)) {
            sanitizedStoreConfig.theme = 'dai';
        }
        operations.push({ col: 'storeConfig', id: 'global', data: sanitizedStoreConfig });

        // Commit in chunks of 400 writes to strictly avoid Firestore's 500-commit Batch Write limit
        const CHUNK_SIZE = 400;
        for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
            const chunk = operations.slice(i, i + CHUNK_SIZE);
            const chunkBatch = writeBatch(db);
            chunk.forEach(op => {
                chunkBatch.set(doc(db, op.col, op.id), op.data);
            });
            const subProgress = Math.round(30 + (i / operations.length) * 55);
            setProgress(subProgress);
            await chunkBatch.commit();
        }
        
        setProgress(90);

        // Update local state
        onUpdateProducts(data.products || []);
        onUpdateCategories(data.categories || []);
        onUpdatePromotions(data.promotions || []);
        onUpdateStoreConfig(sanitizedStoreConfig);
        onUpdateOrders(data.orders || []);
        onUpdateTables(data.tables || []);
        onUpdateAreas(data.areas || []);
        onUpdateInventoryReceipts(data.inventoryReceipts || []);
        
        setProgress(100);
        alert("Phục hồi dữ liệu thành công!");
      } catch (err) {
        console.error(err);
        alert("Có lỗi xảy ra khi phục hồi dữ liệu: " + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setIsRestoring(false);
        setProgress(0);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`${t.card} p-5 space-y-4`}>
      <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
        <Save className={`w-4 h-4 ${t.icon}`} /> Sao lưu & Phục hồi
      </h3>
      <div className="flex gap-3">
        <button 
          onClick={handleBackup}
          disabled={isBackingUp || isRestoring}
          className={`${t.btnSec} flex items-center gap-2`}
        >
          {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {isBackingUp ? 'Đang tải sao lưu...' : 'Sao lưu dữ liệu'}
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isRestoring}
          className={`${t.btnAccent} flex items-center gap-2`}
        >
          {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {isRestoring ? 'Đang phục hồi...' : 'Phục hồi từ file'}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleRestore} 
          accept=".json" 
          className="hidden" 
        />
      </div>
      {isRestoring && (
          <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Tiến trình</span>
                  <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all duration-300" style={{width: `${progress}%`}} />
              </div>
          </div>
      )}
      <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> Sao lưu JSON giúp bạn lưu trữ toàn bộ dữ liệu hiện tại xuống máy tính và phục hồi bất cứ khi nào.
      </p>
    </div>
  );
}
