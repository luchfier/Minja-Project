import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Save,
  AlertCircle,
  Clock,
  Printer,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { photoboothApi } from '../../services/photoboothApi';
import { PackageItem } from '../../types/package';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';

interface PackageManagementPageProps {
  token: string;
}

export const PackageManagementPage: React.FC<PackageManagementPageProps> = ({ token }) => {
  const { showToast } = useToast();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 45000,
    durationSeconds: 300,
    printCopies: 2,
    additionalPrintPrice: 15000,
    badge: '',
    isActive: true,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const resPackages = await photoboothApi.getAdminPackages(token);
      if (resPackages.success) {
        setPackages(resPackages.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, [token]);

  const handleOpenAddModal = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      price: 45000,
      durationSeconds: 300,
      printCopies: 2,
      additionalPrintPrice: 15000,
      badge: 'Baru',
      isActive: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg: PackageItem) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      durationSeconds: pkg.durationSeconds,
      printCopies: pkg.printCopies,
      additionalPrintPrice: pkg.additionalPrintPrice ?? 15000,
      badge: pkg.badge || '',
      isActive: pkg.isActive,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validations
    if (!formData.name.trim()) {
      setFormError('Nama paket wajib diisi.');
      return;
    }
    if (formData.price < 0 || formData.price % 500 !== 0) {
      setFormError('Harga harus berupa kelipatan Rp 500.');
      return;
    }
    if (formData.durationSeconds < 30) {
      setFormError('Durasi sesi minimal 30 detik.');
      return;
    }
    if (formData.printCopies < 1) {
      setFormError('Jumlah cetak minimal 1 lembar.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPackage) {
        const res = await photoboothApi.updatePackage(token, editingPackage.id, {
          name: formData.name,
          description: formData.description,
          price: formData.price,
          durationSeconds: formData.durationSeconds,
          printCopies: formData.printCopies,
          additionalPrintPrice: formData.additionalPrintPrice,
          badge: formData.badge,
          isActive: formData.isActive,
        });
        if (res.success) {
          showToast({
            type: 'success',
            title: 'Paket Diperbarui',
            message: `Paket "${formData.name}" berhasil disimpan.`,
          });
          setIsModalOpen(false);
          loadPackages();
        } else {
          setFormError(res.error?.message || 'Gagal memperbarui paket');
        }
      } else {
        const res = await photoboothApi.createPackage(token, {
          name: formData.name,
          description: formData.description,
          price: formData.price,
          durationSeconds: formData.durationSeconds,
          printCopies: formData.printCopies,
          additionalPrintPrice: formData.additionalPrintPrice,
          badge: formData.badge,
          isActive: formData.isActive,
          sortOrder: packages.length + 1,
        });
        if (res.success) {
          showToast({
            type: 'success',
            title: 'Paket Baru Dibuat',
            message: `Paket "${formData.name}" berhasil ditambahkan ke katalog.`,
          });
          setIsModalOpen(false);
          loadPackages();
        } else {
          setFormError(res.error?.message || 'Gagal membuat paket baru');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (pkg: PackageItem) => {
    const updatedStatus = !pkg.isActive;
    const res = await photoboothApi.updatePackage(token, pkg.id, { isActive: updatedStatus });
    if (res.success) {
      showToast({
        type: 'info',
        title: updatedStatus ? 'Paket Diaktifkan' : 'Paket Dinonaktifkan',
        message: `Status paket "${pkg.name}" kini ${updatedStatus ? 'Tampil' : 'Tersembunyi'} di layar pelanggan.`,
      });
      loadPackages();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    const res = await photoboothApi.deletePackage(token, deletingId);
    if (res.success) {
      showToast({
        type: 'warning',
        title: 'Paket Dinonaktifkan',
        message: 'Paket telah dinonaktifkan dari katalog pelanggan.',
      });
      loadPackages();
    }
    setDeletingId(null);
  };

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  const formatDurationDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs > 0) return `${mins} Menit ${secs} Dtk`;
    if (mins > 0) return `${mins} Menit`;
    return `${secs} Detik`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <span>Manajemen Paket Photobooth</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Atur harga paket, durasi sesi foto & edit, serta jumlah lembar cetak fisik bawaan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPackages}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 active:scale-95 text-slate-300 text-xs font-medium border border-white/10 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold shadow-glow-primary transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Paket Baru</span>
          </button>
        </div>
      </div>

      {/* Package Cards Grid: Minimalist & Modern */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
              pkg.isActive
                ? 'bg-white/[0.03] backdrop-blur-md border-white/10 hover:border-amber-400/40 shadow-lg'
                : 'bg-white/[0.01] border-white/5 opacity-60'
            }`}
          >
            <div>
              {/* Header Card */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white tracking-tight">{pkg.name}</h3>
                    {pkg.badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 fill-current" />
                        {pkg.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {pkg.description || 'Tidak ada deskripsi paket.'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-lg font-black text-amber-400 font-mono">
                    {formatRupiah(pkg.price)}
                  </span>
                </div>
              </div>

              {/* Minimalist Specs: Durasi Sesi & Jumlah Cetak */}
              <div className="grid grid-cols-2 gap-3 my-4">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                  <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <span className="block text-xs font-black text-white">
                    {formatDurationDisplay(pkg.durationSeconds)}
                  </span>
                  <span className="text-[10px] text-slate-400">Durasi Sesi ({pkg.durationSeconds}s)</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                  <Printer className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                  <span className="block text-xs font-black text-white">
                    {pkg.printCopies} Lembar Cetak
                  </span>
                  <span className="text-[10px] text-slate-400">Cetak Bawaan</span>
                </div>
              </div>

              {/* Extra Print Price per Package */}
              <div className="mt-2 py-2 px-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">Tarif Tambah Cetak:</span>
                <span className="font-extrabold text-amber-400 font-mono">
                  {formatRupiah(pkg.additionalPrintPrice ?? 15000)} / lbr
                </span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => handleToggleActive(pkg)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  pkg.isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-slate-500/15 text-slate-400 border-slate-500/30 hover:bg-slate-500/25'
                }`}
              >
                {pkg.isActive ? (
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
                  onClick={() => handleOpenEditModal(pkg)}
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                  title="Edit Paket"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setDeletingId(pkg.id)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-300 border border-rose-500/20 transition-all cursor-pointer"
                  title="Nonaktifkan Paket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Package Form Modal: Modern & Minimalist */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
        title={editingPackage ? 'Edit Paket Sesi' : 'Tambah Paket Baru'}
      >
        <form onSubmit={handleSavePackage} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Nama & Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Paket
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Paket Quick Studio"
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Badge (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="Contoh: Terpopuler"
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-xs text-white"
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
                placeholder="Deskripsi keunggulan paket bagi pelanggan..."
                className="w-full p-3 rounded-xl glass-input text-xs text-white resize-none"
              />
            </div>

            {/* Harga Paket */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Harga Paket (Rp, kelipatan 500)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="flex-1 h-10 px-3.5 rounded-xl glass-input text-sm font-mono font-bold text-amber-400"
                  required
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {[30000, 45000, 60000, 75000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData({ ...formData, price: preset })}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      formData.price === preset
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/5'
                    }`}
                  >
                    {formatRupiah(preset)}
                  </button>
                ))}
              </div>
            </div>

            {/* Durasi Sesi */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Berapa Lama Sesi Foto & Edit</span>
                </label>
                <span className="text-xs font-black text-amber-400 font-mono">
                  {formatDurationDisplay(formData.durationSeconds)} ({formData.durationSeconds} detik)
                </span>
              </div>

              {/* Quick Duration Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { label: '3 Menit', secs: 180 },
                  { label: '5 Menit', secs: 300 },
                  { label: '8 Menit', secs: 480 },
                  { label: '10 Menit', secs: 600 },
                ].map((item) => (
                  <button
                    key={item.secs}
                    type="button"
                    onClick={() => setFormData({ ...formData, durationSeconds: item.secs })}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                      formData.durationSeconds === item.secs
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Kustom detik:</span>
                <input
                  type="number"
                  min="30"
                  max="1800"
                  step="10"
                  value={formData.durationSeconds}
                  onChange={(e) =>
                    setFormData({ ...formData, durationSeconds: Number(e.target.value) })
                  }
                  className="w-24 h-8 px-2 rounded-lg glass-input text-xs text-white text-center font-mono"
                  required
                />
                <span className="text-[11px] text-slate-400">detik</span>
              </div>
            </div>

            {/* Jumlah Cetak Bawaan & Tarif Tambah Cetak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                  <span>Jumlah Lembar Cetak Bawaan</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((copies) => (
                    <button
                      key={copies}
                      type="button"
                      onClick={() => setFormData({ ...formData, printCopies: copies })}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        formData.printCopies === copies
                          ? 'bg-sky-400 text-slate-950 shadow-sm'
                          : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/5'
                      }`}
                    >
                      {copies} Lbr
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">Input lembar:</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.printCopies}
                    onChange={(e) => setFormData({ ...formData, printCopies: Number(e.target.value) })}
                    className="w-20 h-8 px-2 rounded-lg glass-input text-xs text-white text-center font-mono"
                    required
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Tarif Tambah Cetak Paket Sesi (Rp/Lembar)
                </label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={formData.additionalPrintPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, additionalPrintPrice: Number(e.target.value) })
                  }
                  placeholder="Contoh: 15000"
                  className="w-full h-9 px-3 rounded-xl glass-input text-xs text-white font-mono"
                  required
                />
                <div className="flex items-center gap-1">
                  {[10000, 15000, 20000, 25000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormData({ ...formData, additionalPrintPrice: preset })}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        formData.additionalPrintPrice === preset
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/5'
                      }`}
                    >
                      {formatRupiah(preset)}
                    </button>
                  ))}
                </div>
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
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Paket'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(deletingId)}
        title="Nonaktifkan Paket Ini?"
        message="Paket tidak akan lagi muncul sebagai opsi pilihan di layar sentuh pelanggan. Anda dapat mengaktifkannya kembali kapan saja."
        confirmLabel="Ya, Nonaktifkan"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
