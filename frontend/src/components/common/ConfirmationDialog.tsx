import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidth="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
            variant === 'danger'
              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          }`}
        >
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h3 className="text-2xl font-extrabold text-white mb-2">{title}</h3>
        <p className="text-slate-300 text-base leading-relaxed mb-8">{message}</p>

        <div className="grid grid-cols-2 gap-4 w-full">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full"
          >
            {cancelLabel}
          </Button>

          <Button
            variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            className="w-full"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
