import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export interface GifGenerationOptions {
  maxDimension?: number;
  delayMs?: number;
  onProgress?: (progress: number) => void;
}

export interface GeneratedGifResult {
  blob: Blob;
  dataUrl: string;
  frameCount: number;
  sizeBytes: number;
  width: number;
  height: number;
}

/**
 * Load an image from URL or dataURL safely into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Gagal memuat gambar untuk GIF: ${e}`));
    img.src = src;
  });
}

/**
 * Generate a high-definition animated GIF from photos matching natural aspect ratio,
 * with ZERO watermarks, ZERO frame number stamps, and optimal 256-color palette.
 */
export async function generateGifFromPhotos(
  photoUrls: string[],
  options: GifGenerationOptions = {}
): Promise<GeneratedGifResult> {
  if (!photoUrls || photoUrls.length === 0) {
    throw new Error('Dibutuhkan minimal 1 foto untuk membuat animasi GIF.');
  }

  // 1. Preload all images to inspect actual photo dimensions
  const images: HTMLImageElement[] = [];
  for (let i = 0; i < photoUrls.length; i++) {
    try {
      const img = await loadImage(photoUrls[i]);
      images.push(img);
    } catch (e) {
      console.warn(`[GifService] Skip image #${i}:`, e);
    }
  }

  if (images.length === 0) {
    throw new Error('Tidak ada foto yang dapat dimuat untuk membuat GIF.');
  }

  // 2. Determine optimal HD resolution matching natural aspect ratio of the photos
  const baseImg = images[0];
  const maxDim = options.maxDimension || 720; // 720p HD resolution for crisp quality
  let width: number;
  let height: number;

  if (baseImg.width >= baseImg.height) {
    width = Math.min(baseImg.width, maxDim);
    height = Math.round(width * (baseImg.height / baseImg.width));
  } else {
    height = Math.min(baseImg.height, maxDim);
    width = Math.round(height * (baseImg.width / baseImg.height));
  }

  // Ensure even dimensions
  width = width % 2 === 0 ? width : width - 1;
  height = height % 2 === 0 ? height : height - 1;

  const delay = options.delayMs || 500; // 500ms per frame

  // 3. Offscreen canvas with high quality smoothing
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Browser tidak mendukung canvas 2d context untuk GIF.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const gif = GIFEncoder();

  // 4. Encode each frame cleanly (NO watermark, NO frame counters)
  for (let i = 0; i < images.length; i++) {
    const img = images[i];

    // Clear background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Render image maintaining aspect ratio
    const imgRatio = img.width / img.height;
    const canvasRatio = width / height;
    let renderW = width;
    let renderH = height;
    let renderX = 0;
    let renderY = 0;

    if (imgRatio > canvasRatio) {
      renderW = height * imgRatio;
      renderX = -(renderW - width) / 2;
    } else {
      renderH = width / imgRatio;
      renderY = -(renderH - height) / 2;
    }

    ctx.drawImage(img, renderX, renderY, renderW, renderH);

    // Extract RGBA pixels
    const imageData = ctx.getImageData(0, 0, width, height);
    const { data } = imageData;

    // High quality palette quantization
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);

    // Write frame to GIF
    gif.writeFrame(index, width, height, {
      palette,
      delay,
    });

    if (options.onProgress) {
      options.onProgress(Math.round(((i + 1) / images.length) * 100));
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'image/gif' });
  const dataUrl = URL.createObjectURL(blob);

  return {
    blob,
    dataUrl,
    frameCount: images.length,
    sizeBytes: bytes.byteLength,
    width,
    height,
  };
}

/**
 * Trigger browser file download
 */
export function downloadFile(urlOrBlob: string | Blob, filename: string): void {
  const link = document.createElement('a');
  if (typeof urlOrBlob === 'string') {
    link.href = urlOrBlob;
  } else {
    link.href = URL.createObjectURL(urlOrBlob);
  }
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
