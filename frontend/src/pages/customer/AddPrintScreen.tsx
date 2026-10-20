import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Plus,
  Minus,
  Printer,
  ArrowRight,
  Check,
  CheckCircle2,
  QrCode,
  Zap,
  ZoomIn,
  Sparkles,
  Camera,
  Layers,
  RefreshCw,
  Trash2,
  ShieldCheck,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { PackageItem } from '../../types/package';
import { CreatePaymentResponse } from '../../types/payment';
import { EditedFrameItem, SelectedPrintItem } from '../../contexts/SessionContext';
import { photoboothApi } from '../../services/photoboothApi';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { QRISDisplay } from '../../components/customer/QRISDisplay';
import { useToast } from '../../components/common/Toast';
import { playButtonSound } from '../../services/soundEffects';

export interface AddPrintScreenProps {
  pkg: PackageItem;
  additionalPrints?: number;
  onUpdateAdditionalPrints?: (count: number) => void;
  onProceed: (selectedItems: SelectedPrintItem[]) => void;
  sessionId?: string;
  editedFrames?: EditedFrameItem[];
  capturedPhotos?: string[];
}

interface PrintableItem {
  id: string;
  type: 'frame' | 'raw';
  title: string;
  subtitle: string;
  url: string;
}

export const AddPrintScreen: React.FC<AddPrintScreenProps> = ({
  pkg,
  onUpdateAdditionalPrints,
  onProceed,
  sessionId,
  editedFrames = [],
  capturedPhotos = [],
}) => {
  const { showToast } = useToast();

  // Combine edited frames and raw captured photos into unified printable items
  const allPrintableItems: PrintableItem[] = useMemo(() => {
    const list: PrintableItem[] = [];

    // 1. Add all edited frame designs
    editedFrames.forEach((frame, idx) => {
      if (frame.layoutUrl) {
        list.push({
          id: frame.id || `frame-${idx + 1}`,
          type: 'frame',
          title: frame.title || `Desain Frame #${idx + 1}`,
          subtitle: frame.templateName || 'Layout Siap Cetak',
          url: frame.layoutUrl,
        });
      }
    });

    // 2. Add all raw camera photos
    capturedPhotos.forEach((photoUrl, idx) => {
      if (photoUrl) {
        list.push({
          id: `raw-${idx + 1}`,
          type: 'raw',
          title: `Foto Kamera #${idx + 1}`,
          subtitle: 'Foto Asli Resolusi Penuh',
          url: photoUrl,
        });
      }
    });

    return list;
  }, [editedFrames, capturedPhotos]);

  // Active filter tab: 'all' | 'frame' | 'raw'
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'frame' | 'raw'>('all');

  // Package Quota
  const packageQuota = pkg.printCopies || 1;

  // Per-item copies map: itemId -> count
  const [itemCopies, setItemCopies] = useState<Record<string, number>>(() => {
    const initialMap: Record<string, number> = {};
    let assigned = 0;

    // Smart pre-fill: prefer edited frames first up to package quota
    for (const frame of editedFrames) {
      if (assigned < packageQuota && frame.layoutUrl) {
        initialMap[frame.id] = 1;
        assigned++;
      }
    }
    // If quota remains, fill with first captured photos
    if (assigned < packageQuota) {
      for (let i = 0; i < capturedPhotos.length && assigned < packageQuota; i++) {
        const rawId = `raw-${i + 1}`;
        if (!initialMap[rawId]) {
          initialMap[rawId] = 1;
          assigned++;
        }
      }
    }

    return initialMap;
  });

  // Zoom modal preview
  const [zoomItem, setZoomItem] = useState<PrintableItem | null>(null);

  // Calculations
  const totalSelectedCopies = useMemo(() => {
    return Object.values(itemCopies).reduce((sum, count) => sum + (count || 0), 0);
  }, [itemCopies]);

  const extraCopies = Math.max(0, totalSelectedCopies - packageQuota);
  const unitPrice = pkg.additionalPrintPrice ?? 15000;
  const extraCost = extraCopies * unitPrice;

  // Sync additionalPrints to parent
  useEffect(() => {
    if (onUpdateAdditionalPrints) {
      onUpdateAdditionalPrints(extraCopies);
    }
  }, [extraCopies, onUpdateAdditionalPrints]);

  // Selection actions
  const handleToggleOrIncrement = (itemId: string) => {
    playButtonSound('counter');
    setItemCopies((prev) => {
      const current = prev[itemId] || 0;
      return {
        ...prev,
        [itemId]: current + 1,
      };
    });
  };

  const handleDecrement = (itemId: string) => {
    const current = itemCopies[itemId] || 0;
    if (current > 0) {
      playButtonSound('counter');
      setItemCopies((prev) => {
        const next = { ...prev };
        if (current === 1) {
          delete next[itemId];
        } else {
          next[itemId] = current - 1;
        }
        return next;
      });
    }
  };

  const handleRemoveItem = (itemId: string) => {
    playButtonSound('delete');
    setItemCopies((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleResetToQuota = () => {
    playButtonSound('secondary');
    const newMap: Record<string, number> = {};
    let assigned = 0;

    for (const item of allPrintableItems) {
      if (assigned < packageQuota) {
        newMap[item.id] = 1;
        assigned++;
      }
    }

    setItemCopies(newMap);
    showToast({
      type: 'info',
      title: 'Pilihan Direset',
      message: `Pilihan dikembalikan sesuai kuota cetak ${packageQuota} lembar paket.`,
    });
  };

  const handleClearAll = () => {
    playButtonSound('delete');
    setItemCopies({});
    showToast({
      type: 'info',
      title: 'Baki Cetak Dikosongkan',
      message: 'Silakan sentuh foto di sebelah kiri yang ingin Anda cetak.',
    });
  };

  // Compile selected items list
  const selectedPrintItemsList = useMemo(() => {
    const list: (PrintableItem & { copies: number })[] = [];
    allPrintableItems.forEach((item) => {
      const count = itemCopies[item.id] || 0;
      if (count > 0) {
        list.push({ ...item, copies: count });
      }
    });
    return list;
  }, [allPrintableItems, itemCopies]);

  const getCompiledSelectedItems = (): SelectedPrintItem[] => {
    return selectedPrintItemsList.map((item) => ({
      id: item.id,
      url: item.url,
      type: item.type,
      title: item.title,
      copies: item.copies,
    }));
  };

  // Filtered gallery items
  const displayedItems = useMemo(() => {
    if (activeFilterTab === 'frame') {
      return allPrintableItems.filter((it) => it.type === 'frame');
    }
    if (activeFilterTab === 'raw') {
      return allPrintableItems.filter((it) => it.type === 'raw');
    }
    return allPrintableItems;
  }, [allPrintableItems, activeFilterTab]);

  // Payment Modal States for Extra Prints
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [extraPayment, setExtraPayment] = useState<CreatePaymentResponse | null>(null);
  const [isSettled, setIsSettled] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isBypassing, setIsBypassing] = useState(false);

  // Trigger proceed or launch payment
  const handleProceedClick = async () => {
    const selected = getCompiledSelectedItems();
    if (selected.length === 0 || totalSelectedCopies === 0) {
      showToast({
        type: 'warning',
        title: 'Belum Ada Foto Dipilih',
        message: 'Silakan sentuh minimal 1 foto atau frame untuk dicetak fisik.',
      });
      return;
    }

    // If within package quota, no extra fee required!
    if (extraCopies <= 0) {
      playButtonSound('success');
      onProceed(selected);
      return;
    }

    // Extra copies > 0: Initiate QRIS payment
    if (!sessionId) {
      showToast({
        type: 'error',
        title: 'Sesi Tidak Ditemukan',
        message: 'Melanjutkan proses cetak dalam mode darurat...',
      });
      onProceed(selected);
      return;
    }

    try {
      setIsCreatingPayment(true);
      const res = await photoboothApi.createExtraPrintsPayment(sessionId, extraCopies, 'qris');
      if (res.success) {
        setExtraPayment(res.data);
        setIsSettled(false);
        setIsPaymentModalOpen(true);
      } else {
        showToast({
          type: 'error',
          title: 'Gagal Membuat QRIS',
          message: res.error.message || 'Tidak dapat membuat tagihan QRIS tambahan saat ini.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Koneksi Terputus',
        message: err?.message || 'Gagal menghubungi server pembayaran.',
      });
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Poll payment status for extra print payment
  useEffect(() => {
    if (!isPaymentModalOpen || !extraPayment) return;

    let isActive = true;

    const poll = async () => {
      try {
        const res = await photoboothApi.checkPaymentStatus(extraPayment.orderId);
        if (res.success && isActive) {
          if (res.data.transactionStatus === 'settlement' && res.data.isVerified) {
            setIsSettled(true);
            if (pollingRef.current) clearInterval(pollingRef.current);

            showToast({
              type: 'success',
              title: 'Pembayaran Tambahan Berhasil!',
              message: `Tambahan ${extraCopies} lembar cetak foto lunas terverifikasi. Memulai proses cetak...`,
            });

            setTimeout(() => {
              if (isActive) {
                setIsPaymentModalOpen(false);
                onProceed(getCompiledSelectedItems());
              }
            }, 1500);
          }
        }
      } catch (err) {
        console.warn('Gagal polling pembayaran ekstra:', err);
      }
    };

    pollingRef.current = setInterval(poll, 3000);

    return () => {
      isActive = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isPaymentModalOpen, extraPayment, extraCopies, onProceed, showToast]);

  const handleBypassExtraPayment = async () => {
    if (!extraPayment || isBypassing || isSettled) return;
    setIsBypassing(true);
    playButtonSound('success');

    showToast({
      type: 'info',
      title: '⚡ Mode Test: Bypass Ekstra Cetak',
      message: 'Sedang melunaskan pembayaran cetak tambahan...',
    });

    try {
      await photoboothApi.forcePaymentSettlement(extraPayment.orderId);
    } catch (e) {
      console.warn('Fallback bypass extra payment:', e);
    } finally {
      setIsSettled(true);
      if (pollingRef.current) clearInterval(pollingRef.current);

      showToast({
        type: 'success',
        title: '⚡ Pembayaran Ekstra Berhasil!',
        message: 'Status lunas (Mode Test). Memulai proses cetak...',
      });

      setTimeout(() => {
        setIsPaymentModalOpen(false);
        onProceed(getCompiledSelectedItems());
      }, 700);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col justify-between p-5 xl:p-6 2xl:p-7 select-none bg-background overflow-hidden">
      {/* Top Main Navigation Bar */}
      <div className="flex items-center justify-between pb-3.5 px-1 border-b border-white/10 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Printer className="w-6 h-6 text-amber-400" />
            <span>Pilih Foto & Lembar Cetak</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sentuh foto mana saja yang ingin dicetak fisik. Anda bebas memilih foto frame editan atau foto kamera asli.
          </p>
        </div>

        {/* Quick Helper Badge */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl glass-panel-elevated border border-white/15 flex items-center gap-2.5 text-sm shadow-md">
            <span className="text-slate-300 font-medium">Paket:</span>
            <span className="font-black text-white">{pkg.name}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mx-1" />
            <span className="font-black text-amber-400 font-mono">
              Kuota Cetak: {packageQuota} Lembar (Termasuk Paket)
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetToQuota}
            className="px-3.5 py-2 rounded-xl glass-panel text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 active:scale-95 transition-all shadow-sm"
            title="Kembalikan pilihan sesuai kuota cetak paket"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset ke Kuota Paket</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body: 2-Column High-Impact Master-Detail Layout */}
      <div className="flex-1 flex gap-4 xl:gap-5 my-2.5 min-h-0 items-stretch px-1">
        {/* LEFT COLUMN: Gallery Selector Area (65% width) */}
        <div className="flex-[3] flex flex-col h-full glass-panel-elevated rounded-3xl p-5 border border-white/10 min-w-0 overflow-hidden shadow-2xl">
          {/* Gallery Header & Filter Tabs */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFilterTab('all')}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 active:scale-95 ${
                  activeFilterTab === 'all'
                    ? 'bg-amber-400 text-slate-950 shadow-glow-primary ring-2 ring-white scale-102'
                    : 'glass-panel text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Semua Foto ({allPrintableItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterTab('frame')}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 active:scale-95 ${
                  activeFilterTab === 'frame'
                    ? 'bg-amber-400 text-slate-950 shadow-glow-primary ring-2 ring-white scale-102'
                    : 'glass-panel text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Desain Frame Editan ({editedFrames.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterTab('raw')}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 active:scale-95 ${
                  activeFilterTab === 'raw'
                    ? 'bg-amber-400 text-slate-950 shadow-glow-primary ring-2 ring-white scale-102'
                    : 'glass-panel text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Foto Asli Kamera ({capturedPhotos.length})</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
              <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>Sentuh foto untuk menambah ke baki cetak</span>
            </div>
          </div>

          {/* Photo Cards Grid */}
          <div className="flex-1 overflow-y-auto pt-3 px-1.5 min-h-0">
            {displayedItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400">
                <Printer className="w-12 h-12 text-slate-500 opacity-60" />
                <p className="text-sm font-bold text-slate-300">Tidak ada foto di kategori ini.</p>
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('all')}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Tampilkan Semua Foto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {displayedItems.map((item) => {
                  const copies = itemCopies[item.id] || 0;
                  const isSelected = copies > 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleOrIncrement(item.id)}
                      className={`group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 select-none ${
                        isSelected
                          ? 'border-2 border-amber-400 bg-amber-950/20 shadow-glow-primary scale-101'
                          : 'glass-panel border border-white/10 hover:border-amber-400/50 hover:bg-white/5'
                      }`}
                    >
                      {/* Photo Thumbnail 2:3 vertical aspect ratio */}
                      <div className="relative aspect-[2/3] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-103"
                          loading="lazy"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                          {item.type === 'frame' ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Frame</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-sky-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                              <Camera className="w-2.5 h-2.5" />
                              <span>Kamera</span>
                            </span>
                          )}
                        </div>

                        {/* Top Right: Lightbox Zoom Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomItem(item);
                          }}
                          className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-black text-white text-xs border border-white/20 active:scale-90 transition-all shadow-md"
                          title="Lihat Gambar Penuh"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>

                        {/* Selected Count Indicator Badge */}
                        {isSelected && (
                          <div className="absolute top-2.5 right-11 z-10 px-3 py-1 rounded-lg bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg ring-2 ring-white/60 animate-in fade-in">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>{copies}x Dipilih</span>
                          </div>
                        )}

                        {/* Bottom Gradient Overlay & Title */}
                        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none">
                          <p className="text-xs font-black text-white truncate drop-shadow-md">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-300 truncate drop-shadow-sm">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Card Stepper Footer */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-slate-900/90 border-t border-white/10 flex items-center justify-between gap-1.5"
                      >
                        {isSelected ? (
                          <div className="w-full flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleDecrement(item.id)}
                              className="w-10 h-10 rounded-xl glass-panel text-white hover:text-rose-400 hover:border-rose-400/50 flex items-center justify-center active:scale-90 transition-all border border-white/15 cursor-pointer shadow-sm"
                              title="Kurangi 1 lembar"
                            >
                              <Minus className="w-4.5 h-4.5 stroke-[2.5]" />
                            </button>

                            <div className="text-center px-2">
                              <span className="text-xl font-black text-amber-400 font-mono leading-none">
                                {copies}
                              </span>
                              <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                                Lembar
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleOrIncrement(item.id)}
                              className="w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center active:scale-90 transition-all shadow-md font-bold cursor-pointer"
                              title="Tambah 1 lembar"
                            >
                              <Plus className="w-4.5 h-4.5 stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleOrIncrement(item.id)}
                            className="w-full py-2 px-3 rounded-xl glass-panel text-slate-200 hover:text-white hover:border-amber-400/60 hover:bg-amber-400/10 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-white/15 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-400" />
                            <span>Pilih Cetak</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Dedicated Print Tray & Quota Slip (35% width) */}
        <div className="flex-[2] flex flex-col h-full glass-panel-elevated rounded-3xl p-5 xl:p-5.5 border border-white/10 flex-shrink-0 min-w-0 overflow-hidden shadow-2xl justify-between">
          {/* Tray Header */}
          <div className="pb-3 border-b border-white/10 flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wide">
                  Baki Cetak Foto Fisik
                </h3>
                <span className="text-[10px] text-slate-400">
                  {selectedPrintItemsList.length} Foto Berbeda Dipilih
                </span>
              </div>
            </div>

            {selectedPrintItemsList.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                title="Kosongkan baki cetak"
              >
                <Trash2 className="w-3 h-3" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>

          {/* Visual Quota & Budget Meter */}
          <div className="my-3 p-4 rounded-2xl glass-panel border border-white/15 space-y-3 flex-shrink-0 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Kuota Cetak Paket:</span>
              </span>
              <span className="font-black text-amber-400 font-mono text-base">
                {packageQuota} Lembar (Termasuk Paket)
              </span>
            </div>

            {/* Visual Progress Bar (Increased to h-4) */}
            <div className="w-full bg-slate-900/90 rounded-full h-4 p-0.5 border border-white/15 overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  totalSelectedCopies > packageQuota
                    ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                }`}
                style={{
                  width: `${Math.min(100, (totalSelectedCopies / packageQuota) * 100)}%`,
                }}
              />
            </div>

            {/* Status explanation */}
            <div className="text-xs leading-normal">
              {totalSelectedCopies === 0 ? (
                <span className="text-amber-400/90 font-medium">
                  Silakan pilih minimal 1 foto untuk dicetak.
                </span>
              ) : totalSelectedCopies < packageQuota ? (
                <span className="text-emerald-400 font-semibold">
                  Sisa kuota cetak paket Anda: <strong>{packageQuota - totalSelectedCopies} lembar lagi</strong>.
                </span>
              ) : totalSelectedCopies === packageQuota ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Kuota cetak paket terpenuhi ({packageQuota} Lembar sudah dipilih).</span>
                </span>
              ) : (
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>+{extraCopies} lembar cetak ekstra (+Rp {extraCost.toLocaleString('id-ID')}).</span>
                </span>
              )}
            </div>
          </div>

          {/* Scrollable Mini List of Queued Photos */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0 py-1">
            {selectedPrintItemsList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                <Printer className="w-8 h-8 opacity-40" />
                <p className="text-xs font-semibold">Baki cetak masih kosong.</p>
                <p className="text-[10px] text-slate-500">
                  Sentuh foto di galeri sebelah kiri untuk menambahkan.
                </p>
              </div>
            ) : (
              selectedPrintItemsList.map((item, idx) => {
                const isExtraItem = idx >= packageQuota;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-xl glass-panel border transition-all ${
                      isExtraItem ? 'border-amber-400/40 bg-amber-950/10' : 'border-white/10'
                    }`}
                  >
                    {/* Thumbnail & Title */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-14 rounded-lg bg-black overflow-hidden flex-shrink-0 border border-white/20">
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-black text-white truncate">
                            {item.title}
                          </p>
                          {item.type === 'frame' ? (
                            <span className="text-[8px] font-black uppercase px-1 rounded bg-amber-400 text-slate-950">
                              Frame
                            </span>
                          ) : (
                            <span className="text-[8px] font-black uppercase px-1 rounded bg-sky-400 text-slate-950">
                              Kamera
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                        <span className="text-[9px] font-bold text-amber-400">
                          {item.copies} Lembar
                        </span>
                      </div>
                    </div>

                    {/* Stepper & Delete */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDecrement(item.id)}
                        className="w-7 h-7 rounded-lg glass-panel text-white hover:text-rose-400 flex items-center justify-center border border-white/15 active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="font-mono font-black text-xs text-white w-4 text-center">
                        {item.copies}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleOrIncrement(item.id)}
                        className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-bold flex items-center justify-center active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 active:scale-90 ml-1"
                        title="Hapus foto dari baki"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pricing Breakdown & Action Button (Sticky Footer in Sidebar) */}
          <div className="pt-3 border-t border-white/10 space-y-3 flex-shrink-0 mt-2">
            {/* Breakdown summary rows */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-xs">Total Lembar Dicetak:</span>
                <span className="font-mono font-black text-white text-base">
                  {totalSelectedCopies} Lembar
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="text-xs">Kuota Cetak Paket:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {Math.min(totalSelectedCopies, packageQuota)} Lembar (Termasuk Paket)
                </span>
              </div>

              {extraCopies > 0 && (
                <div className="flex items-center justify-between text-amber-300 font-semibold">
                  <span className="text-xs">Lembar Tambahan (Ekstra):</span>
                  <span className="font-mono font-bold text-sm">
                    +{extraCopies} Lembar (Rp {extraCost.toLocaleString('id-ID')})
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-sm font-black">
                <span className="text-white">Tagihan Ekstra:</span>
                <span className="font-mono text-amber-400 text-base">
                  {extraCost > 0 ? `Rp ${extraCost.toLocaleString('id-ID')}` : 'Rp 0 (Termasuk Paket)'}
                </span>
              </div>
            </div>

            {/* Action Button */}
            {extraCopies > 0 ? (
              <Button
                variant="gold"
                size="lg"
                onClick={handleProceedClick}
                isLoading={isCreatingPayment}
                disabled={isCreatingPayment || totalSelectedCopies === 0}
                leftIcon={<QrCode className="w-5 h-5 stroke-[2.5]" />}
                rightIcon={<ArrowRight className="w-5 h-5 stroke-[2.5]" />}
                className="w-full py-4 text-sm font-black shadow-glow-primary"
              >
                Bayar Extra Print (Rp {extraCost.toLocaleString('id-ID')}) & Cetak
              </Button>
            ) : (
              <Button
                variant="gold"
                size="lg"
                onClick={handleProceedClick}
                disabled={totalSelectedCopies === 0}
                rightIcon={<Check className="w-5 h-5 stroke-[2.5]" />}
                className="w-full py-4 text-sm font-black shadow-glow-primary"
              >
                Cetak Sekarang ({totalSelectedCopies} Lembar)
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pop-up Modal Pembayaran QRIS Midtrans untuk Lembar Cetak Ekstra */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        maxWidth="lg"
        showCloseButton={!isSettled}
        title={
          <div className="flex items-center gap-2">
            <QrCode className="w-6 h-6 text-amber-400" />
            <span>Pembayaran Tambahan Lembar Cetak</span>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center p-2 space-y-4">
          {isSettled ? (
            <div className="py-12 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border-2 border-emerald-400 shadow-glow-primary">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-white">
                Pembayaran Tambahan Berhasil!
              </h3>
              <p className="text-slate-300 text-sm max-w-md">
                Transaksi QRIS sebesar <strong>Rp {(extraPayment?.grossAmount ?? extraCost).toLocaleString('id-ID')}</strong> telah terverifikasi lunas. Memulai proses cetak total <strong>{totalSelectedCopies} lembar</strong> foto fisik...
              </p>
            </div>
          ) : (
            <>
              <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-3 w-full text-left flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Rincian Cetak:</span>
                  <span className="text-white font-bold text-sm">
                    {packageQuota} Kuota Bawaan + {extraCopies} Lembar Ekstra
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-semibold">Total Tagihan Tambahan:</span>
                  <span className="text-amber-400 font-extrabold text-lg font-mono">
                    Rp {(extraPayment?.grossAmount ?? extraCost).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {extraPayment && (
                <QRISDisplay
                  payment={extraPayment}
                  onBypass={handleBypassExtraPayment}
                  onExpire={() => {
                    setIsPaymentModalOpen(false);
                    showToast({
                      type: 'error',
                      title: 'Waktu Pembayaran Habis',
                      message: 'Sesi QRIS tambahan kedaluwarsa. Silakan coba lagi.',
                    });
                  }}
                />
              )}

              <div className="w-full pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl glass-panel text-slate-300 hover:text-white text-xs font-bold active:scale-95 border border-white/10 transition-all cursor-pointer"
                >
                  Batal / Kembali
                </button>

                <button
                  type="button"
                  onClick={handleBypassExtraPayment}
                  disabled={isBypassing || isSettled}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold active:scale-95 border border-amber-500/40 transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>⚡ Skip Bayar (Test Mode)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Fullscreen Photo Zoom Preview Modal */}
      {zoomItem && (
        <Modal
          isOpen={Boolean(zoomItem)}
          onClose={() => setZoomItem(null)}
          maxWidth="md"
          title={
            <div className="flex items-center gap-2">
              <ZoomIn className="w-5 h-5 text-amber-400" />
              <span>{zoomItem.title}</span>
            </div>
          }
        >
          <div className="p-2 flex flex-col items-center space-y-4">
            <div className="max-h-[65vh] w-full flex items-center justify-center bg-black/60 rounded-2xl p-2 border border-white/10">
              <img
                src={zoomItem.url}
                alt={zoomItem.title}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>
            <div className="w-full flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm font-bold text-white">{zoomItem.title}</p>
                <p className="text-xs text-slate-400">{zoomItem.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setZoomItem(null)}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
