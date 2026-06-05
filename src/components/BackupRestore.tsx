import React, { useRef, useState } from 'react';
import { Save, Upload, AlertCircle } from 'lucide-react';
import { Product, Category, Order, Promotion, Table, Area, StoreConfig } from '../types';

interface BackupRestoreProps {
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
  themeStyles: any;
}

export default function BackupRestore({
  products, categories, promotions, storeConfig, orders, tables, areas,
  onUpdateOrders, onUpdateProducts, onUpdateCategories, onUpdatePromotions, onUpdateTables, onUpdateAreas, onUpdateStoreConfig,
  themeStyles: t
}: BackupRestoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = () => {
    const backupData = {
      products, categories, promotions, storeConfig, orders, tables, areas,
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
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("CẢNH BÁO: Phục hồi dữ liệu sẽ ghi đè toàn bộ dữ liệu hiện tại của hệ thống. Bạn có chắc chắn muốn tiếp tục?")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        
        // Basic validation
        if (!data.products || !data.categories) {
          throw new Error("File không đúng định dạng dữ liệu.");
        }

        onUpdateProducts(data.products || []);
        onUpdateCategories(data.categories || []);
        onUpdatePromotions(data.promotions || []);
        onUpdateStoreConfig(data.storeConfig || {});
        onUpdateOrders(data.orders || []);
        onUpdateTables(data.tables || []);
        onUpdateAreas(data.areas || []);
        
        alert("Phục hồi dữ liệu thành công!");
      } catch (err) {
        console.error(err);
        alert("Có lỗi xảy ra khi phục hồi dữ liệu: " + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setIsRestoring(false);
      }
    };
    setIsRestoring(true);
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
          className={`${t.btnSec} flex items-center gap-2`}
        >
          <Save className="w-4 h-4" /> Sao lưu dữ liệu
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isRestoring}
          className={`${t.btnAccent} flex items-center gap-2`}
        >
          <Upload className="w-4 h-4" /> {isRestoring ? 'Đang phục hồi...' : 'Phục hồi từ file'}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleRestore} 
          accept=".json" 
          className="hidden" 
        />
      </div>
      <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> Sao lưu JSON giúp bạn lưu trữ toàn bộ dữ liệu hiện tại xuống máy tính và phục hồi bất cứ khi nào.
      </p>
    </div>
  );
}
