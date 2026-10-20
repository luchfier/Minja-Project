import React, { useState, useEffect } from 'react';
import {
  Banknote,
  KeyRound,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  DollarSign,
  ShieldCheck,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { photoboothApi } from '../../services/photoboothApi';
import { CashPendingTransaction, CashAuditLogItem } from '../../types/payment';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';

interface CashDeskPageProps {
  token: string;
}

export const CashDeskPage: React.FC<CashDeskPageProps> = ({ token }) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'audit'>('pending');
  const [pendingList, setPendingList] = useState<CashPendingTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<CashAuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Cash Confirmation
  const [selectedTx, setSelectedTx] = useState<CashPendingTransaction | null>(null);
  const [adminPin, setAdminPin] = useState('');
  const [operatorId, setOperatorId] = useState('Kasir 01 (Admin)');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [cashierNote, setCashierNote] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, logsRes] = await Promise.all([
        photoboothApi.getCashPendingTransactions(token),
        photoboothApi.getCashAuditLogs(token),
      ]);
      if (pendingRes.success) {
        setPendingList(pendingRes.data);
      }
      if (logsRes.success) {
        setAuditLogs(logsRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto refresh every 5 seconds to catch live pending cash orders from kiosk
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleOpenConfirmModal = (tx: CashPendingTransaction) => {
    setSelectedTx(tx);
    setAdminPin('');
    setReceivedAmount(tx.grossAmount);
    setCashierNote('');
    setFormError('');
  };

  const handleConfirmCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    setFormError('');

    if (!adminPin.trim()) {
      setFormError('PIN Admin/Petugas wajib diisi.');
      return;
    }

    if (receivedAmount < selectedTx.grossAmount) {
      const kur = selectedTx.grossAmount - receivedAmount;
      setFormError(
        `Uang yang diterima kurang ${formatRupiah(kur)}. Total tagihan adalah ${formatRupiah(
          selectedTx.grossAmount
        )}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await photoboothApi.confirmCashPayment(token, {
        orderId: selectedTx.orderId,
        adminPin,
        receivedAmount,
        operatorId,
        cashierNote,
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'Pembayaran Tunai Dikonfirmasi!',
          message: `Transaksi ${selectedTx.orderId} telah lunas. Kembalian: ${formatRupiah(
            res.data.changeAmount
          )}. Sesi kiosk pelanggan telah aktif!`,
        });
        setSelectedTx(null);
        loadData();
      } else {
        setFormError(res.error?.message || 'Konfirmasi pembayaran tunai gagal.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeAmount = selectedTx ? Math.max(0, receivedAmount - selectedTx.grossAmount) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-400" />
            <span>Kasir & Konfirmasi Pembayaran Tunai</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Validasi uang tunai dari pelanggan di kiosk dan konfirmasi pelunasan secara real-time dengan PIN Admin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 active:scale-95 text-slate-300 text-xs font-medium border border-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Segarkan Antrean</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Menunggu Konfirmasi</span>
            <span className="text-xl font-black text-amber-400">{pendingList.length} Order</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Riwayat Cash Terkonfirmasi</span>
            <span className="text-xl font-black text-emerald-400">{auditLogs.length} Transaksi</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Keamanan Kasir</span>
            <span className="text-xs font-bold text-sky-300">Autentikasi PIN & Log Audit</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs: Pending Orders vs Audit Logs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'pending'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Antrean Menunggu Konfirmasi ({pendingList.length})</span>
          {pendingList.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Riwayat & Audit Log Konfirmasi Kasir ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Pending Orders List */}
      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          {pendingList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.05] text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">Tidak Ada Transaksi Tunai Menunggu</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Saat pelanggan memilih pembayaran tunai di layar kiosk, order akan otomatis muncul di sini untuk dikonfirmasi oleh petugas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pendingList.map((tx) => (
                <div
                  key={tx.id}
                  className="p-5 rounded-3xl bg-white/[0.03] backdrop-blur-md border border-amber-400/30 hover:border-amber-400 shadow-xl flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Nomor Transaksi:</span>
                        <span className="font-mono font-black text-sm text-amber-400">
                          {tx.orderId}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        <span>Menunggu Kasir</span>
                      </span>
                    </div>

                    {/* Details Box */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Paket:</span>
                        <span className="font-bold text-white">{tx.packageName}</span>
                      </div>

                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Harga Paket:</span>
                        <span>{formatRupiah(tx.subtotal)}</span>
                      </div>

                      {tx.voucherCode && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Voucher ({tx.voucherCode}):</span>
                          <span className="font-bold">-{formatRupiah(tx.discountAmount)}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
                        <span className="text-slate-200 font-bold">Total Tagihan Tunai:</span>
                        <span className="text-lg font-black text-emerald-400 font-mono">
                          {formatRupiah(tx.grossAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Dibuat: {new Date(tx.createdAt).toLocaleTimeString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Confirm CTA */}
                  <Button
                    variant="gold"
                    size="md"
                    className="w-full text-xs font-bold flex items-center justify-center gap-2"
                    onClick={() => handleOpenConfirmModal(tx)}
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Terima Uang & Konfirmasi</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Audit Logs List */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-slate-300 font-bold border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Waktu Konfirmasi</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Petugas Kasir</th>
                  <th className="py-3 px-4">Total Tagihan</th>
                  <th className="py-3 px-4">Uang Diterima</th>
                  <th className="py-3 px-4">Kembalian</th>
                  <th className="py-3 px-4">Catatan Kasir</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Belum ada riwayat konfirmasi tunai yang tercatat.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {log.orderId}
                      </td>
                      <td className="py-3 px-4 text-white font-medium flex items-center gap-1.5 mt-2">
                        <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                        <span>{log.operatorId}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-mono">
                        {formatRupiah(log.grossAmount)}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold font-mono">
                        {formatRupiah(log.receivedAmount)}
                      </td>
                      <td className="py-3 px-4 text-sky-300 font-mono">
                        {formatRupiah(log.changeAmount)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 italic">
                        {log.note || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Terkonfirmasi
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Cash Confirmation Modal */}
      <Modal
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        maxWidth="md"
        title="Formulir Konfirmasi Pembayaran Tunai"
      >
        {selectedTx && (
          <form onSubmit={handleConfirmCash} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Invoice Brief */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Nomor Order:</span>
                <span className="font-mono font-bold text-amber-400">{selectedTx.orderId}</span>
                <span className="text-slate-300 block mt-0.5">{selectedTx.packageName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Total Tagihan:</span>
                <span className="font-mono font-black text-white text-lg">
                  {formatRupiah(selectedTx.grossAmount)}
                </span>
                {selectedTx.voucherCode && (
                  <span className="text-[10px] text-emerald-400 font-bold block">
                    Voucher: {selectedTx.voucherCode} (-{formatRupiah(selectedTx.discountAmount)})
                  </span>
                )}
              </div>
            </div>

            {/* Operator & PIN Inputs */}
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
                  value={adminPin}
                  onChange={(e) => {
                    setAdminPin(e.target.value);
                    setFormError('');
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
                  setFormError('');
                }}
                className="w-full h-11 px-3.5 rounded-xl glass-input text-lg font-mono font-black text-emerald-400"
                required
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setReceivedAmount(selectedTx.grossAmount)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.05] hover:bg-white/10 text-slate-300 border border-white/5 transition-all cursor-pointer"
                >
                  Uang Pas ({formatRupiah(selectedTx.grossAmount)})
                </button>
                {[50000, 100000, 150000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReceivedAmount(preset)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.05] hover:bg-white/10 text-slate-300 border border-white/5 transition-all cursor-pointer"
                  >
                    {formatRupiah(preset)}
                  </button>
                ))}
              </div>
            </div>

            {/* Change Calculation Box */}
            <div
              className={`p-4 rounded-2xl border text-center transition-all ${
                receivedAmount < selectedTx.grossAmount
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : changeAmount > 0
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
              }`}
            >
              {receivedAmount < selectedTx.grossAmount ? (
                <div>
                  <span className="text-[11px] font-medium block">Nominal Pembayaran Kurang:</span>
                  <span className="text-xl font-black font-mono">
                    Kurang {formatRupiah(selectedTx.grossAmount - receivedAmount)}
                  </span>
                </div>
              ) : changeAmount > 0 ? (
                <div>
                  <span className="text-[11px] font-bold block uppercase tracking-wider text-emerald-400">
                    Kembalian yang Harus Diberikan:
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-300">
                    {formatRupiah(changeAmount)}
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

            {/* Cashier Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Catatan Kasir / Loket (Opsional)
              </label>
              <input
                type="text"
                value={cashierNote}
                onChange={(e) => setCashierNote(e.target.value)}
                placeholder="Contoh: Diterima uang pecahan Rp 50.000"
                className="w-full h-9 px-3 rounded-xl glass-input text-xs text-white"
              />
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <Button
                variant="gold"
                size="md"
                type="submit"
                disabled={isSubmitting || receivedAmount < selectedTx.grossAmount}
                isLoading={isSubmitting}
                className="px-5 text-xs font-bold"
              >
                Konfirmasi Lunas & Buka Sesi Kiosk
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
