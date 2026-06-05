import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { ActivityLog } from '../types';

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ActivityLog));
      setLogs(data);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200">
      <h3 className="font-bold text-md mb-4 text-slate-700">Nhật ký hệ thống (Gần nhất)</h3>
      <div className="space-y-3">
        {logs.map(log => (
          <div key={log.id} className="border-b border-slate-100 pb-2 text-xs">
            <div className="flex justify-between items-center mb-0.5">
              <span className="font-bold text-sky-700">{log.staffUsername}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="text-slate-600 font-medium">{log.action}</p>
            {log.details && <p className="text-slate-400 mt-0.5 italic">{log.details}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityLogs;
