import React, { useEffect, useState, useMemo } from 'react';
import {
  Printer,
  QrCode,
  MessageCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  Check,
  ZoomIn,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { photoboothApi } from '../../services/photoboothApi';
import { printerAdapter } from '../../adapters/printerAdapter';
import { Button } from '../../components/common/Button';
import { VirtualNumpad } from '../../components/common/VirtualNumpad';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  generateGifFromPhotos,
  downloadFile,
  GeneratedGifResult,
} from '../../services/gifService';
import {
  generateLivePhotoVideo,
  LivePhotoResult,
} from '../../services/livePhotoService';
import { playButtonSound } from '../../services/soundEffects';
import { SelectedPrintItem } from '../../contexts/SessionContext';

export interface DeliveryScreenProps {
  sessionId: string;
  copies: number;
  capturedPhotos?: string[];
  finalLayoutUrl?: string | null;
  selectedPrintItems?: SelectedPrintItem[];
  onFinishAndReset: () => void;
}

export const DeliveryScreen: React.FC<DeliveryScreenProps> = ({
  sessionId,
  copies,
  capturedPhotos = [],
  finalLayoutUrl = null,
  selectedPrintItems = [],
  onFinishAndReset,
}) => {
  const { showToast } = useToast();

  const [galleryData, setGalleryData] = useState<{
    qrString: string;
    galleryUrl: string;
    expiresAt: string;
  } | null>(null);

  // Printing State
  const [printStatus, setPrintStatus] = useState<'queued' | 'printing' | 'completed' | 'failed'>('printing');
  const [printProgress, setPrintProgress] = useState<number>(30);

  // High-Quality GIF Generation State
  const [isGeneratingGif, setIsGeneratingGif] = useState<boolean>(true);
  const [gifResult, setGifResult] = useState<GeneratedGifResult | null>(null);

  // Live Photo (Motion Video) State
  const [isGeneratingLive, setIsGeneratingLive] = useState<boolean>(true);
  const [liveResult, setLiveResult] = useState<LivePhotoResult | null>(null);
  const [isLiveStripActive, setIsLiveStripActive] = useState<boolean>(false);
  const [liveFrameIndex, setLiveFrameIndex] = useState<number>(0);

  // Modal zoom on image
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);
  const [zoomTitle, setZoomTitle] = useState<string>('Pratinjau Foto');
  const [zoomType, setZoomType] = useState<'image' | 'gif' | 'live'>('image');

  // WhatsApp Modal State
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [isWaSent, setIsWaSent] = useState(false);

  // Auto Reset Countdown: 1 Menit (60 Detik)
  const [autoResetSeconds, setAutoResetSeconds] = useState(60);

  // 1. Generate clean HD GIF in background without watermark/stamps
  useEffect(() => {
    let isMounted = true;

    const createGif = async () => {
      if (!capturedPhotos || capturedPhotos.length === 0) {
        if (isMounted) setIsGeneratingGif(false);
        return;
      }

      try {
        setIsGeneratingGif(true);
        const result = await generateGifFromPhotos(capturedPhotos, {
          maxDimension: 720,
          delayMs: 500,
        });

        if (isMounted) {
          setGifResult(result);
          setIsGeneratingGif(false);
          if (photoboothApi.uploadGalleryFile && result.dataUrl) {
            photoboothApi.uploadGalleryFile(sessionId, 'animated_gif', result.dataUrl, 'animation.gif').catch(() => {});
          }
        }
      } catch (err) {
        console.error('[DeliveryScreen] Gagal generate GIF:', err);
        if (isMounted) setIsGeneratingGif(false);
      }
    };

    createGif();

    return () => {
      isMounted = false;
    };
  }, [capturedPhotos]);

  // 1b. Generate Live Photo (Motion Video) in background with smooth cinematic crossfade
  useEffect(() => {
    let isMounted = true;

    const createLive = async () => {
      if (!capturedPhotos || capturedPhotos.length === 0) {
        if (isMounted) setIsGeneratingLive(false);
        return;
      }

      try {
        setIsGeneratingLive(true);
        const result = await generateLivePhotoVideo(capturedPhotos, {
          maxDimension: 720,
          fps: 30,
          frameHoldMs: 650,
          transitionMs: 200,
        });

        if (isMounted) {
          setLiveResult(result);
          setIsGeneratingLive(false);
        }
      } catch (err) {
        console.warn('[DeliveryScreen] Gagal generate Live Photo video:', err);
        if (isMounted) setIsGeneratingLive(false);
      }
    };

    createLive();

    return () => {
      isMounted = false;
    };
  }, [capturedPhotos]);

  // Client-side real-time live photo loop for instant real-time live preview
  useEffect(() => {
    if (!capturedPhotos || capturedPhotos.length <= 1) return;
    const interval = setInterval(() => {
      setLiveFrameIndex((prev) => (prev + 1) % capturedPhotos.length);
    }, 600);

    return () => clearInterval(interval);
  }, [capturedPhotos]);

  // 2. Load private gallery URL and initiate printer job
  const totalPhysicalPrints = useMemo(() => {
    if (selectedPrintItems && selectedPrintItems.length > 0) {
      return selectedPrintItems.reduce((acc, it) => acc + (it.copies || 0), 0);
    }
    return copies;
  }, [selectedPrintItems, copies]);

  // 2. Load private gallery URL and initiate printer jobs for all selected items
  useEffect(() => {
    let isMounted = true;

    const initDelivery = async () => {
      const galRes = await photoboothApi.getGalleryUrl(sessionId);
      if (galRes.success && isMounted) {
        setGalleryData(galRes.data);
      }

      if (selectedPrintItems && selectedPrintItems.length > 0) {
        for (const item of selectedPrintItems) {
          if (item.copies > 0 && item.url) {
            await printerAdapter.submitJob({
              sessionId,
              copies: item.copies,
              layoutImageUrl: item.url,
            });
            if (photoboothApi.uploadGalleryFile) {
              photoboothApi.uploadGalleryFile(sessionId, item.type === 'frame' ? 'print_strip' : 'single_photo', item.url, `${item.id}.jpg`).catch(() => {});
            }
          }
        }
      } else {
        // Background upload final print layout to gallery
        if (photoboothApi.uploadGalleryFile && finalLayoutUrl) {
          photoboothApi.uploadGalleryFile(sessionId, 'print_strip', finalLayoutUrl, 'print-strip.jpg').catch(() => {});
        }

        await printerAdapter.submitJob({
          sessionId,
          copies,
          layoutImageUrl: finalLayoutUrl || '',
        });
      }

      // Simulate realistic printing stages
      setTimeout(() => {
        if (isMounted) setPrintProgress(70);
      }, 3000);

      setTimeout(() => {
        if (isMounted) {
          setPrintProgress(100);
          setPrintStatus('completed');
          playButtonSound('success');
          showToast({
            type: 'success',
            title: 'Foto Selesai Dicetak!',
            message: `Silakan ambil ${totalPhysicalPrints} lembar foto fisik di baki printer.`,
          });
        }
      }, 7000);
    };

    initDelivery();

    return () => {
      isMounted = false;
    };
  }, [sessionId, copies, finalLayoutUrl, selectedPrintItems, totalPhysicalPrints, showToast]);

  // 3. Countdown timer 1 menit
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoResetSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onFinishAndReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onFinishAndReset]);

  // Handle WhatsApp submission
  const handleSendWhatsApp = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      showToast({
        type: 'error',
        title: 'Nomor Tidak Valid',
        message: 'Masukkan nomor WhatsApp aktif dengan minimal 9 digit.',
      });
      return;
    }

    setIsSendingWa(true);
    try {
      const res = await photoboothApi.sendWhatsApp(sessionId, phoneNumber);
      if (res.success) {
        setIsWaSent(true);
        setIsWaModalOpen(false);
        playButtonSound('success');
        showToast({
          type: 'success',
          title: 'Soft File Terkirim!',
          message: `Tautan galeri telah dikirim ke nomor WhatsApp ${phoneNumber}.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Pengiriman Gagal',
          message: res.error.message,
        });
      }
    } finally {
      setIsSendingWa(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-screen h-screen flex flex-col justify-between p-8 md:p-10 select-none bg-background overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Terima Kasih! Sesi Anda Telah Selesai
            </h2>
            <p className="text-xs text-slate-400">
              Silakan ambil hasil cetakan di baki printer dan scan QR untuk soft file digital
            </p>
          </div>
        </div>

        {/* 1-Minute Auto Reset Capsule & Finish Button */}
        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2 rounded-2xl flex items-center gap-2 text-xs text-slate-300">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Sisa Waktu:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              {formatTimer(autoResetSeconds)}
            </span>
          </div>

          <Button
            variant="gold"
            size="md"
            onClick={onFinishAndReset}
            className="shadow-glow-primary"
          >
            Selesai Sesi
          </Button>
        </div>
      </div>

      {/* Main 2-Column Minimalist Display (Centered & Balanced) */}
      <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto w-full my-auto items-stretch">
        {/* ========================================================= */}
        {/* LEFT COLUMN: ANIMASI PROSES PRINT & HASIL (FOTO & GIF)    */}
        {/* ========================================================= */}
        <div className="glass-panel-elevated rounded-3xl p-6 flex flex-col justify-between text-center border-amber-500/20 shadow-2xl">
          <div>
            {/* Animated Printer Icon */}
            <div className="relative w-18 h-18 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/30">
              {printStatus === 'completed' ? (
                <CheckCircle2 className="w-9 h-9 text-emerald-400 stroke-[2.2]" />
              ) : (
                <Printer className="w-9 h-9 stroke-[2.2] animate-pulse" />
              )}
            </div>

            <h3 className="text-xl font-extrabold text-white mb-0.5">
              Cetak Foto Fisik
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Sedang memproses <strong>{copies} lembar</strong> cetak foto lab
            </p>

            {/* Printing Progress Bar */}
            <div className="bg-slate-900/80 rounded-2xl p-3 border border-white/10 mb-3 text-left">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold flex items-center gap-2">
                  {printStatus === 'completed' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                  <span>
                    {printStatus === 'completed'
                      ? 'Pencetakan Selesai'
                      : 'Mencetak Foto Lab...'}
                  </span>
                </span>
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {printProgress}%
                </span>
              </div>

              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700 rounded-full"
                  style={{ width: `${printProgress}%` }}
                />
              </div>
            </div>

            {/* Compact Results Showcase: Cetak Foto, (◎) Live Photo, Animasi GIF, & Foto Asli */}
            <div className="bg-slate-900/60 rounded-2xl p-3 border border-white/10 text-center">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 px-1">
                <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">
                  Hasil Cetak & Format Digital:
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Fitur Live Aktif</span>
                </span>
              </div>

              <div className="flex items-center justify-center gap-3">
                {/* 1. Print Card (with Interactive LIVE toggle) */}
                {finalLayoutUrl && (
                  <div
                    onClick={() => {
                      setZoomPhotoUrl(
                        isLiveStripActive
                          ? (liveResult?.videoUrl || capturedPhotos[liveFrameIndex] || finalLayoutUrl)
                          : finalLayoutUrl
                      );
                      setZoomType(isLiveStripActive ? 'live' : 'image');
                      setZoomTitle(isLiveStripActive ? 'Foto (Mode Live Motion)' : 'Hasil Cetak Fisik');
                    }}
                    className="relative group cursor-pointer flex flex-col items-center"
                  >
                    <div className="w-22 h-32 rounded-xl bg-white p-1 shadow-md border border-white/80 overflow-hidden group-hover:scale-105 transition-transform relative">
                      <img
                        src={
                          isLiveStripActive
                            ? (capturedPhotos[liveFrameIndex] || finalLayoutUrl)
                            : finalLayoutUrl
                        }
                        alt="Hasil Cetak"
                        className="w-full h-full object-cover rounded-lg transition-all duration-300"
                      />

                      {/* Interactive LIVE toggle switch right on card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playButtonSound('secondary');
                          setIsLiveStripActive(!isLiveStripActive);
                        }}
                        title="Klik untuk beralih mode Live Photo"
                        className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[7.5px] font-black tracking-wider flex items-center gap-1 transition-all shadow-md cursor-pointer ${
                          isLiveStripActive
                            ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                            : 'bg-black/80 text-amber-300 hover:bg-black'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isLiveStripActive ? 'bg-slate-950 animate-ping' : 'bg-amber-400'
                          }`}
                        />
                        <span>LIVE</span>
                      </button>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 mt-1 flex items-center gap-1">
                      <span>Cetak Foto</span>
                      <ZoomIn className="w-2.5 h-2.5 opacity-70" />
                    </span>
                  </div>
                )}

                {/* 2. Dedicated Live Photo / Motion Clip Card */}
                <div
                  onClick={() => {
                    setZoomPhotoUrl(liveResult?.videoUrl || capturedPhotos[liveFrameIndex] || finalLayoutUrl || '');
                    setZoomType('live');
                    setZoomTitle('Live Photo (Motion Clip)');
                  }}
                  className="relative group cursor-pointer flex flex-col items-center"
                >
                  <div className="w-26 h-32 rounded-xl bg-black p-1 shadow-md border border-amber-400/50 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform relative">
                    {liveResult ? (
                      <video
                        src={liveResult.videoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : isGeneratingLive && capturedPhotos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400">
                        <Sparkles className="w-4 h-4 text-amber-400 animate-spin mb-1" />
                        <span className="text-[8px] font-semibold text-slate-300">Menyiapkan Live...</span>
                      </div>
                    ) : capturedPhotos.length > 0 ? (
                      <img
                        src={capturedPhotos[liveFrameIndex]}
                        alt="Live Photo"
                        className="w-full h-full object-cover rounded-lg transition-opacity duration-300"
                      />
                    ) : (
                      <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
                    )}

                    {/* Apple-style pulsing LIVE badge */}
                    <div className="absolute top-1 left-1 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-amber-400/50 flex items-center gap-1 shadow-md">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
                      </span>
                      <span className="text-[8px] font-black tracking-wider text-amber-300">LIVE</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 mt-1 flex items-center gap-1">
                    <span>Live Photo</span>
                    <ZoomIn className="w-2.5 h-2.5 opacity-70" />
                  </span>
                </div>

                {/* 3. Looping GIF Card */}
                {gifResult ? (
                  <div
                    onClick={() => {
                      setZoomPhotoUrl(gifResult.dataUrl);
                      setZoomType('gif');
                      setZoomTitle('Animasi GIF Photobooth');
                    }}
                    className="relative group cursor-pointer flex flex-col items-center"
                  >
                    <div className="w-26 h-32 rounded-xl bg-black p-1 shadow-md border border-amber-400/40 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform relative">
                      <img
                        src={gifResult.dataUrl}
                        alt="Animasi GIF"
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-black text-amber-400">
                        GIF
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 mt-1 flex items-center gap-1">
                      <span>Animasi GIF</span>
                      <ZoomIn className="w-2.5 h-2.5 opacity-70" />
                    </span>
                  </div>
                ) : isGeneratingGif ? (
                  <div className="w-26 h-32 rounded-xl bg-white/5 border border-dashed border-white/15 flex flex-col items-center justify-center p-2 text-center text-slate-400">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin mb-1" />
                    <span className="text-[9px] font-semibold text-slate-300">
                      Menyiapkan GIF...
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Mini Photos Strip */}
              {capturedPhotos.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-center gap-1.5 overflow-x-auto custom-scrollbar">
                  {capturedPhotos.slice(0, 6).map((url, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setZoomPhotoUrl(url);
                        setZoomTitle(`Foto Pose #${i + 1}`);
                      }}
                      className="w-9 h-7 rounded bg-slate-950 overflow-hidden border border-white/15 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                      title={`Foto #${i + 1}`}
                    >
                      <img src={url} alt={`#${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {capturedPhotos.length > 6 && (
                    <span className="text-[9px] text-slate-400 font-bold px-1">
                      +{capturedPhotos.length - 6}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Tray Status Notice */}
          <div className="p-3 mt-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            {printStatus === 'completed'
              ? '✓ Cetakan Anda telah keluar di baki printer. Selamat menikmati!'
              : 'Harap menunggu mesin printer mengeluarkan lembar cetakan secara otomatis.'}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: DIGITAL SOFT-FILE (QR CODE & WHATSAPP)      */}
        {/* ========================================================= */}
        <div className="glass-panel-elevated rounded-3xl p-6 flex flex-col justify-between text-center border-white/10 shadow-2xl">
          <div>
            <div className="w-16 h-16 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center mx-auto mb-3 border border-sky-500/30">
              <QrCode className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-extrabold text-white mb-1">
              Soft File Digital (HD)
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Scan QR code dengan kamera HP Anda untuk mengunduh semua foto & GIF
            </p>

            {/* QR Code Container */}
            {galleryData && (
              <div className="p-3 bg-white rounded-2xl inline-block shadow-xl my-1">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    galleryData.galleryUrl
                  )}`}
                  alt="QR Galeri Privat"
                  className="w-34 h-34 object-contain"
                />
              </div>
            )}

            {/* Included Content Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-slate-300 mt-2">
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3 stroke-[3]" /> Cetak Foto Fisik
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                <span>Live Photo</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3 stroke-[3]" /> Animasi GIF
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3 stroke-[3]" /> Foto HD
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              Tautan galeri privat berlaku selama <strong>48 jam</strong>.
            </p>
          </div>

          {/* WhatsApp Share Button */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <Button
              variant={isWaSent ? 'glass' : 'primary'}
              size="md"
              className="w-full"
              onClick={() => {
                playButtonSound('primary');
                setIsWaModalOpen(true);
              }}
              leftIcon={<MessageCircle className="w-4 h-4 text-emerald-400" />}
            >
              {isWaSent ? 'Terkirim ke WhatsApp ✓' : 'Kirim Soft File ke WhatsApp'}
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Session ID */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 flex-shrink-0 text-xs text-slate-400">
        <span>MinjaPhotobooth • Sesi ID: <strong className="text-amber-400 font-mono">{sessionId}</strong></span>
        <span>Terima Kasih atas Kunjungan Anda</span>
      </div>

      {/* Modal Zoom Preview */}
      <AnimatePresence>
        {zoomPhotoUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
            onClick={() => setZoomPhotoUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel-elevated p-5 rounded-3xl max-w-lg w-full border border-white/20 shadow-2xl flex flex-col items-center gap-3"
            >
              <div className="w-full flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  {zoomTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setZoomPhotoUrl(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative w-full max-h-[55vh] rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                {zoomType === 'live' && liveResult?.videoUrl ? (
                  <video
                    src={liveResult.videoUrl}
                    autoPlay
                    loop
                    controls
                    playsInline
                    className="w-full max-h-[55vh] object-contain"
                  />
                ) : (
                  <img
                    src={zoomPhotoUrl}
                    alt={zoomTitle}
                    className="w-full max-h-[55vh] object-contain"
                  />
                )}

                {zoomType === 'live' && (
                  <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/50 flex items-center gap-1.5 shadow-lg pointer-events-none">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>
                    <span className="text-[9px] font-black tracking-wider text-amber-300">
                      LIVE PHOTO
                    </span>
                  </div>
                )}
              </div>

              <div className="w-full flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (zoomType === 'live' && liveResult) {
                      const ext = liveResult.mimeType.includes('mp4') ? 'mp4' : 'webm';
                      downloadFile(liveResult.videoUrl, `minja-live-photo-${sessionId}.${ext}`);
                    } else {
                      const ext = zoomPhotoUrl.includes('image/gif') ? 'gif' : 'jpg';
                      downloadFile(zoomPhotoUrl, `minja-export-${sessionId}-${Date.now()}.${ext}`);
                    }
                    showToast({
                      type: 'success',
                      title: 'File Diunduh',
                      message: zoomType === 'live' ? 'Video Live Photo berhasil diunduh.' : 'File berhasil disimpan.',
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>{zoomType === 'live' ? 'Unduh Video Live (.mp4)' : 'Unduh File Ini'}</span>
                </button>

                <Button
                  variant="gold"
                  size="md"
                  onClick={() => setZoomPhotoUrl(null)}
                >
                  Tutup
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Input Nomor WhatsApp Menggunakan Virtual Numpad */}
      <Modal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
        title="Kirim Hasil Foto ke WhatsApp"
        maxWidth="md"
      >
        <div className="flex flex-col items-center">
          <p className="text-xs text-slate-300 text-center mb-4">
            Masukkan nomor WhatsApp yang diawali <code>08</code> atau <code>628</code>. Tautan galeri digital privat akan dikirim secara instan.
          </p>

          <div className="w-full max-w-sm h-14 rounded-2xl glass-input mb-4 px-4 flex items-center justify-center text-2xl font-mono tracking-widest text-emerald-400 border border-emerald-500/30">
            {phoneNumber || '08xxxxxxxxxx'}
          </div>

          <VirtualNumpad
            value={phoneNumber}
            onChange={setPhoneNumber}
            maxLength={13}
            submitLabel="Kirim"
            onSubmit={handleSendWhatsApp}
            isSubmitDisabled={isSendingWa || phoneNumber.length < 9}
          />
        </div>
      </Modal>
    </div>
  );
};
