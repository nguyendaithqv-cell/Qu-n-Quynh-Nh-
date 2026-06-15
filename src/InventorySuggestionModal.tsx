import React, { useMemo } from 'react';
import { Product } from '../types';
import { X, ShoppingCart, ArrowDownCircle } from 'lucide-react';

interface Suggestion {
  product: Product;
  quantity: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddToReceipt: (suggestion: Suggestion) => void;
  onAddAllToReceipt: (suggestions: Suggestion[]) => void;
}

const InventorySuggestionModal: React.FC<Props> = ({ isOpen, onClose, products, onAddToReceipt, onAddAllToReceipt }) => {
  const suggestedItems = useMemo(() => {
    return products
      .filter(p => p.trackInventory && (p.inventoryCount ?? 0) <= (p.lowStockAlert ?? 0))
      .map(p => ({
        product: p,
        quantity: (p.lowStockAlert ?? 0) - (p.inventoryCount ?? 0) + 10
      }));
  }, [products]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            Đề xuất nhập hàng
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-grow">
          {suggestedItems.length === 0 ? (
            <p className="text-gray-500 text-center py-10">Hiện tại không có sản phẩm nào cần nhập thêm.</p>
          ) : (
            <ul className="space-y-3">
              {suggestedItems.map(({ product, quantity }) => (
                <li key={product.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-xs text-gray-500">Tồn kho: {product.inventoryCount ?? 0} / Ngưỡng: {product.lowStockAlert ?? 0}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-emerald-600">
                      Cần nhập: {quantity}
                    </p>
                    <button
                      onClick={() => onAddToReceipt({ product, quantity })}
                      className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                      title="Thêm vào phiếu nhập"
                    >
                      <ArrowDownCircle className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          {suggestedItems.length > 0 && (
            <button 
              onClick={() => onAddAllToReceipt(suggestedItems)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700"
            >
              Thêm tất cả vào phiếu
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-xl text-sm font-bold">Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default InventorySuggestionModal;
