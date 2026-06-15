import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { SystemNotification } from '../types';
import NotificationModal from './NotificationModal';

interface Props {
  role: 'admin' | 'cashier';
}

const NotificationIcon: React.FC<Props> = ({ role }) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('role', '==', role)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Client-side sort
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SystemNotification));
      console.log('Received notifications for', role, ':', data);
      data.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [role]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      
      {showModal && (
        <NotificationModal 
          notifications={notifications} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
};

export default NotificationIcon;
