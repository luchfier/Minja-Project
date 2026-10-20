import React, { useState, useEffect } from 'react';
import {
  TicketPercent,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Save,
  AlertCircle,
  Search,
  RefreshCw,
  Percent,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { photoboothApi } from '../../services/photoboothApi';
import { VoucherItem, VoucherType } from '../../types/voucher';
import { PackageItem } from '../../types/package';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';

interface VoucherManagementPageProps {
  token: string;
}

export const VoucherManagementPage: React.FC<VoucherManagementPageProps> = ({ token }) => {
  const { showToast } = useToast();
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherItem | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'percentage' as VoucherType,
    discountValue: 20,
    maxDiscount: 20000,
    minTransaction: 30000,
    quota: 100,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    applicablePackageIds: [] as string[],
    isActive: true,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([
        photoboothApi.getAdminVouchers(token),
        photoboothApi.getAdminPackages(token),
      ]);
      if (vRes.success) {
        setVouchers(vRes.data);
      }
      if (pRes.success) {
        setPackages(pRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleOpenAddModal = () => {
    setEditingVoucher(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      discountValue: 20,
      maxDiscount: 20000,
      minTransaction: 30000,
      quota: 100,
      validFrom: new Date().toISOString().slice(0, 10),
      validUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      applicablePackageIds: [],
      isActive: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v: VoucherItem) => {
    setEditingVoucher(v);
    setFormData({
      code: v.code,
      name: v.name,
      description: v.description || '',
      type: v.type,
      discountValue: v.discountValue,
      maxDiscount: v.maxDiscount || 0,
      minTransaction: v.minTransaction || 0,
      quota: v.quota,
      validFrom: new Date(v.validFrom).toISOString().slice(0, 10),
      validUntil: new Date(v.validUntil).toISOString().slice(0, 10),
      applicablePackageIds: v.applicablePackageIds || [],
      isActive: v.isActive,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanCode = formData.code.trim().toUpperCase();
    if (!cleanCode) {
      setFormError('Kode voucher wajib diisi.');
      return;
    }

    if (formData.discountValue <= 0) {
      setFormError('Nilai diskon harus lebih dari 0.');
      return;
    }

    if (formData.type === 'percentage' && formData.discountValue > 100) {
      setFormError('Persentase diskon tidak boleh melebihi 100%.');
      return;
    }

    if (formData.quota < 1) {
      setFormError('Kuota voucher minimal 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVoucher) {
        const res = await photoboothApi.updateVoucher(token, editingVoucher.id, {
          code: cleanCode,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          discountValue: formData.discountValue,
          maxDiscount: formData.type === 'percentage' ? formData.maxDiscount : undefined,
          minTransaction: formData.minTransaction,
          quota: formData.quota,
          validFrom: new Date(formData.validFrom).toISOString(),
          validUntil: new Date(formData.validUntil + 'T23:59:59.000Z').toISOString(),
          applicablePackageIds:
            formData.applicablePackageIds.length > 0 ? formData.applicablePackageIds : undefined,
          isActive: formData.isActive,
        });

        if (res.success) {
          showToast({
            type: 'success',
            title: 'Voucher Diperbarui',
            message: `Voucher "${cleanCode}" berhasil disimpan.`,
          });
          setIsModalOpen(false);
          loadData();
        } else {
          setFormError(res.error?.message || 'Gagal memperbarui voucher.');
        }
      } else {
        const res = await photoboothApi.createVoucher(token, {
          code: cleanCode,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          discountValue: formData.discountValue,
          maxDiscount: formData.type === 'percentage' ? formData.maxDiscount : undefined,
          minTransaction: formData.minTransaction,
          quota: formData.quota,
          validFrom: new Date(formData.validFrom).toISOString(),
          validUntil: new Date(formData.validUntil + 'T23:59:59.000Z').toISOString(),
          applicablePackageIds:
            formData.applicablePackageIds.length > 0 ? formData.applicablePackageIds : undefined,
          isActive: formData.isActive,
        });

        if (res.success) {
          showToast({
            type: 'success',
            title: 'Voucher Baru Dibuat',
            message: `Voucher "${cleanCode}" aktif dan siap digunakan.`,
          });
          setIsModalOpen(false);
          loadData();
        } else {
          setFormError(res.error?.message || 'Gagal membuat voucher baru.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (v: VoucherItem) => {
    const updatedStatus = !v.isActive;
    const res = await photoboothApi.updateVoucher(token, v.id, { isActive: updatedStatus });
    if (res.success) {
      showToast({
        type: 'info',
        title: updatedStatus ? 'Voucher Diaktifkan' : 'Voucher Dinonaktifkan',
        message: `Status voucher "${v.code}" kini ${updatedStatus ? 'Dapat Dipakai' : 'Nonaktif'}.`,
      });
      loadData();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    const res = await photoboothApi.deleteVoucher(token, deletingId);
    if (res.success) {
      showToast({
        type: 'warning',
        title: 'Voucher Dinonaktifkan',
        message: 'Voucher telah dinonaktifkan dari sistem.',
      });
      loadData();
    }
    setDeletingId(null);
  };

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  // Filter Vouchers
  const filteredVouchers = vouchers.filter((v) => {
    if (typeFilter !== 'all' && v.type !== typeFilter) return false;
    if (statusFilter === 'active' && !v.isActive) return false;
    if (statusFilter === 'inactive' && v.isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.code.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Summary Metrics
  const totalVouchers = vouchers.length;
  const activeVouchers = vouchers.filter((v) => v.isActive).length;
  const totalUsed = vouchers.reduce((acc, v) => acc + (v.usedCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TicketPercent className="w-5 h-5 text-amber-400" />
            <span>Manajemen Voucher & Kode Promo</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Buat voucher diskon persentase maupun potongan harga tetap untuk pelanggan kiosk.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 active:scale-95 text-slate-300 text-xs font-medium border border-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold shadow-glow-primary transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Voucher Baru</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <TicketPercent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Total Voucher</span>
            <span className="text-xl font-black text-white">{totalVouchers}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Voucher Aktif</span>
            <span className="text-xl font-black text-emerald-400">{activeVouchers}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Total Penukaran Kiosk</span>
            <span className="text-xl font-black text-sky-400">{totalUsed} kali</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode atau nama voucher..."
            className="w-full h-9 pl-9 pr-3 rounded-xl glass-input text-xs text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-9 px-3 rounded-xl glass-input text-xs text-slate-300 bg-slate-900 border border-white/10"
          >
            <option value="all">Semua Tipe</option>
            <option value="percentage">Persentase (%)</option>
            <option value="fixed">Nominal Tetap (Rp)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-3 rounded-xl glass-input text-xs text-slate-300 bg-slate-900 border border-white/10"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Voucher Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredVouchers.map((v) => {
          const isExpired = new Date() > new Date(v.validUntil);
          const isOutOfQuota = v.usedCount >= v.quota;

          return (
            <div
              key={v.id}
              className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                v.isActive && !isExpired && !isOutOfQuota
                  ? 'bg-white/[0.03] backdrop-blur-md border-white/10 hover:border-amber-400/40 shadow-lg'
                  : 'bg-white/[0.01] border-white/5 opacity-60'
              }`}
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-base text-amber-400 tracking-wider">
                        {v.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          v.type === 'percentage'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {v.type === 'percentage' ? `${v.discountValue}%` : formatRupiah(v.discountValue)}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white mt-1">{v.name}</h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      !v.isActive
                        ? 'bg-slate-500/20 text-slate-400'
                        : isExpired
                        ? 'bg-rose-500/20 text-rose-300'
                        : isOutOfQuota
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {!v.isActive
                      ? 'Nonaktif'
                      : isExpired
                      ? 'Kedaluwarsa'
                      : isOutOfQuota
                      ? 'Kuota Habis'
                      : 'Aktif'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {v.description || 'Tidak ada catatan deskripsi.'}
                </p>

                {/* Specs Box */}
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Min. Belanja:</span>
                    <span className="font-semibold text-white">
                      {v.minTransaction ? formatRupiah(v.minTransaction) : 'Tanpa Minimal'}
                    </span>
                  </div>

                  {v.type === 'percentage' && v.maxDiscount && (
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Maks. Potongan:</span>
                      <span className="font-semibold text-amber-400">
                        {formatRupiah(v.maxDiscount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Pemakaian:</span>
                    <span className="font-semibold text-white font-mono">
                      {v.usedCount} / {v.quota} digunakan
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Masa Berlaku:</span>
                    <span className="font-medium text-slate-300">
                      s/d {new Date(v.validUntil).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleActive(v)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    v.isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                      : 'bg-slate-500/15 text-slate-400 border-slate-500/30 hover:bg-slate-500/25'
                  }`}
                >
                  {v.isActive ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Aktif</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Nonaktif</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(v)}
                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                    title="Edit Voucher"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingId(v.id)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-300 border border-rose-500/20 transition-all cursor-pointer"
                    title="Nonaktifkan Voucher"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Voucher */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
        title={editingVoucher ? 'Edit Voucher Promo' : 'Tambah Voucher Baru'}
      >
        <form onSubmit={handleSaveVoucher} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Kode & Nama */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kode Voucher (Kupon)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Contoh: MINJA20"
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-xs font-mono font-bold text-amber-400 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Promosi
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Diskon 20% Pelajar"
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-xs text-white"
                  required
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Deskripsi Singkat
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Penjelasan syarat dan ketentuan voucher..."
                className="w-full p-3 rounded-xl glass-input text-xs text-white resize-none"
              />
            </div>

            {/* Tipe & Nilai Diskon */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <label className="block text-xs font-semibold text-slate-300">Tipe Potongan Diskon</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'percentage' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    formData.type === 'percentage'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-white/[0.04] text-slate-400 border-white/5'
                  }`}
                >
                  <Percent className="w-4 h-4" />
                  <span>Persentase (%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'fixed' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    formData.type === 'fixed'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-white/[0.04] text-slate-400 border-white/5'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Potongan Tetap (Rp)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {formData.type === 'percentage' ? 'Besar Diskon (%)' : 'Besar Potongan (Rp)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={formData.type === 'percentage' ? 100 : 1000000}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-xl glass-input text-xs font-bold text-white font-mono"
                    required
                  />
                </div>

                {formData.type === 'percentage' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Maksimal Diskon (Rp, 0 = tanpa batas)
                    </label>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: Number(e.target.value) })}
                      className="w-full h-10 px-3.5 rounded-xl glass-input text-xs text-white font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Min Transaksi & Kuota */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Minimal Transaksi (Rp)
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={formData.minTransaction}
                  onChange={(e) => setFormData({ ...formData, minTransaction: Number(e.target.value) })}
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kuota Pemakaian Total
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={formData.quota}
                  onChange={(e) => setFormData({ ...formData, quota: Number(e.target.value) })}
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-xs text-white font-mono"
                  required
                />
              </div>
            </div>

            {/* Periode Berlaku */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Berlaku Mulai
                </label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Berlaku Hingga
                </label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-xs text-white"
                  required
                />
              </div>
            </div>

            {/* Paket yang Memenuhi Syarat */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Batasi Paket yang Memenuhi Syarat (Opsional)
              </label>
              <p className="text-[10px] text-slate-400">
                Pilih paket tertentu jika voucher ini bersifat eksklusif. Kosongkan semua pilihan agar berlaku untuk semua paket.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {packages.map((pkg) => {
                  const isChecked = formData.applicablePackageIds.includes(pkg.id);
                  return (
                    <label
                      key={pkg.id}
                      className={`p-2 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                          : 'bg-white/[0.04] text-slate-300 border-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              applicablePackageIds: [...formData.applicablePackageIds, pkg.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              applicablePackageIds: formData.applicablePackageIds.filter(
                                (id) => id !== pkg.id
                              ),
                            });
                          }
                        }}
                        className="rounded accent-amber-400"
                      />
                      <span className="truncate">{pkg.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold shadow-glow-primary cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Voucher'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Confirmation */}
      <ConfirmationDialog
        isOpen={Boolean(deletingId)}
        title="Nonaktifkan Voucher Ini?"
        message="Voucher tidak akan dapat digunakan oleh pelanggan di layar sentuh kiosk. Anda dapat mengaktifkannya kembali kapan saja."
        confirmLabel="Ya, Nonaktifkan"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
