import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  QrCode,
  Banknote,
  TicketPercent,
  Trash2,
  AlertCircle,
  KeyRound,
  DollarSign,
  Sparkles,
  Zap,
} from 'lucide-react';
import { CreatePaymentResponse, PaymentMethod } from '../../types/payment';
import { PackageItem } from '../../types/package';
import { photoboothApi } from '../../services/photoboothApi';
import { QRISDisplay } from '../../components/customer/QRISDisplay';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { useToast } from '../../components/common/Toast';
import { useSession } from '../../contexts/SessionContext';
import { playButtonSound } from '../../services/soundEffects';

export interface PaymentScreenProps {
  payment: CreatePaymentResponse;
  selectedPackage?: PackageItem | null;
  sessionId?: string;
  onPaymentSuccess: () => void;
  onCancelSession: () => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  payment: initialPayment,
  selectedPackage,
  sessionId,
  onPaymentSuccess,
  onCancelSession,
}) => {
  const { showToast } = useToast();
  const { updatePaymentData } = useSession();

  // Active Payment State
  const [currentPayment, setCurrentPayment] = useState<CreatePaymentResponse>(initialPayment);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialPayment.paymentMethod || 'qris');
  const [isChangingMethod, setIsChangingMethod] = useState(false);

  // Voucher State
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    name: string;
    discountAmount: number;
  } | null>(
    initialPayment.voucherCode && initialPayment.discountAmount
      ? {
          code: initialPayment.voucherCode,
          name: initialPayment.voucherCode,
          discountAmount: initialPayment.discountAmount,
        }
      : null
  );
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  // Settlement & Polling State
  const [isSettled, setIsSettled] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cashier PIN Modal State (Entry point for staff confirmation)
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffPin, setStaffPin] = useState('');
  const [operatorId, setOperatorId] = useState('Kasir 01 (Admin)');
  const [receivedAmount, setReceivedAmount] = useState<number>(initialPayment.grossAmount);
  const [cashierNote, setCashierNote] = useState('');
  const [staffError, setStaffError] = useState('');
  const [isSubmittingCash, setIsSubmittingCash] = useState(false);
  const [isBypassing, setIsBypassing] = useState(false);

  // Dev / Test Mode: Instant bypass to test camera & next steps
  const handleBypassPayment = async () => {
    if (isBypassing || isSettled) return;
    setIsBypassing(true);
    playButtonSound('success');

    showToast({
      type: 'info',
      title: '⚡ Mode Test: Bypass Pembayaran',
      message: 'Sedang memproses pelunasan instan untuk pengujian...',
    });

    try {
      await photoboothApi.forcePaymentSettlement(currentPayment.orderId);
    } catch (err) {
      console.warn('[PaymentScreen] Fallback forcePaymentSettlement:', err);
    } finally {
      setIsSettled(true);
      if (pollingRef.current) clearInterval(pollingRef.current);

      showToast({
        type: 'success',
        title: '⚡ Pembayaran Berhasil Di-bypass!',
        message: 'Status lunas (Mode Test). Memulai kamera...',
      });

      setTimeout(() => {
        onPaymentSuccess();
      }, 700);
    }
  };

  // Keyboard shortcut listener (F8 / Alt + S) to bypass payment during testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8' || (e.altKey && e.key.toLowerCase() === 's')) {
        e.preventDefault();
        handleBypassPayment();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPayment.orderId, isSettled, isBypassing]);

  const formatPrice = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Sync received amount default when gross amount changes
  useEffect(() => {
    setReceivedAmount(currentPayment.grossAmount);
  }, [currentPayment.grossAmount]);

  // Strict backend polling: camera session NEVER starts until backend returns settlement + isVerified
  useEffect(() => {
    let isActive = true;

    const pollPaymentStatus = async () => {
      try {
        const res = await photoboothApi.checkPaymentStatus(currentPayment.orderId);
        if (res.success && isActive) {
          if (res.data.transactionStatus === 'settlement' && res.data.isVerified) {
            setIsSettled(true);
            if (pollingRef.current) clearInterval(pollingRef.current);

            showToast({
              type: 'success',
              title: 'Pembayaran Terverifikasi!',
              message:
                currentPayment.paymentMethod === 'cash'
                  ? 'Pembayaran tunai telah diverifikasi oleh petugas kasir. Memulai kamera...'
                  : 'Transaksi QRIS berhasil dikonfirmasi oleh sistem. Memulai kamera...',
            });

            // Smooth delay for customer to see success confirmation
            setTimeout(() => {
              if (isActive) onPaymentSuccess();
            }, 1500);
          } else if (res.data.transactionStatus === 'expire') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            showToast({
              type: 'error',
              title: 'Waktu Pembayaran Habis',
              message: 'Transaksi telah kedaluwarsa. Silakan pilih paket kembali.',
            });
            onCancelSession();
          }
        }
      } catch (err) {
        console.warn('Gagal polling status pembayaran:', err);
      }
    };

    // Poll every 2.5 seconds
    pollingRef.current = setInterval(pollPaymentStatus, 2500);

    return () => {
      isActive = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [currentPayment.orderId, currentPayment.paymentMethod, onPaymentSuccess, onCancelSession, showToast]);

  // Notice for Coming Soon Cash Option
  const handleCashComingSoonNotice = () => {
    showToast({
      type: 'info',
      title: 'Segera Hadir',
      message: 'Metode pembayaran Tunai / Cash sedang dipersiapkan dan segera hadir. Silakan gunakan QRIS.',
    });
  };

  // Handle Switching Payment Method
  const handleSelectPaymentMethod = async (method: PaymentMethod) => {
    if (method === paymentMethod) return;
    playButtonSound('secondary');
    setIsChangingMethod(true);
    setPaymentMethod(method);

    try {
      const sid = sessionId || 'ses_' + Math.random().toString(36).substring(2, 9);
      const res = await photoboothApi.createPayment(sid, method, appliedVoucher?.code);
      if (res.success) {
        setCurrentPayment(res.data);
        updatePaymentData(res.data);
        showToast({
          type: 'info',
          title: method === 'cash' ? 'Metode Tunai Dipilih' : 'Metode QRIS Dipilih',
          message:
            method === 'cash'
              ? 'Silakan selesaikan pembayaran tunai kepada petugas kasir.'
              : 'Silakan pindai kode QRIS menggunakan e-wallet atau m-banking.',
        });
      }
    } finally {
      setIsChangingMethod(false);
    }
  };

  // Handle Voucher Application
  const handleApplyVoucher = async (codeToApply?: string) => {
    const code = (codeToApply || voucherInput).trim().toUpperCase();
    if (!code) {
      setVoucherError('Silakan masukkan kode voucher terlebih dahulu.');
      return;
    }

    setIsValidatingVoucher(true);
    setVoucherError(null);

    try {
      const pkgId = selectedPackage?.id || 'pkg-reguler';
      const calcRes = await photoboothApi.calculatePrice({
        packageId: pkgId,
        additionalPrints: 0,
        voucherCode: code,
      });

      if (calcRes.success) {
        if (calcRes.data.voucherError) {
          playButtonSound('delete');
          setVoucherError(calcRes.data.voucherError);
          showToast({
            type: 'error',
            title: 'Voucher Tidak Valid',
            message: calcRes.data.voucherError,
          });
          return;
        }

        if (calcRes.data.discountAmount > 0 && calcRes.data.voucherCode) {
          playButtonSound('success');
          const applied = {
            code: calcRes.data.voucherCode,
            name: calcRes.data.voucherName || calcRes.data.voucherCode,
            discountAmount: calcRes.data.discountAmount,
          };
          setAppliedVoucher(applied);
          setVoucherInput('');
          setVoucherError(null);

          // Re-generate payment with applied voucher
          const sid = sessionId || 'ses_' + Math.random().toString(36).substring(2, 9);
          const payRes = await photoboothApi.createPayment(sid, paymentMethod, applied.code);
          if (payRes.success) {
            setCurrentPayment(payRes.data);
            updatePaymentData(payRes.data);
          }

          showToast({
            type: 'success',
            title: 'Voucher Berhasil Digunakan!',
            message: `Diskon sebesar ${formatPrice(calcRes.data.discountAmount)} berhasil dipotong dari total tagihan.`,
          });
        }
      }
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  // Handle Remove Voucher
  const handleRemoveVoucher = async () => {
    playButtonSound('delete');
    setAppliedVoucher(null);
    setVoucherError(null);
    setVoucherInput('');

    const sid = sessionId || 'ses_' + Math.random().toString(36).substring(2, 9);
    const payRes = await photoboothApi.createPayment(sid, paymentMethod, undefined);
    if (payRes.success) {
      setCurrentPayment(payRes.data);
      updatePaymentData(payRes.data);
    }

    showToast({
      type: 'info',
      title: 'Voucher Dihapus',
      message: 'Potongan harga telah dibatalkan.',
    });
  };

  // Handle Cash Confirmation by Staff
  const handleConfirmCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');

    if (!staffPin.trim()) {
      setStaffError('PIN Admin/Petugas wajib diisi.');
      return;
    }

    if (receivedAmount < currentPayment.grossAmount) {
      const kur = currentPayment.grossAmount - receivedAmount;
      setStaffError(
        `Uang yang diterima kurang ${formatPrice(kur)}. Total tagihan adalah ${formatPrice(
          currentPayment.grossAmount
        )}.`
      );
      return;
    }

    setIsSubmittingCash(true);
    try {
      const token = 'mock-jwt-admin-token-' + Date.now();
      const res = await photoboothApi.confirmCashPayment(token, {
        orderId: currentPayment.orderId,
        adminPin: staffPin,
        receivedAmount,
        operatorId,
        cashierNote,
      });

      if (res.success) {
        setIsStaffModalOpen(false);
        setIsSettled(true);
        showToast({
          type: 'success',
          title: 'Konfirmasi Tunai Berhasil!',
          message: `Uang diterima: ${formatPrice(res.data.receivedAmount)}, Kembalian: ${formatPrice(
            res.data.changeAmount
          )}. Memulai kamera...`,
        });

        setTimeout(() => {
          onPaymentSuccess();
        }, 1500);
      } else {
        setStaffError(res.error?.message || 'Konfirmasi tunai gagal.');
      }
    } finally {
      setIsSubmittingCash(false);
    }
  };

  const changeAmount = Math.max(0, receivedAmount - currentPayment.grossAmount);

  return (
    <div className="w-screen h-screen flex flex-col justify-between p-8 select-none bg-background overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 max-w-6xl mx-auto w-full">
        <Button
          variant="ghost"
          size="md"
          onClick={() => setIsCancelConfirmOpen(true)}
          leftIcon={<ArrowLeft className="w-5 h-5" />}
        >
          Batalkan Transaksi
        </Button>

        <div className="text-center">
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>Pembayaran Sesi Foto</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {paymentMethod === 'cash' ? 'Tunai / Cash' : 'QRIS Midtrans'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pilih metode pembayaran yang nyaman, gunakan voucher promo, lalu selesaikan transaksi
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Dev / Test Mode Bypass Button */}
          <button
            type="button"
            onClick={handleBypassPayment}
            disabled={isBypassing || isSettled}
            title="Lewati pembayaran dan langsung mulai sesi foto kamera (Hotkeys: F8 atau Alt+S)"
            className="text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 px-3 py-1.5 rounded-xl border border-amber-500/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)] group"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>⚡ Skip Bayar (Test Mode)</span>
            <span className="hidden sm:inline-block text-[10px] text-amber-300/70 bg-amber-400/20 px-1.5 py-0.2 rounded font-mono">
              F8
            </span>
          </button>

          {paymentMethod === 'cash' && (
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(true)}
              className="text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 transition-all touch-manipulation active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Bantuan Kasir (PIN)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: 2 Columns */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto items-center">
        {/* Left Column (5 Cols): Payment Method Selection, Voucher Input & Summary */}
        <div className="lg:col-span-5 space-y-4">
          {/* Payment Method Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              1. Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* QRIS Option */}
              <button
                type="button"
                onClick={() => handleSelectPaymentMethod('qris')}
                disabled={isChangingMethod}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  paymentMethod === 'qris'
                    ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  {paymentMethod === 'qris' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>
                <div>
                  <span className="block text-sm font-black text-white">QRIS Midtrans</span>
                  <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                    Scan e-wallet / m-banking instan
                  </span>
                </div>
              </button>

              {/* Cash Option (Sementara Segera Hadir) */}
              <button
                type="button"
                onClick={handleCashComingSoonNotice}
                disabled={isChangingMethod}
                className="p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between bg-white/[0.02] border-white/5 hover:bg-white/[0.05] opacity-70 relative overflow-hidden group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-300 flex items-center justify-center">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Segera Hadir
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-black text-slate-200">Tunai / Cash</span>
                  <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                    Bayar langsung ke kasir (Segera Hadir)
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Voucher Section */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <TicketPercent className="w-4 h-4 text-amber-400" />
                <span>2. Kode Voucher Promo</span>
              </label>
              {appliedVoucher && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Voucher Aktif
                </span>
              )}
            </div>

            {appliedVoucher ? (
              /* Applied Voucher Card */
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white block">
                      {appliedVoucher.code} ({appliedVoucher.name})
                    </span>
                    <span className="text-[11px] font-bold text-emerald-300">
                      Hemat -{formatPrice(appliedVoucher.discountAmount)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
                  title="Hapus Voucher"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Voucher Input Form */
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => {
                      setVoucherInput(e.target.value.toUpperCase());
                      setVoucherError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyVoucher();
                      }
                    }}
                    placeholder="Masukkan kode promo (misal: MINJA20)"
                    className="flex-1 h-10 px-3.5 rounded-xl glass-input text-xs font-mono font-bold text-white uppercase placeholder:text-slate-500"
                  />
                  <Button
                    variant="gold"
                    size="md"
                    onClick={() => handleApplyVoucher()}
                    isLoading={isValidatingVoucher}
                    className="px-4 text-xs font-bold"
                  >
                    Terapkan
                  </Button>
                </div>

                {voucherError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2 text-[11px] text-rose-300 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{voucherError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price Summary Breakdown */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
            <span className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              3. Rincian Tagihan
            </span>

            <div className="flex justify-between text-slate-300">
              <span>{selectedPackage?.name || 'Paket Foto'} (Harga Dasar)</span>
              <span className="font-semibold text-white">
                {formatPrice(currentPayment.basePrice)}
              </span>
            </div>

            {currentPayment.additionalPrintsTotal > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Cetak Ekstra</span>
                <span className="font-semibold text-white">
                  +{formatPrice(currentPayment.additionalPrintsTotal)}
                </span>
              </div>
            )}

            {currentPayment.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Diskon Voucher ({currentPayment.voucherCode})</span>
                <span>-{formatPrice(currentPayment.discountAmount)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-200">Total Akhir Tagihan</span>
              <span className="text-2xl font-black text-amber-400 font-mono">
                {formatPrice(currentPayment.grossAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Payment Details (QRIS or Cash Waiting Card) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          {isSettled ? (
            /* Settlement Success Banner */
            <div className="glass-panel-elevated rounded-3xl p-12 flex flex-col items-center text-center max-w-md w-full border-emerald-500/40 animate-in zoom-in-95">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle2 className="w-14 h-14" />
              </div>
              <h3 className="text-3xl font-black text-white mb-2">
                Pembayaran Sukses!
              </h3>
              <p className="text-slate-300 text-sm max-w-xs mb-4">
                Pembayaran sebesar <strong>{formatPrice(currentPayment.grossAmount)}</strong> telah terkonfirmasi.
              </p>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Menyiapkan Live Preview Kamera...</span>
              </span>
            </div>
          ) : paymentMethod === 'qris' ? (
            /* QRIS Display View */
            <div className="flex flex-col items-center w-full">
              <QRISDisplay
                payment={currentPayment}
                onBypass={handleBypassPayment}
                onExpire={() => {
                  showToast({
                    type: 'error',
                    title: 'QRIS Kedaluwarsa',
                    message: 'Waktu pembayaran telah habis.',
                  });
                  onCancelSession();
                }}
              />
            </div>
          ) : (
            /* Cash Payment Waiting Card */
            <div className="glass-panel-elevated rounded-3xl p-8 max-w-lg w-full border-emerald-500/30 text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-glow-primary">
                <Banknote className="w-10 h-10" />
              </div>

              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Menunggu Konfirmasi Petugas Kasir</span>
                </div>
                <h3 className="text-2xl font-black text-white">Pembayaran Tunai</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
                  Silakan tunjukkan nomor transaksi ini kepada petugas booth dan serahkan uang tunai sesuai total tagihan di bawah.
                </p>
              </div>

              {/* Cash Invoice Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 text-left space-y-2">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-white/10">
                  <span className="text-slate-400">Nomor Transaksi:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {currentPayment.orderId}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Paket Foto:</span>
                  <span className="font-bold text-white">
                    {selectedPackage?.name || 'Paket Standard'}
                  </span>
                </div>

                {appliedVoucher && (
                  <div className="flex justify-between items-center text-xs text-emerald-400">
                    <span>Voucher ({appliedVoucher.code}):</span>
                    <span className="font-bold">
                      -{formatPrice(appliedVoucher.discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10">
                  <span className="text-slate-300 font-bold">Total yang Harus Dibayar:</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {formatPrice(currentPayment.grossAmount)}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Cash */}
              <div className="space-y-2 pt-2">
                <Button
                  variant="gold"
                  size="lg"
                  className="w-full text-sm font-bold flex items-center justify-center gap-2"
                  onClick={() => setIsStaffModalOpen(true)}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Konfirmasi Pembayaran Petugas (Input PIN)</span>
                </Button>

                <button
                  type="button"
                  onClick={handleBypassPayment}
                  disabled={isBypassing || isSettled}
                  className="w-full py-2.5 px-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-98 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.15)] group"
                >
                  <Zap className="w-4 h-4 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>⚡ Skip Bayar Tunai (Mode Test / Dev)</span>
                  <span className="text-[10px] text-amber-300/70 bg-amber-400/20 px-1.5 py-0.5 rounded font-mono">
                    F8
                  </span>
                </button>

                <p className="text-[11px] text-slate-400">
                  Petugas juga dapat mengonfirmasi transaksi ini langsung melalui panel admin.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Notice */}
      <div className="flex items-center justify-center text-xs text-slate-400 gap-2 border-t border-white/10 pt-4 max-w-6xl mx-auto w-full">
        <ShieldAlert className="w-4 h-4 text-amber-400" />
        <span>
          Semua transaksi dilindungi sistem audit otomatis MinjaPhotobooth. Sesi kamera aktif otomatis setelah pelunasan terverifikasi.
        </span>
      </div>

      {/* Staff Cash Confirmation Modal (with PIN, Received Amount & Change Calc) */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        maxWidth="md"
        title="Konfirmasi Pembayaran Kasir (Petugas Booth)"
      >
        <form onSubmit={handleConfirmCashPayment} className="space-y-4">
          {staffError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{staffError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Nomor Transaksi:</span>
              <span className="font-mono font-bold text-amber-400">{currentPayment.orderId}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Total Tagihan:</span>
              <span className="font-mono font-black text-white text-base">
                {formatPrice(currentPayment.grossAmount)}
              </span>
            </div>
          </div>

          {/* Staff ID and PIN Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ID Petugas / Kasir
              </label>
              <input
                type="text"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl glass-input text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>PIN Admin (123456)</span>
              </label>
              <input
                type="password"
                maxLength={6}
                value={staffPin}
                onChange={(e) => {
                  setStaffPin(e.target.value);
                  setStaffError('');
                }}
                placeholder="6 Digit PIN"
                className="w-full h-10 px-3.5 rounded-xl glass-input text-center text-base font-mono font-bold tracking-widest text-amber-400"
                required
              />
            </div>
          </div>

          {/* Amount Received Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Uang Diterima dari Pelanggan (Rp)</span>
            </label>
            <input
              type="number"
              step="1000"
              min="0"
              value={receivedAmount}
              onChange={(e) => {
                setReceivedAmount(Number(e.target.value));
                setStaffError('');
              }}
              className="w-full h-11 px-3.5 rounded-xl glass-input text-lg font-mono font-black text-emerald-400"
              required
            />

            {/* Quick Presets for Cash Bills */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setReceivedAmount(currentPayment.grossAmount)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.05] hover:bg-white/10 text-slate-300 border border-white/5 transition-all cursor-pointer"
              >
                Uang Pas ({formatPrice(currentPayment.grossAmount)})
              </button>
              {[50000, 100000, 150000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReceivedAmount(preset)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.05] hover:bg-white/10 text-slate-300 border border-white/5 transition-all cursor-pointer"
                >
                  {formatPrice(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Live Change Calculation Box */}
          <div
            className={`p-4 rounded-2xl border text-center transition-all ${
              receivedAmount < currentPayment.grossAmount
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : changeAmount > 0
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
            }`}
          >
            {receivedAmount < currentPayment.grossAmount ? (
              <div>
                <span className="text-[11px] font-medium block">Nominal Pembayaran Kurang:</span>
                <span className="text-xl font-black font-mono">
                  Kurang {formatPrice(currentPayment.grossAmount - receivedAmount)}
                </span>
              </div>
            ) : changeAmount > 0 ? (
              <div>
                <span className="text-[11px] font-bold block uppercase tracking-wider text-emerald-400">
                  Kembalian yang Harus Diberikan:
                </span>
                <span className="text-2xl font-black font-mono text-emerald-300">
                  {formatPrice(changeAmount)}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-[11px] font-bold block uppercase tracking-wider text-sky-400">
                  Status Pembayaran:
                </span>
                <span className="text-xl font-black font-mono text-sky-200">
                  Uang Pas (Kembalian Rp 0)
                </span>
              </div>
            )}
          </div>

          {/* Operator Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan Kasir / Loket (Opsional)
            </label>
            <input
              type="text"
              value={cashierNote}
              onChange={(e) => setCashierNote(e.target.value)}
              placeholder="Contoh: Diterima lembar Rp 50.000 rapi"
              className="w-full h-9 px-3 rounded-xl glass-input text-xs text-white"
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <Button
              variant="gold"
              size="md"
              type="submit"
              disabled={isSubmittingCash || receivedAmount < currentPayment.grossAmount}
              isLoading={isSubmittingCash}
              className="px-5 text-xs font-bold"
            >
              Konfirmasi Lunas & Mulai Sesi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog on Cancel */}
      <ConfirmationDialog
        isOpen={isCancelConfirmOpen}
        title="Batalkan Pembayaran?"
        message="Jika Anda membatalkan, sesi pemotretan ini tidak akan dibuat dan Anda akan kembali ke layar awal."
        confirmLabel="Ya, Batalkan"
        cancelLabel="Lanjutkan Bayar"
        variant="danger"
        onConfirm={() => {
          setIsCancelConfirmOpen(false);
          onCancelSession();
        }}
        onCancel={() => setIsCancelConfirmOpen(false)}
      />
    </div>
  );
};
