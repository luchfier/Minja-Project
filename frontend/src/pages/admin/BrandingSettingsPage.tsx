import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Sparkles,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  Monitor,
  Upload,
  Image as ImageIcon,
  Trash2,
  Sliders,
  Layers,
  Eye,
  Sun,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { photoboothApi } from '../../services/photoboothApi';
import { useToast } from '../../components/common/Toast';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { KioskBackground } from '../../components/common/KioskBackground';

const PRIMARY_SWATCHES = ['#F59E0B', '#F43F5E', '#8B5CF6', '#10B981', '#06B6D4', '#EC4899'];
const ACCENT_SWATCHES = ['#38BDF8', '#6366F1', '#D946EF', '#84CC16', '#F97316', '#14B8A6'];
const SURFACE_SWATCHES = ['#0E131F', '#0A0A0A', '#18181B', '#0F172A', '#1E1B4B'];

const BLUR_PRESETS = [
  { label: 'Tanpa Blur', value: 0 },
  { label: 'Halus (4px)', value: 4 },
  { label: 'Sedang (10px)', value: 10 },
  { label: 'Kuat (20px)', value: 20 },
  { label: 'Frosted (32px)', value: 32 },
];

const OVERLAY_PRESETS = [
  { label: '20% Terang', value: 20 },
  { label: '40% Seimbang', value: 40 },
  { label: '60% Gelap', value: 60 },
  { label: '80% Pekat', value: 80 },
];

const LOGO_HEIGHT_PRESETS = [
  { label: 'Kecil (44px)', value: 44 },
  { label: 'Sedang (64px)', value: 64 },
  { label: 'Besar (84px)', value: 84 },
];

interface BrandingSettingsPageProps {
  token: string;
}

export const BrandingSettingsPage: React.FC<BrandingSettingsPageProps> = ({ token }) => {
  const { branding, updateBranding, resetBranding } = useTheme();
  const { showToast } = useToast();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    boothName: branding.boothName,
    tagline: branding.tagline,
    welcomeHeadline: branding.welcomeHeadline,
    welcomeSubheadline: branding.welcomeSubheadline,
    startSessionButtonText: branding.startSessionButtonText,
    primaryColor: branding.primaryColor,
    accentColor: branding.accentColor,
    darkSurfaceColor: branding.darkSurfaceColor,
    logoUrl: branding.logoUrl || '',
    wallpaperUrl: branding.wallpaperUrl || '',
    backgroundBlur: branding.backgroundBlur ?? 8,
    backgroundOverlayOpacity: branding.backgroundOverlayOpacity ?? 50,
    backgroundFit: (branding.backgroundFit || 'cover') as 'cover' | 'contain' | 'repeat',
    backgroundOpacity: branding.backgroundOpacity ?? 100,
    logoHeight: branding.logoHeight ?? 64,
    glassmorphismIntensity: (branding.glassmorphismIntensity || 'medium') as 'light' | 'medium' | 'heavy',
    enableVignette: branding.enableVignette !== false,
    maintenanceMode: false,
  });

  const [previewTab, setPreviewTab] = useState<'welcome' | 'package'>('welcome');
  const [isSaving, setIsSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    // Load from admin settings api
    const loadSettings = async () => {
      const res = await photoboothApi.getAdminSettings(token);
      if (res.success) {
        setForm((prev) => ({
          ...prev,
          boothName: res.data.boothName || prev.boothName,
          tagline: res.data.tagline || prev.tagline,
          welcomeHeadline: res.data.welcomeHeadline || prev.welcomeHeadline,
          welcomeSubheadline: res.data.welcomeSubheadline || prev.welcomeSubheadline,
          startSessionButtonText: res.data.startSessionButtonText || prev.startSessionButtonText,
          primaryColor: res.data.primaryColor || prev.primaryColor,
          accentColor: res.data.accentColor || prev.accentColor,
          darkSurfaceColor: res.data.darkSurfaceColor || prev.darkSurfaceColor,
          logoUrl: res.data.logoUrl || prev.logoUrl,
          wallpaperUrl: res.data.wallpaperUrl || prev.wallpaperUrl,
          backgroundBlur: res.data.backgroundBlur ?? prev.backgroundBlur,
          backgroundOverlayOpacity: res.data.backgroundOverlayOpacity ?? prev.backgroundOverlayOpacity,
          backgroundFit: res.data.backgroundFit || prev.backgroundFit,
          backgroundOpacity: res.data.backgroundOpacity ?? prev.backgroundOpacity,
          logoHeight: res.data.logoHeight ?? prev.logoHeight,
          glassmorphismIntensity: res.data.glassmorphismIntensity || prev.glassmorphismIntensity,
          enableVignette: res.data.enableVignette !== false,
        }));
      }
    };
    loadSettings();
  }, [token]);

  // Handle Logo Upload via FileReader
  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast({
        type: 'error',
        title: 'Format Tidak Valid',
        message: 'File logo harus berupa gambar (PNG, JPG, SVG, WebP).',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setForm((prev) => ({ ...prev, logoUrl: result }));
        showToast({
          type: 'success',
          title: 'Logo Terpilih',
          message: 'Logo baru siap diterapkan pada layar kiosk.',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Wallpaper Upload via FileReader
  const handleWallpaperUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast({
        type: 'error',
        title: 'Format Tidak Valid',
        message: 'File background harus berupa gambar (PNG, JPG, WebP).',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setForm((prev) => ({ ...prev, wallpaperUrl: result }));
        showToast({
          type: 'success',
          title: 'Background Terpilih',
          message: 'Wallpaper baru siap diterapkan dengan efek live blur.',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Update backend via API
      await photoboothApi.updateAdminSettings(token, {
        boothName: form.boothName,
        tagline: form.tagline,
        welcomeHeadline: form.welcomeHeadline,
        welcomeSubheadline: form.welcomeSubheadline,
        startSessionButtonText: form.startSessionButtonText,
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
        darkSurfaceColor: form.darkSurfaceColor,
        logoUrl: form.logoUrl,
        wallpaperUrl: form.wallpaperUrl,
        backgroundBlur: form.backgroundBlur,
        backgroundOverlayOpacity: form.backgroundOverlayOpacity,
        backgroundFit: form.backgroundFit,
        backgroundOpacity: form.backgroundOpacity,
        logoHeight: form.logoHeight,
        glassmorphismIntensity: form.glassmorphismIntensity,
        enableVignette: form.enableVignette,
      });

      // 2. Update frontend ThemeContext for instant CSS variables update & localStorage sync
      updateBranding({
        boothName: form.boothName,
        tagline: form.tagline,
        welcomeHeadline: form.welcomeHeadline,
        welcomeSubheadline: form.welcomeSubheadline,
        startSessionButtonText: form.startSessionButtonText,
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
        darkSurfaceColor: form.darkSurfaceColor,
        logoUrl: form.logoUrl,
        wallpaperUrl: form.wallpaperUrl,
        backgroundBlur: form.backgroundBlur,
        backgroundOverlayOpacity: form.backgroundOverlayOpacity,
        backgroundFit: form.backgroundFit,
        backgroundOpacity: form.backgroundOpacity,
        logoHeight: form.logoHeight,
        glassmorphismIntensity: form.glassmorphismIntensity,
        enableVignette: form.enableVignette,
      });

      showToast({
        type: 'success',
        title: 'Pengaturan Tampilan Tersimpan',
        message: 'Logo, wallpaper, live blur, dan konfigurasi tema berhasil diterapkan secara global.',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: 'Terjadi kesalahan saat menyimpan pengaturan branding.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    resetBranding();
    setForm({
      boothName: 'MinjaPhotobooth',
      tagline: 'Momen Istimewa, Abadi Bersama',
      welcomeHeadline: 'Sentuh Layar Untuk Mengabadikan Momenmu',
      welcomeSubheadline: 'Photobooth Mandiri Kualitas Studio Cetak Instan',
      startSessionButtonText: 'Mulai Sesi Foto',
      primaryColor: '#F59E0B',
      accentColor: '#38BDF8',
      darkSurfaceColor: '#0E131F',
      logoUrl: '',
      wallpaperUrl: '',
      backgroundBlur: 8,
      backgroundOverlayOpacity: 50,
      backgroundFit: 'cover',
      backgroundOpacity: 100,
      logoHeight: 64,
      glassmorphismIntensity: 'medium',
      enableVignette: true,
      maintenanceMode: false,
    });
    setShowResetConfirm(false);
    showToast({
      type: 'info',
      title: 'Tema Direset',
      message: 'Tema telah dikembalikan ke konfigurasi standar Minja.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-amber-400" />
            <span>Kustomisasi Tampilan & Tema (Branding)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola logo, wallpaper latar, efek live blur, peredupan overlay, serta palet warna antarmuka kiosk secara fleksibel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 active:scale-95 text-slate-300 text-xs font-medium border border-white/10 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standar</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold shadow-glow-primary transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Upload Logo & Brand Sizing */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>Upload Logo Booth</span>
              </h3>
              {form.logoUrl && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, logoUrl: '' })}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Logo (Gunakan Ikon 'M')</span>
                </button>
              )}
            </div>

            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Dropzone */}
              <div
                onClick={() => logoInputRef.current?.click()}
                className={`sm:col-span-8 border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  form.logoUrl
                    ? 'border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : 'border-white/20 hover:border-amber-500/50 hover:bg-white/[0.02]'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    {form.logoUrl ? 'Klik untuk Mengganti Logo' : 'Klik atau Tarik Logo ke sini'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Format PNG, JPG, SVG transparan disarankan (Rasio bebas)
                  </p>
                </div>
              </div>

              {/* Logo Preview Box */}
              <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-black/40 border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 mb-2">Pratinjau Logo</span>
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Logo Booth"
                    style={{ height: `${form.logoHeight}px` }}
                    className="max-w-full object-contain rounded-lg drop-shadow"
                  />
                ) : (
                  <div
                    style={{ backgroundColor: form.primaryColor }}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-950 font-black text-2xl shadow-glow-primary"
                  >
                    M
                  </div>
                )}
              </div>
            </div>

            {/* Logo Height Preset */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Ukuran / Tinggi Logo di Layar
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LOGO_HEIGHT_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, logoHeight: p.value })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      form.logoHeight === p.value
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Upload Background & Wallpaper Visual Controls */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Upload Wallpaper Background & Efek Visual</span>
              </h3>
              {form.wallpaperUrl && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, wallpaperUrl: '' })}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Wallpaper (Gunakan Radial Default)</span>
                </button>
              )}
            </div>

            <input
              type="file"
              ref={wallpaperInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleWallpaperUpload(file);
              }}
            />

            {/* Dropzone */}
            <div
              onClick={() => wallpaperInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                form.wallpaperUrl
                  ? 'border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10'
                  : 'border-white/20 hover:border-sky-500/50 hover:bg-white/[0.02]'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {form.wallpaperUrl ? 'Klik untuk Mengganti Background Wallpaper' : 'Klik atau Tarik Background Image ke sini'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Dukungan gambar resolusi Full HD / 4K (JPG, PNG, WebP)
                </p>
              </div>
            </div>

            {/* Live Blur Slider & Presets */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Intensitas Live Blur Background</span>
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {form.backgroundBlur} px
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={form.backgroundBlur}
                onChange={(e) => setForm({ ...form, backgroundBlur: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />

              <div className="grid grid-cols-5 gap-1.5">
                {BLUR_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, backgroundBlur: p.value })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold border transition-all truncate text-center cursor-pointer ${
                      form.backgroundBlur === p.value
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">
                Efek blur langsung diterapkan secara dinamis sehingga teks menu tetap tajam dan terbaca.
              </p>
            </div>

            {/* Overlay Dimming Slider & Presets */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-sky-400" />
                  <span>Overlay Kegelapan / Dimming (Ketajaman Kontras Teks)</span>
                </label>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {form.backgroundOverlayOpacity} %
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="95"
                step="5"
                value={form.backgroundOverlayOpacity}
                onChange={(e) =>
                  setForm({ ...form, backgroundOverlayOpacity: Number(e.target.value) })
                }
                className="w-full accent-sky-500 cursor-pointer"
              />

              <div className="grid grid-cols-4 gap-2">
                {OVERLAY_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, backgroundOverlayOpacity: p.value })}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all text-center cursor-pointer ${
                      form.backgroundOverlayOpacity === p.value
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                        : 'bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Fit & Vignette Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mode Pemasangan Gambar
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cover', 'contain', 'repeat'] as const).map((fit) => (
                    <button
                      key={fit}
                      type="button"
                      onClick={() => setForm({ ...form, backgroundFit: fit })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                        form.backgroundFit === fit
                          ? 'bg-white/20 text-white border-white/40'
                          : 'bg-white/[0.03] text-slate-400 border-white/10'
                      }`}
                    >
                      {fit === 'cover' ? 'Penuh' : fit === 'contain' ? 'Pas' : 'Berulang'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Ambient Radial Glow / Vignette
                </label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, enableVignette: !form.enableVignette })}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    form.enableVignette
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-white/[0.03] text-slate-400 border-white/10'
                  }`}
                >
                  <span>Glow Sudut Sinematik</span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-slate-950 text-[10px] font-bold ${
                      form.enableVignette ? 'bg-amber-400' : 'bg-slate-600'
                    }`}
                  >
                    {form.enableVignette ? <Check className="w-3 h-3 text-slate-950" /> : null}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Color Palette Configuration */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Palet Warna Antarmuka (Dynamic Theme)</span>
            </h3>

            {/* Primary Color */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Warna Primer (Tombol Utama & Aksen Brand)
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {form.primaryColor}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {PRIMARY_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, primaryColor: color })}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-lg border transition-transform active:scale-95 flex items-center justify-center cursor-pointer ${
                        form.primaryColor.toLowerCase() === color.toLowerCase()
                          ? 'border-white scale-110 shadow-lg ring-2 ring-white/50'
                          : 'border-white/20'
                      }`}
                    >
                      {form.primaryColor.toLowerCase() === color.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Warna Aksen Sekunder (Badge & Highlight Kiosk)
                </label>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {form.accentColor}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {ACCENT_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, accentColor: color })}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-lg border transition-transform active:scale-95 flex items-center justify-center cursor-pointer ${
                        form.accentColor.toLowerCase() === color.toLowerCase()
                          ? 'border-white scale-110 shadow-lg ring-2 ring-white/50'
                          : 'border-white/20'
                      }`}
                    >
                      {form.accentColor.toLowerCase() === color.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Surface Color */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Warna Latar Gelap (Surface Dasar)
                </label>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {form.darkSurfaceColor}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.darkSurfaceColor}
                  onChange={(e) => setForm({ ...form, darkSurfaceColor: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {SURFACE_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, darkSurfaceColor: color })}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-lg border transition-transform active:scale-95 flex items-center justify-center cursor-pointer ${
                        form.darkSurfaceColor.toLowerCase() === color.toLowerCase()
                          ? 'border-white scale-110 shadow-lg ring-2 ring-white/50'
                          : 'border-white/20'
                      }`}
                    >
                      {form.darkSurfaceColor.toLowerCase() === color.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Booth Text Configuration */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Identitas & Teks Layar Utama</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Nama Booth</label>
                <input
                  type="text"
                  value={form.boothName}
                  onChange={(e) => setForm({ ...form, boothName: e.target.value })}
                  placeholder="MinjaPhotobooth"
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Slogan / Tagline</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="Momen Istimewa, Abadi Bersama"
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Headline Layar Sentuh</label>
              <input
                type="text"
                value={form.welcomeHeadline}
                onChange={(e) => setForm({ ...form, welcomeHeadline: e.target.value })}
                className="w-full h-10 px-3 rounded-xl glass-input text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Subheadline Informasi</label>
              <input
                type="text"
                value={form.welcomeSubheadline}
                onChange={(e) => setForm({ ...form, welcomeSubheadline: e.target.value })}
                className="w-full h-10 px-3 rounded-xl glass-input text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Teks Tombol Mulai</label>
              <input
                type="text"
                value={form.startSessionButtonText}
                onChange={(e) => setForm({ ...form, startSessionButtonText: e.target.value })}
                className="w-full h-10 px-3 rounded-xl glass-input text-xs text-white"
              />
            </div>
          </div>

          {/* 5. Maintenance Mode Toggle */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Mode Pemeliharaan (Maintenance Mode)</h4>
                <p className="text-[11px] text-slate-400">
                  Kunci sesi kiosk dan tampilkan layar pemeliharaan kepada pelanggan.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, maintenanceMode: !form.maintenanceMode })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                form.maintenanceMode ? 'bg-amber-500' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  form.maintenanceMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 sticky top-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-amber-400" />
                <span>Live Interactive Kiosk Preview</span>
              </h3>

              {/* Preview Screen Selector */}
              <div className="flex items-center gap-1 bg-white/[0.05] p-1 rounded-xl border border-white/10 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPreviewTab('welcome')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    previewTab === 'welcome'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Layar Attract
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('package')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    previewTab === 'package'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pilih Paket
                </button>
              </div>
            </div>

            {/* Simulated Screen Box (16:9) */}
            <div
              style={{ backgroundColor: form.darkSurfaceColor }}
              className="w-full aspect-[16/9] rounded-2xl border-2 border-white/20 overflow-hidden flex flex-col justify-between p-4 shadow-2xl relative select-none"
            >
              {/* Dynamic Simulated Background with Real-Time Live Blur & Dimming */}
              <KioskBackground
                customWallpaperUrl={form.wallpaperUrl}
                customBlur={form.backgroundBlur}
                customOverlayOpacity={form.backgroundOverlayOpacity}
                customFit={form.backgroundFit}
                customPrimaryColor={form.primaryColor}
                customAccentColor={form.accentColor}
                customDarkSurfaceColor={form.darkSurfaceColor}
                customVignette={form.enableVignette}
              />

              {previewTab === 'welcome' ? (
                <>
                  {/* Top Header Bar */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-2.5">
                      {form.logoUrl ? (
                        <img
                          src={form.logoUrl}
                          alt="Logo"
                          style={{ height: `${Math.round(form.logoHeight * 0.45)}px` }}
                          className="w-auto object-contain rounded drop-shadow"
                        />
                      ) : (
                        <div
                          style={{ backgroundColor: form.primaryColor }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-950 font-black text-xs shadow-glow-primary"
                        >
                          M
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold text-white tracking-wide block leading-none">
                          {form.boothName}
                        </span>
                        <span className="text-[9px] text-slate-400 leading-none">
                          {form.tagline}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        backgroundColor: `${form.accentColor}25`,
                        color: form.accentColor,
                        borderColor: `${form.accentColor}40`,
                      }}
                      className="px-2 py-0.5 rounded-full text-[9px] font-semibold border"
                    >
                      Studio Kiosk
                    </span>
                  </div>

                  {/* Center Hero Attraction Section */}
                  <div className="text-center my-auto z-10 space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] text-amber-300 font-semibold mb-0.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Self-Service Photobooth</span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-extrabold text-white leading-tight px-4 line-clamp-2">
                      {form.welcomeHeadline}
                    </h4>
                    <p className="text-[9px] text-slate-300 max-w-[260px] mx-auto leading-tight line-clamp-2">
                      {form.welcomeSubheadline}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-center z-10">
                    <div
                      style={{
                        backgroundColor: form.primaryColor,
                        boxShadow: `0 0 15px ${form.primaryColor}50`,
                      }}
                      className="px-4 py-1.5 rounded-xl text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{form.startSessionButtonText}</span>
                    </div>
                  </div>
                </>
              ) : (
                /* Package Screen Mockup Preview */
                <>
                  <div className="flex items-center justify-between z-10 pb-1 border-b border-white/10">
                    <span className="text-[10px] text-slate-300 font-bold">Pilih Paket Foto</span>
                    <span
                      style={{ color: form.accentColor }}
                      className="text-[9px] font-mono font-bold"
                    >
                      {form.boothName}
                    </span>
                  </div>

                  {/* Mock Package Cards */}
                  <div className="grid grid-cols-3 gap-2 my-auto z-10">
                    {[
                      { name: 'Quick Studio', price: '30k', duration: '3 Mnt', prints: '1 Lembar Foto' },
                      { name: 'Standard Studio', price: '45k', duration: '5 Mnt', prints: '2 Lembar Foto', popular: true },
                      { name: 'VIP Group', price: '70k', duration: '10 Mnt', prints: '4 Lembar Foto' },
                    ].map((pkg, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-xl backdrop-blur-md border text-center flex flex-col justify-between ${
                          pkg.popular
                            ? 'bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/30'
                            : 'bg-white/[0.06] border-white/15'
                        }`}
                      >
                        <div>
                          {pkg.popular && (
                            <span
                              style={{ backgroundColor: form.primaryColor }}
                              className="text-[8px] font-black text-slate-950 px-1 py-0.2 rounded-full block mb-1 uppercase tracking-tight"
                            >
                              Populer
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-white block truncate">
                            {pkg.name}
                          </span>
                          <span className="text-[8px] text-amber-300 block font-medium mt-0.5">{pkg.duration}</span>
                          <span className="text-[8px] text-slate-300 block">{pkg.prints}</span>
                        </div>
                        <span
                          style={{ color: pkg.popular ? form.primaryColor : '#fff' }}
                          className="text-[11px] font-black font-mono mt-1"
                        >
                          Rp {pkg.price}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-slate-400 z-10 pt-1 border-t border-white/10">
                    <span>Semua foto beresolusi studio HD</span>
                    <span
                      style={{ backgroundColor: form.primaryColor }}
                      className="px-2 py-0.5 rounded text-slate-950 font-bold text-[9px]"
                    >
                      Lanjut
                    </span>
                  </div>
                </>
              )}

              {/* Maintenance Overlay if active */}
              {form.maintenanceMode && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-4">
                  <AlertTriangle className="w-7 h-7 text-amber-400 mb-1" />
                  <p className="text-xs font-bold text-white">SEDANG DALAM PEMELIHARAAN</p>
                  <p className="text-[9px] text-slate-300 mt-0.5">Booth sementara tidak menerima sesi baru.</p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Rendering Aktif</span>
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Pratinjau di atas merender gambar background dengan intensitas blur <strong className="text-amber-400">{form.backgroundBlur}px</strong> dan peredupan <strong className="text-sky-400">{form.backgroundOverlayOpacity}%</strong> secara langsung. Klik tombol <strong>Simpan Perubahan</strong> untuk menerapkannya ke kiosk.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showResetConfirm}
        title="Reset Tema ke Standar?"
        message="Seluruh logo, background wallpaper, efek live blur, dan warna akan dikembalikan ke konfigurasi awal MinjaPhotobooth."
        confirmLabel="Ya, Reset Tema"
        cancelLabel="Batal"
        variant="warning"
        onConfirm={handleResetToDefault}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
