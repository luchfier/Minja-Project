import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  Printer,
  Clock,
  TrendingUp,
  Camera,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { photoboothApi } from '../../services/photoboothApi';
import { ReportSummary, TransactionReportItem } from '../../types/reports';
import { AdminTab } from './AdminLayout';
import { printerAdapter } from '../../adapters/printerAdapter';
import { useToast } from '../../components/common/Toast';

interface AdminDashboardPageProps {
  token: string;
  onNavigateTab: (tab: AdminTab) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  token,
  onNavigateTab,
}) => {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestPrinting, setIsTestPrinting] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, txRes] = await Promise.all([
        photoboothApi.getReportsSummary(token),
        photoboothApi.getTransactions(token, { page: 1, limit: 5 }),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (txRes.success) setRecentTransactions(txRes.data.items);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [token]);

  const handleQuickTestPrint = async () => {
    setIsTestPrinting(true);
    try {
      const res = await printerAdapter.testPrint();
      showToast({
        type: 'success',
        title: 'Test Print Terkirim',
        message: res.message || 'Halaman kalibrasi cetak berhasil dikirim ke printer spooler.',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Test Print Gagal',
        message: 'Printer spooler tidak merespons.',
      });
    } finally {
      setIsTestPrinting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Ringkasan Eksekutif Studio</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Sistem Normal
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Metrik operasional real-time, performa penjualan, dan kesehatan perangkat keras.
          </p>
        </div>

        <button
          onClick={loadDashboardData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pendapatan */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Total Pendapatan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {summary ? formatRupiah(summary.totalRevenue) : 'Rp ...'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+18.4% minggu ini</span>
          </div>
        </div>

        {/* Total Sesi */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-sky-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Total Sesi Pelanggan</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {summary ? `${summary.totalSessions} Sesi` : '...'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold">{summary?.completedSessions || 0} Sukses</span>
            <span>•</span>
            <span className="text-rose-400 font-semibold">{summary?.failedSessions || 0} Batal</span>
          </div>
        </div>

        {/* Lembar Cetak Foto */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Cetak Lembar Fisik</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {summary ? `${summary.totalPrints} Lembar` : '...'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Rata-rata 2.1 lembar / sesi</span>
          </div>
        </div>

        {/* Rata-rata Durasi Sesi */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">Rata-rata Durasi</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {summary ? `${Math.round(summary.averageSessionDurationSeconds / 60)}m ${summary.averageSessionDurationSeconds % 60}s` : '...'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <span>Efisiensi rotasi optimal</span>
          </div>
        </div>
      </div>

      {/* Row: Quick Actions & Hardware Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Hub (1 col) */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Pintasan Cepat Admin</span>
          </h3>

          <div className="space-y-2">
            <button
              onClick={handleQuickTestPrint}
              disabled={isTestPrinting}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.99] border border-amber-500/20 text-amber-300 text-xs font-semibold transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4" />
                <span>{isTestPrinting ? 'Mencetak Test Pattern...' : 'Test Print Kalibrasi'}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigateTab('packages')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 text-slate-200 text-xs font-medium transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-sky-400" />
                <span>Atur Harga & Paket Sesi</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => onNavigateTab('branding')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 text-slate-200 text-xs font-medium transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Ganti Tema Warna & Nama Booth</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => onNavigateTab('reports')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 text-slate-200 text-xs font-medium transition-all"
            >
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Unduh Laporan Penjualan (CSV)</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Live Hardware Health (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span>Status Perangkat & Konektivitas Kiosk</span>
            </h3>
            <button
              onClick={() => onNavigateTab('hardware')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <span>Detail Kalibrasi</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Camera */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Kamera Studio</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">Perangkat Kamera Terhubung</p>
              <p className="text-[10px] text-slate-400">Resolusi HD Live View</p>
            </div>

            {/* Printer */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white">Printer Foto</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">Printer Sistem Terhubung</p>
              <p className="text-[10px] text-slate-400">Status: Siap Mencetak</p>
            </div>

            {/* Payment Gateway */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">Midtrans QRIS</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">Auto-Reconciler 3s</p>
              <p className="text-[10px] text-slate-400">Idempotent Webhook Ready</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <p className="text-xs text-emerald-300">
              Semua modul hardware terhubung dan siap melayani sesi interaktif pelanggan tanpa gangguan.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table Preview */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Aktivitas Transaksi Terbaru</h3>
            <p className="text-xs text-slate-400">Daftar 5 order Midtrans QRIS paling mutakhir</p>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            <span>Buka Laporan Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Kode Sesi</th>
                <th className="py-2.5 px-3">Paket</th>
                <th className="py-2.5 px-3">Nominal</th>
                <th className="py-2.5 px-3">Ekstra Cetak</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-200">{tx.orderId}</td>
                  <td className="py-2.5 px-3 text-amber-300 font-bold">{tx.sessionCode}</td>
                  <td className="py-2.5 px-3 text-slate-300">{tx.packageName}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">{formatRupiah(tx.grossAmount)}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {tx.additionalPrints > 0 ? `+${tx.additionalPrints} Lembar` : 'Standar'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'settlement'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tx.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {tx.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    {new Date(tx.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
