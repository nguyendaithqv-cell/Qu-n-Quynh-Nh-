import React from 'react';
import { X, Check } from 'lucide-react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { SystemNotification } from '../types';

interface Props {
  notifications: SystemNotification[];
  onClose: () => void;
}

const NotificationModal: React.FC<Props> = ({ notifications, onClose }) => {
  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { isRead: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('Error marking all as read:', err);
      // Fallback
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true })));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg">Thông báo</h3>
            {notifications.some(n => !n.isRead) && (
              <button 
                id="btn-mark-all-read"
                onClick={markAllAsRead} 
                className="text-xs text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Đọc tất cả
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-center text-slate-500 py-4">Không có thông báo mới.</p>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                className={`p-3 rounded-xl border ${n.isRead ? 'bg-slate-50 opacity-70' : 'bg-sky-50 border-sky-100'}`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm">{n.title}</h4>
                  {!n.isRead && (
                    <button onClick={() => markAsRead(n.id)} className="text-sky-600">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                <span className="text-[10px] text-slate-400 mt-2 block">
                  {new Date(n.createdAt).toLocaleTimeString()} {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
