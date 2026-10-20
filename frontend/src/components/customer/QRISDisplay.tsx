import React, { useState, useEffect } from 'react';
import { Lock, RefreshCw, Smartphone, QrCode, Zap } from 'lucide-react';
import { CreatePaymentResponse } from '../../types/payment';

export interface QRISDisplayProps {
  payment: CreatePaymentResponse;
  onExpire?: () => void;
  onBypass?: () => void;
  className?: string;
}

export const QRISDisplay: React.FC<QRISDisplayProps> = ({
  payment,
  onExpire,
  onBypass,
  className = '',
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(180);

  useEffect(() => {
    // 180 seconds countdown timer
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onExpire]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / 180) * 100));

  const qrImageSrc =
    payment.qrUrl ||
    (payment.qrString
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
          payment.qrString
        )}`
      : '');

  return (
    <div
      className={`glass-panel-elevated rounded-3xl p-7 flex flex-col items-center max-w-md w-full mx-auto text-center border-amber-500/20 shadow-2xl relative overflow-hidden ${className}`}
    >
      {/* Decorative top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 rounded-b-full shadow-[0_0_20px_rgba(245,158,11,0.5)]" />

      {/* Header QRIS Brand */}
      <div className="flex items-center justify-between w-full pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-white px-2.5 py-0.5 rounded-md font-black text-slate-950 text-sm tracking-wider shadow-sm flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-red-600 inline" />
            <span>QRIS</span>
          </div>
          <span className="text-[11px] text-slate-300 font-medium">
            Standar Pembayaran Nasional
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>Transaksi Aman</span>
        </div>
      </div>

      {/* Amount & Order ID */}
      <div className="my-1.5">
        <span className="text-xs text-slate-400 tracking-wide font-medium">
          Total Tagihan Pembayaran:
        </span>
        <div className="text-3xl font-black text-amber-400 tracking-tight mt-0.5">
          Rp {payment.grossAmount.toLocaleString('id-ID')}
        </div>
        <p className="text-[11px] font-mono text-slate-400 mt-0.5 select-all">
          Order ID: {payment.orderId}
        </p>
      </div>

      {/* QR Code Container with High Contrast & Subtle Scanning Accent */}
      <div className="relative p-4 bg-white rounded-2xl shadow-xl my-3 flex items-center justify-center border-4 border-amber-500/20 group">
        {qrImageSrc ? (
          <img
            src={qrImageSrc}
            alt="QRIS Pembayaran MinjaPhotobooth"
            className="w-56 h-56 object-contain rounded-lg select-none"
          />
        ) : (
          <div className="w-56 h-56 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <span>Menyiapkan kode QRIS...</span>
          </div>
        )}
      </div>

      {/* Instructions Card for Customers */}
      <div className="w-full my-2 p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 text-left space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Cara Melakukan Pembayaran:</span>
        </div>
        <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside leading-relaxed pl-0.5">
          <li>
            Buka aplikasi <strong>m-Banking</strong> atau <strong>e-Wallet</strong> pilihan Anda.
          </li>
          <li>
            Pilih menu <strong>Scan / Bayar QRIS</strong> lalu arahkan kamera ke kode QR di atas.
          </li>
          <li>
            Periksa nominal & selesaikan pembayaran. Sistem akan langsung memverifikasi otomatis.
          </li>
        </ol>
      </div>

      {/* Countdown Timer with Progress Bar */}
      <div className="w-full my-1.5 bg-slate-900/80 rounded-2xl p-3 border border-white/10">
        <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
          <span className="text-slate-400 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Menunggu Pembayaran Masuk</span>
          </span>
          <span
            className={`font-mono text-sm ${
              secondsLeft < 30 ? 'text-red-400 animate-pulse' : 'text-amber-400'
            }`}
          >
            {formatTimer(secondsLeft)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              secondsLeft < 30 ? 'bg-red-500' : 'bg-amber-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Dev / Test Mode Bypass Button */}
      {onBypass && (
        <button
          type="button"
          onClick={onBypass}
          className="w-full my-1.5 py-2.5 px-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-98 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.15)] group"
          title="Bypass / Konfirmasi Lunas Otomatis untuk Pengujian (Hotkeys: F8 atau Alt+S)"
        >
          <Zap className="w-4 h-4 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>⚡ Simulasi / Skip Bayar (Test Mode)</span>
          <span className="text-[10px] text-amber-300/70 bg-amber-400/20 px-1.5 py-0.5 rounded font-mono">
            F8
          </span>
        </button>
      )}

      {/* Supported Payment Providers */}
      <div className="flex flex-col items-center justify-center gap-1 text-[11px] text-slate-400 mt-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Menerima Seluruh Pembayaran QRIS:
        </span>
        <div className="flex items-center flex-wrap justify-center gap-1.5 font-semibold text-slate-300 text-[11px]">
          <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">BCA Mobile</span>
          <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">Livin' Mandiri</span>
          <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">BRImo</span>
          <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">BNI Mobile</span>
          <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">GoPay</span>
          <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">OVO</span>
          <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">Dana</span>
          <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">ShopeePay</span>
        </div>
      </div>
    </div>
  );
};
