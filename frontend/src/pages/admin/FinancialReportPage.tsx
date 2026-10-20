import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Banknote,
  QrCode,
  TicketPercent,
  UserCheck,
} from 'lucide-react';
import { photoboothApi } from '../../services/photoboothApi';
import { TransactionReportItem } from '../../types/reports';
import { useToast } from '../../components/common/Toast';

interface FinancialReportPageProps {
  token: string;
}

type DateRangeFilter = 'today' | '7days' | '30days' | 'all';
type PaymentMethodFilter = 'all' | 'qris' | 'cash';
type StatusFilter = 'all' | 'settlement' | 'pending' | 'expire' | 'cancel';

export const FinancialReportPage: React.FC<FinancialReportPageProps> = ({ token }) => {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<TransactionReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [rangeFilter, setRangeFilter] = useState<DateRangeFilter>('7days');
  const [methodFilter, setMethodFilter] = useState<PaymentMethodFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await photoboothApi.getTransactions(token);
      if (res.success) {
        setTransactions(res.data.items);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [token]);

  // Client-side filtering
  const filteredTransactions = transactions.filter((tx) => {
    // Payment method filter
    if (methodFilter !== 'all' && tx.paymentMethod !== methodFilter) {
      return false;
    }
    // Status filter
    if (statusFilter !== 'all' && tx.status !== statusFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tx.orderId.toLowerCase().includes(q) ||
        tx.sessionCode.toLowerCase().includes(q) ||
        tx.packageName.toLowerCase().includes(q) ||
        (tx.voucherCode && tx.voucherCode.toLowerCase().includes(q)) ||
        (tx.confirmedBy && tx.confirmedBy.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Calculate Aggregates
  const settledList = filteredTransactions.filter((t) => t.status === 'settlement');
  const totalRevenue = settledList.reduce((acc, t) => acc + t.grossAmount, 0);
  const qrisRevenue = settledList
    .filter((t) => t.paymentMethod === 'qris')
    .reduce((acc, t) => acc + t.grossAmount, 0);
  const cashRevenue = settledList
    .filter((t) => t.paymentMethod === 'cash')
    .reduce((acc, t) => acc + t.grossAmount, 0);
  const totalDiscountGiven = settledList.reduce((acc, t) => acc + (t.discountAmount || 0), 0);
  const pendingCount = filteredTransactions.filter((t) => t.status === 'pending').length;

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const csvContent = await photoboothApi.exportTransactionsCsv(token);

      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `minja-laporan-keuangan-${todayStr}.csv`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast({
        type: 'success',
        title: 'Ekspor CSV Berhasil',
        message: `File ${filename} berhasil diunduh. Siap dibuka di Microsoft Excel / Google Sheets.`,
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Ekspor Gagal',
        message: 'Gagal mengunduh file laporan transaksi.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <span>Laporan Transaksi & Keuangan</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit rincian penjualan, omzet QRIS & Tunai, voucher diskon, petugas kasir, dan ekspor CSV.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTransactions}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 active:scale-95 text-slate-300 text-xs font-medium border border-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold shadow-glow-primary transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Mengekspor...' : 'Ekspor Laporan (CSV)'}</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omzet Terkonfirmasi */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Omzet Bersih</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{formatRupiah(totalRevenue)}</div>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>{settledList.length} Transaksi Sukses</span>
          </span>
        </div>

        {/* Omzet QRIS Midtrans */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pendapatan QRIS</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">{formatRupiah(qrisRevenue)}</div>
          <span className="text-[11px] text-slate-400">
            {settledList.filter((t) => t.paymentMethod === 'qris').length} transaksi non-tunai
          </span>
        </div>

        {/* Omzet Tunai / Cash */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pendapatan Tunai (Cash)</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">{formatRupiah(cashRevenue)}</div>
          <span className="text-[11px] text-slate-400">
            {settledList.filter((t) => t.paymentMethod === 'cash').length} transaksi di kasir
          </span>
        </div>

        {/* Total Diskon Voucher */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Potongan Voucher</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TicketPercent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono">
            {formatRupiah(totalDiscountGiven)}
          </div>
          <span className="text-[11px] text-slate-400">
            {pendingCount > 0 ? `${pendingCount} order pending` : 'Semua order selesai'}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        {/* Date Range Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
          <button
            onClick={() => setRangeFilter('today')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              rangeFilter === 'today' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setRangeFilter('7days')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              rangeFilter === '7days' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            7 Hari
          </button>
          <button
            onClick={() => setRangeFilter('30days')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              rangeFilter === '30days' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            30 Hari
          </button>
          <button
            onClick={() => setRangeFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              rangeFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            Semua
          </button>
        </div>

        {/* Method & Status Dropdowns & Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className="h-9 px-3 rounded-xl glass-input text-xs text-white bg-slate-900 border border-white/10"
          >
            <option value="all">Semua Metode</option>
            <option value="qris">QRIS Midtrans</option>
            <option value="cash">Tunai / Cash</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-3 rounded-xl glass-input text-xs text-white bg-slate-900 border border-white/10"
          >
            <option value="all">Semua Status</option>
            <option value="settlement">Sukses (Settlement)</option>
            <option value="pending">Menunggu (Pending)</option>
            <option value="cancel">Dibatalkan (Cancel)</option>
            <option value="expire">Kedaluwarsa (Expire)</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari order, voucher, petugas..."
              className="h-9 pl-9 pr-3 rounded-xl glass-input text-xs text-white w-48 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* Transactions Data Table: Columns requested in Section D */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.04] text-[10px] uppercase text-slate-400 font-mono tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Tanggal / Waktu</th>
                <th className="py-3 px-4">Paket</th>
                <th className="py-3 px-4">Metode Pembayaran</th>
                <th className="py-3 px-4">Harga Sblm Diskon</th>
                <th className="py-3 px-4">Kode Voucher</th>
                <th className="py-3 px-4">Nilai Diskon</th>
                <th className="py-3 px-4">Total Dibayar</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Petugas Konfirmasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                  {/* Order ID */}
                  <td className="py-3 px-4 font-mono font-medium text-slate-200">
                    <span className="block font-bold">{tx.orderId}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{tx.sessionCode}</span>
                  </td>

                  {/* Tanggal / Waktu */}
                  <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                    {new Date(tx.createdAt).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  {/* Paket */}
                  <td className="py-3 px-4 text-white font-medium">
                    {tx.packageName}
                    {tx.additionalPrints > 0 && (
                      <span className="text-[10px] text-purple-300 block font-normal">
                        +{tx.additionalPrints} lembar cetak
                      </span>
                    )}
                  </td>

                  {/* Metode Pembayaran */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        tx.paymentMethod === 'cash'
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {tx.paymentMethod === 'cash' ? (
                        <>
                          <Banknote className="w-3 h-3 text-sky-400" />
                          <span>Tunai / Cash</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-3 h-3 text-amber-400" />
                          <span>QRIS Midtrans</span>
                        </>
                      )}
                    </span>
                  </td>

                  {/* Harga Sebelum Diskon */}
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {formatRupiah(tx.subtotal)}
                  </td>

                  {/* Kode Voucher */}
                  <td className="py-3 px-4 font-mono text-xs">
                    {tx.voucherCode ? (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                        {tx.voucherCode}
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>

                  {/* Nilai Diskon */}
                  <td className="py-3 px-4 font-mono text-xs">
                    {tx.discountAmount > 0 ? (
                      <span className="text-emerald-400 font-bold">
                        -{formatRupiah(tx.discountAmount)}
                      </span>
                    ) : (
                      <span className="text-slate-600">Rp 0</span>
                    )}
                  </td>

                  {/* Total yang Dibayar */}
                  <td className="py-3 px-4 font-bold text-white font-mono text-xs">
                    {formatRupiah(tx.grossAmount)}
                  </td>

                  {/* Status Transaksi */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'settlement'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tx.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {tx.status === 'settlement' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                      {tx.status === 'pending' && <Clock className="w-3 h-3 text-amber-400" />}
                      {(tx.status === 'cancel' || tx.status === 'expire') && (
                        <XCircle className="w-3 h-3 text-rose-400" />
                      )}
                      <span>
                        {tx.status === 'settlement'
                          ? 'SUKSES'
                          : tx.status === 'pending'
                          ? 'PENDING'
                          : tx.status === 'expire'
                          ? 'KEDALUWARSA'
                          : 'BATAL'}
                      </span>
                    </span>
                  </td>

                  {/* Petugas Konfirmasi Cash */}
                  <td className="py-3 px-4 text-slate-300 text-[11px]">
                    {tx.confirmedBy ? (
                      <span className="flex items-center gap-1.5 text-sky-300 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{tx.confirmedBy}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600 font-mono">-</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                    Tidak ada transaksi yang cocok dengan kriteria filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
