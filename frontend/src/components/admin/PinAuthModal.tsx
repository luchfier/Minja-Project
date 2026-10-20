import React, { useState } from 'react';
import { Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { VirtualNumpad } from '../common/VirtualNumpad';
import { photoboothApi } from '../../services/photoboothApi';

export interface PinAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyPin = async () => {
    if (pin.length < 6) {
      setErrorMsg('PIN minimal 6 digit.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await photoboothApi.loginAdmin(pin);
      if (res.success) {
        setPin('');
        setAttempts(0);
        onSuccess(res.data.token);
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setErrorMsg(`PIN salah (${nextAttempts}/5). Coba lagi.`);
        setPin('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" title="Akses Admin Terproteksi">
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
          <Lock className="w-7 h-7" />
        </div>

        <p className="text-xs text-slate-300 text-center mb-4">
          Masukkan 6-digit PIN Admin untuk membuka panel konfigurasi sistem.
        </p>

        {/* PIN Dots Display */}
        <div className="w-full max-w-xs h-14 rounded-2xl glass-input mb-2 px-4 flex items-center justify-center gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all ${
                i < pin.length
                  ? 'bg-amber-400 scale-110 shadow-glow-primary'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-red-400 my-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <VirtualNumpad
          value={pin}
          onChange={setPin}
          maxLength={6}
          submitLabel="Masuk"
          onSubmit={handleVerifyPin}
          isSubmitDisabled={isLoading || pin.length < 6}
          className="my-2"
        />

        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>PIN Otorisasi Administrator (6 Digit)</span>
        </div>
      </div>
    </Modal>
  );
};
