// src/services/livePhotoService.ts
// Service untuk menghasilkan Live Photo (Live Motion Video) berdefinisi tinggi dari sesi foto photobooth.
// Menggunakan HTML5 Canvas & MediaRecorder API native browser tanpa dependensi eksternal.

export interface LivePhotoOptions {
  fps?: number;
  frameHoldMs?: number;
  transitionMs?: number;
  maxDimension?: number;
}

export interface LivePhotoResult {
  videoBlob: Blob;
  videoUrl: string;
  durationSec: number;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Load image safely into HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Gagal memuat gambar untuk Live Photo: ${e}`));
    img.src = src;
  });
}

/**
 * Memilih MIME type video terbaik yang didukung oleh browser saat ini
 */
function getSupportedVideoMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';

  const candidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return '';
}

/**
 * Menghasilkan video Live Photo (MP4/WebM) berkualitas tinggi dengan efek subtle cinematic zoom & crossfade
 */
export async function generateLivePhotoVideo(
  photoUrls: string[],
  options: LivePhotoOptions = {}
): Promise<LivePhotoResult> {
  if (!photoUrls || photoUrls.length === 0) {
    throw new Error('Dibutuhkan minimal 1 foto untuk membuat Live Photo.');
  }

  // 1. Preload semua gambar foto asli
  const images: HTMLImageElement[] = [];
  for (let i = 0; i < photoUrls.length; i++) {
    try {
      const img = await loadImage(photoUrls[i]);
      images.push(img);
    } catch (err) {
      console.warn(`[LivePhotoService] Skip foto #${i}:`, err);
    }
  }

  if (images.length === 0) {
    throw new Error('Tidak ada foto valid yang dapat dimuat.');
  }

  // 2. Tentukan resolusi output (720p HD seimbang untuk performa & ketajaman)
  const baseImg = images[0];
  const maxDim = options.maxDimension || 720;
  let width: number;
  let height: number;

  if (baseImg.width >= baseImg.height) {
    width = Math.min(baseImg.width, maxDim);
    height = Math.round(width * (baseImg.height / baseImg.width));
  } else {
    height = Math.min(baseImg.height, maxDim);
    width = Math.round(height * (baseImg.width / baseImg.height));
  }

  // Pastikan dimensi genap untuk encoder video
  width = width % 2 === 0 ? width : width - 1;
  height = height % 2 === 0 ? height : height - 1;

  const fps = options.fps || 30;
  const frameHoldMs = options.frameHoldMs || 700; // 700ms tiap pose
  const transitionMs = options.transitionMs || 200; // 200ms crossfade
  const totalPerPhotoMs = frameHoldMs + transitionMs;
  const totalDurationMs = images.length * totalPerPhotoMs;
  const totalFrames = Math.round((totalDurationMs / 1000) * fps);

  // 3. Setup Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia.');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 4. Setup MediaRecorder
  const mimeType = getSupportedVideoMimeType();
  const stream = canvas.captureStream(fps);
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_000_000 })
    : new MediaRecorder(stream);

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise<LivePhotoResult>((resolve, reject) => {
    recorder.onerror = (e) => reject(e);

    recorder.onstop = () => {
      const outputType = recorder.mimeType || mimeType || 'video/webm';
      const videoBlob = new Blob(chunks, { type: outputType });
      const videoUrl = URL.createObjectURL(videoBlob);

      resolve({
        videoBlob,
        videoUrl,
        durationSec: totalDurationMs / 1000,
        width,
        height,
        mimeType: outputType,
      });
    };

    recorder.start();

    // 5. Render loop per frame
    let currentFrame = 0;

    const renderNextFrame = () => {
      if (currentFrame >= totalFrames) {
        // Beri sedikit buffer sebelum stop recorder
        setTimeout(() => {
          try {
            recorder.stop();
          } catch (e) {
            console.warn('[LivePhotoService] Recorder already stopped:', e);
          }
        }, 100);
        return;
      }

      const elapsedMs = (currentFrame / fps) * 1000;
      const photoIndex = Math.floor(elapsedMs / totalPerPhotoMs) % images.length;
      const nextIndex = (photoIndex + 1) % images.length;
      const timeInPhoto = elapsedMs % totalPerPhotoMs;

      // Hitung progress zoom halus (Ken Burns 1.0 -> 1.04)
      const zoomProgress = timeInPhoto / totalPerPhotoMs;
      const scale = 1.0 + zoomProgress * 0.04;

      const curImg = images[photoIndex];
      const nextImg = images[nextIndex];

      // Bersihkan canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Gambar foto saat ini dengan subtle zoom
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);

      // Fit center cover
      const hRatio = width / curImg.width;
      const vRatio = height / curImg.height;
      const ratio = Math.max(hRatio, vRatio);
      const centerShiftX = (width - curImg.width * ratio) / 2;
      const centerShiftY = (height - curImg.height * ratio) / 2;
      ctx.drawImage(
        curImg,
        0,
        0,
        curImg.width,
        curImg.height,
        centerShiftX,
        centerShiftY,
        curImg.width * ratio,
        curImg.height * ratio
      );
      ctx.restore();

      // Jika sedang dalam masa transisi crossfade ke foto berikutnya
      if (timeInPhoto > frameHoldMs && images.length > 1) {
        const fadeAlpha = (timeInPhoto - frameHoldMs) / transitionMs;
        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0, fadeAlpha));

        const hRatio2 = width / nextImg.width;
        const vRatio2 = height / nextImg.height;
        const ratio2 = Math.max(hRatio2, vRatio2);
        const centerShiftX2 = (width - nextImg.width * ratio2) / 2;
        const centerShiftY2 = (height - nextImg.height * ratio2) / 2;

        ctx.drawImage(
          nextImg,
          0,
          0,
          nextImg.width,
          nextImg.height,
          centerShiftX2,
          centerShiftY2,
          nextImg.width * ratio2,
          nextImg.height * ratio2
        );
        ctx.restore();
      }

      currentFrame++;

      // Jadwalkan frame berikutnya dengan requestAnimationFrame atau timer untuk konsistensi encoding
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(renderNextFrame);
      } else {
        setTimeout(renderNextFrame, 1000 / fps);
      }
    };

    renderNextFrame();
  });
}
