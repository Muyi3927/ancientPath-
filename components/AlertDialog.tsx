import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, title, message, type = 'info' }) => {
  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconMap = {
    info: '💡',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };

  const colorMap = {
    info: 'text-primary-600',
    success: 'text-green-600',
    error: 'text-red-500',
    warning: 'text-amber-500',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#1e1a14] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-border dark:border-[#4a3f30]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className="text-4xl mb-3">{iconMap[type]}</div>
          {title && (
            <h3 className={`text-lg font-bold mb-2 font-heading ${colorMap[type]}`}>{title}</h3>
          )}
          <p className="text-text-secondary dark:text-[#d4c4b0] text-sm leading-relaxed">{message}</p>
        </div>
        <div className="border-t border-border dark:border-[#4a3f30] px-6 py-3">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors font-heading"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen, onClose, onConfirm, title, message,
  confirmText = '确定', cancelText = '取消', type = 'danger'
}) => {
  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconMap = { danger: '🗑️', warning: '⚠️', info: '💡' };
  const confirmColorMap = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-amber-500 hover:bg-amber-600',
    info: 'bg-primary-600 hover:bg-primary-700',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#1e1a14] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-border dark:border-[#4a3f30]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-warm-100 dark:hover:bg-[#252018] transition-colors">
          <X className="w-4 h-4 text-text-muted" />
        </button>
        <div className="p-6 text-center">
          <div className="text-4xl mb-3">{iconMap[type]}</div>
          {title && (
            <h3 className="text-lg font-bold mb-2 font-heading text-text-primary dark:text-[#f5ece0]">{title}</h3>
          )}
          <p className="text-text-secondary dark:text-[#d4c4b0] text-sm leading-relaxed">{message}</p>
        </div>
        <div className="border-t border-border dark:border-[#4a3f30] px-6 py-3 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-warm-100 dark:bg-[#252018] hover:bg-warm-200 dark:hover:bg-[#352c20] text-text-secondary dark:text-[#d4c4b0] font-medium transition-colors font-heading"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-2.5 rounded-xl text-white font-medium transition-colors font-heading ${confirmColorMap[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen, onClose, onConfirm, title, message, placeholder = '', defaultValue = '',
  confirmText = '确定', cancelText = '取消'
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#1e1a14] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-border dark:border-[#4a3f30]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-warm-100 dark:hover:bg-[#252018] transition-colors">
          <X className="w-4 h-4 text-text-muted" />
        </button>
        <div className="p-6">
          {title && (
            <h3 className="text-lg font-bold mb-2 font-heading text-text-primary dark:text-[#f5ece0]">{title}</h3>
          )}
          {message && (
            <p className="text-text-secondary dark:text-[#d4c4b0] text-sm mb-4">{message}</p>
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { onConfirm(value); onClose(); } }}
            className="w-full px-4 py-2.5 rounded-xl bg-warm-50 dark:bg-[#252018] border border-border dark:border-[#4a3f30] text-text-primary dark:text-[#f5ece0] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          />
        </div>
        <div className="border-t border-border dark:border-[#4a3f30] px-6 py-3 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-warm-100 dark:bg-[#252018] hover:bg-warm-200 dark:hover:bg-[#352c20] text-text-secondary dark:text-[#d4c4b0] font-medium transition-colors font-heading"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(value); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors font-heading"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Global hook for replacing window.alert/confirm/prompt
let globalAlert: ((msg: string) => void) | null = null;
let globalConfirm: ((msg: string) => Promise<boolean>) | null = null;
let globalPrompt: ((msg: string, defaultVal?: string) => Promise<string | null>) | null = null;

export function setGlobalDialogs(alertFn: typeof globalAlert, confirmFn: typeof globalConfirm, promptFn: typeof globalPrompt) {
  globalAlert = alertFn;
  globalConfirm = confirmFn;
  globalPrompt = promptFn;
}

export function showAlert(msg: string) { globalAlert?.(msg); }
export function showConfirm(msg: string): Promise<boolean> { return globalConfirm?.(msg) ?? Promise.resolve(false); }
export function showPrompt(msg: string, defaultVal?: string): Promise<string | null> { return globalPrompt?.(msg, defaultVal) ?? Promise.resolve(null); }
