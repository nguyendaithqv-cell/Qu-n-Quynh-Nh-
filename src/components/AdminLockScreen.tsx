import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, CheckCircle2, Delete } from 'lucide-react';

interface AdminLockScreenProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function AdminLockScreen({ onSuccess, onCancel }: AdminLockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Match physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSuccess) return;
      
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isSuccess]);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    setErrorMsg('');
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      // Evaluate instantly once 4 digits are typed
      if (newPin === '1111') {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 600);
      } else {
        setTimeout(() => {
          setErrorMsg('Mật mã không đúng! Vui lòng thử lại.');
          setPin('');
        }, 200);
      }
    }
  };

  const handleDelete = () => {
    setErrorMsg('');
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg('');
    setPin('');
  };

  return (
    <div className="w-full h-full min-h-[480px] flex items-center justify-center p-6 bg-slate-900/95 text-slate-100 font-sans z-50">
      <div className="w-full max-w-sm bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700/50 shadow-2xl flex flex-col items-center">
        
        {/* Safe Badge Indicator */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
          isSuccess 
            ? 'bg-emerald-500/25 text-emerald-400 rotate-12 scale-110' 
            : errorMsg 
              ? 'bg-rose-500/25 text-rose-400 animate-bounce' 
              : 'bg-orange-500/15 text-orange-400'
        }`}>
          {isSuccess ? (
            <CheckCircle2 className="w-7 h-7" />
          ) : errorMsg ? (
            <ShieldAlert className="w-7 h-7" />
          ) : (
            <Lock className="w-7 h-7" />
          )}
        </div>

        {/* Text descriptions */}
        <h2 className="text-xl font-black tracking-tight text-white uppercase text-center">
          {isSuccess ? 'Xác thực thành công' : 'Chủ tiệm Đăng nhập'}
        </h2>
        <p className="text-slate-400 text-xs font-medium text-center mt-1.5 px-3 leading-relaxed">
          Khu vực quản trị chỉ dành riêng cho Chủ Nhà Hàng. Hãy nhập mật mã bảo mật để tiếp tục.
        </p>

        {/* PIN Indicators boxes with dots */}
        <div className="flex gap-4 my-6 justify-center">
          {[0, 1, 2, 3].map((index) => {
            const hasValue = pin.length > index;
            return (
              <div
                key={index}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${
                  hasValue 
                    ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                    : errorMsg 
                      ? 'border-rose-500 bg-rose-500/5 animate-pulse' 
                      : 'border-slate-600 bg-slate-800'
                }`}
              >
                {hasValue && (
                  <div className="w-3.5 h-3.5 rounded-full bg-orange-500 animate-zoom-in" />
                )}
              </div>
            );
          })}
        </div>

        {/* Display live dynamic validation errors */}
        <div className="h-4 text-center mt-1 mb-3">
          {errorMsg && (
            <span className="text-[11px] font-bold text-rose-400 tracking-wide uppercase animate-pulse">
              {errorMsg}
            </span>
          )}
          {isSuccess && (
            <span className="text-[11px] font-bold text-emerald-400 tracking-wide uppercase animate-pulse">
              Đang mở khóa hệ thống...
            </span>
          )}
        </div>

        {/* Custom Touch Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full px-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              disabled={isSuccess}
              className="py-3 bg-slate-700/50 hover:bg-slate-700 active:bg-orange-600 active:text-white rounded-xl text-lg font-black text-white hover:border-slate-500 border border-transparent transition-all active:scale-95 cursor-pointer select-none"
            >
              {num}
            </button>
          ))}
          
          {/* Keypad actions */}
          <button
            onClick={handleClear}
            disabled={isSuccess}
            className="py-3 bg-slate-700/20 hover:bg-slate-700/40 text-slate-400 font-bold rounded-xl text-xs uppercase cursor-pointer transition-all active:scale-95 select-none"
          >
            Xóa hết
          </button>
          
          <button
            onClick={() => handleDigit('0')}
            disabled={isSuccess}
            className="py-3 bg-slate-700/50 hover:bg-slate-700 active:bg-orange-600 active:text-white rounded-xl text-lg font-black text-white hover:border-slate-500 border border-transparent transition-all active:scale-95 cursor-pointer select-none"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            disabled={isSuccess}
            className="py-3 bg-slate-700/20 hover:bg-slate-700/40 text-slate-300 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 select-none"
            title="Xóa chữ số vừa nhập"
          >
            <Delete className="w-5 h-5 text-current" />
          </button>
        </div>

        {/* Optional cancel/exit button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-6 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wide cursor-pointer transition-all hover:underline"
          >
            Quay lại màn hình chính
          </button>
        )}

      </div>
    </div>
  );
}
