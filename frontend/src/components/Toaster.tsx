import React from 'react';
import { Toast, ToastComponent } from './Toast';

interface ToasterProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const Toaster: React.FC<ToasterProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[9997] flex flex-col gap-2 max-w-md w-full">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

