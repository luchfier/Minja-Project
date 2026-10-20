import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TemplateItem } from '../../types/template';
import { FilterPreset, PhotoAdjustment, SlotAdjustment, StickerElement, TextElement } from '../../types/editor';
import { RotateCw, Maximize2, X, Move } from 'lucide-react';

export interface CanvasEditorProps {
  template: TemplateItem;
  photoUrls: string[];
  filter: FilterPreset;
  adjustments: PhotoAdjustment;
  slotAdjustments?: Record<number, SlotAdjustment>;
  selectedSlotIndex?: number | null;
  onSelectSlot?: (index: number | null) => void;
  onUpdateSlotAdjustment?: (index: number, updates: Partial<SlotAdjustment>) => void;
  onDropPhotoOnSlot?: (slotIndex: number, photoUrl: string) => void;
  stickers: StickerElement[];
  texts: TextElement[];
  selectedElement?: { type: 'sticker' | 'text'; id: string } | null;
  onSelectElement?: (el: { type: 'sticker' | 'text'; id: string } | null) => void;
  onUpdateSticker?: (id: string, updates: Partial<StickerElement>) => void;
  onDeleteSticker?: (id: string) => void;
  onUpdateText?: (id: string, updates: Partial<TextElement>) => void;
  onDeleteText?: (id: string) => void;
  onDragEnd?: () => void;
  onRenderComplete?: (dataUrl: string) => void;
  className?: string;
}

type DragMode = 'none' | 'move' | 'resize' | 'rotate' | 'slot-pan';

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  template,
  photoUrls,
  filter,
  adjustments,
  slotAdjustments = {},
  selectedSlotIndex = null,
  onSelectSlot,
  onUpdateSlotAdjustment,
  onDropPhotoOnSlot,
  stickers,
  texts,
  selectedElement: propSelectedElement,
  onSelectElement,
  onUpdateSticker,
  onDeleteSticker,
  onUpdateText,
  onDeleteText,
  onDragEnd,
  onRenderComplete,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persistent Image Cache across renders for instant flicker-free rendering
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  // In-memory offscreen canvas for zero-flicker double buffering
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Debounce timer for high-res JPEG export onRenderComplete
  const renderCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRenderedUrlRef = useRef<string>('');

  // Active selected element (internal state synced with prop if controlled)
  const [internalSelectedElement, setInternalSelectedElement] = useState<{
    type: 'sticker' | 'text';
    id: string;
  } | null>(propSelectedElement ?? null);

  useEffect(() => {
    if (propSelectedElement !== undefined) {
      setInternalSelectedElement(propSelectedElement);
    }
  }, [propSelectedElement]);

  const activeElement =
    propSelectedElement !== undefined ? propSelectedElement : internalSelectedElement;

  const setActiveElement = (el: { type: 'sticker' | 'text'; id: string } | null) => {
    setInternalSelectedElement(el);
    if (onSelectElement) onSelectElement(el);
  };

  // Drag interaction state
  const [dragState, setDragState] = useState<{
    mode: DragMode;
    type: 'sticker' | 'text' | 'slot';
    id: string;
    slotIndex?: number;
    initialCanvasX: number;
    initialCanvasY: number;
    elementStartX: number;
    elementStartY: number;
    initialDist: number;
    initialScale: number;
    initialFontSize: number;
    initialAngle: number;
    initialRotation: number;
    currentValDisplay?: string;
  } | null>(null);

  const TARGET_WIDTH = 1200;
  const TARGET_HEIGHT = 1800;

  // Convert client viewport coordinate to Canvas 1200x1800 space
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = TARGET_WIDTH / rect.width;
    const scaleY = TARGET_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // Async/Cached Image Loader - returns instantly if already loaded
  const getImage = useCallback((url: string): Promise<HTMLImageElement | null> => {
    if (!url || url.trim().length === 0) return Promise.resolve(null);
    const cached = imageCacheRef.current.get(url);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
    return new Promise((resolve) => {
      const img = new Image();
      // Only set crossOrigin for remote http/https URLs to avoid CORS blocking data: and blob: URLs
      if (url.startsWith('http://') || url.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }
      let timeoutId: any = null;
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        img.onload = null;
        img.onerror = null;
      };
      img.onload = () => {
        cleanup();
        imageCacheRef.current.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        cleanup();
        resolve(null);
      };
      timeoutId = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 2000);
      img.src = url;
    });
  }, []);

  // Find active element object
  const activeSticker =
    activeElement?.type === 'sticker'
      ? stickers.find((s) => s.id === activeElement.id)
      : null;

  const activeText =
    activeElement?.type === 'text'
      ? texts.find((t) => t.id === activeElement.id)
      : null;

  // Handle pointer down on canvas (to select slot, sticker, text, or drag)
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    // 1. Hit test stickers (topmost first)
    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i];
      const radius = 65 * (s.scale || 1);
      if (Math.hypot(x - s.x, y - s.y) <= radius) {
        if (onSelectSlot) onSelectSlot(null);
        setActiveElement({ type: 'sticker', id: s.id });
        startInteraction('move', 'sticker', s.id, x, y, s.x, s.y, s.scale || 1, 32, s.rotation || 0, e);
        return;
      }
    }

    // 2. Hit test texts
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      const approxRadius = Math.max(60, (t.fontSize || 32) * 1.5);
      if (Math.hypot(x - t.x, y - t.y) <= approxRadius) {
        if (onSelectSlot) onSelectSlot(null);
        setActiveElement({ type: 'text', id: t.id });
        startInteraction('move', 'text', t.id, x, y, t.x, t.y, 1, t.fontSize || 32, t.rotation || 0, e);
        return;
      }
    }

    // 3. Hit test photo slots for selection and direct pan/crop
    for (let i = 0; i < template.slots.length; i++) {
      const slot = template.slots[i];
      if (x >= slot.x && x <= slot.x + slot.width && y >= slot.y && y <= slot.y + slot.height) {
        setActiveElement(null);
        if (onSelectSlot) onSelectSlot(i);
        startSlotPan(i, x, y, e);
        return;
      }
    }

    // Tapped outside everything
    setActiveElement(null);
    if (onSelectSlot) onSelectSlot(null);
  };

  const startSlotPan = (slotIndex: number, canvasX: number, canvasY: number, e: React.PointerEvent) => {
    e.stopPropagation();
    if (containerRef.current) {
      try {
        containerRef.current.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }
    const currentAdj = slotAdjustments[slotIndex] || {
      zoom: 1, panX: 0, panY: 0, rotation: 0, brightness: 0, contrast: 0,
    };
    setDragState({
      mode: 'slot-pan',
      type: 'slot',
      id: `slot_${slotIndex}`,
      slotIndex,
      initialCanvasX: canvasX,
      initialCanvasY: canvasY,
      elementStartX: currentAdj.panX,
      elementStartY: currentAdj.panY,
      initialDist: 1,
      initialScale: currentAdj.zoom,
      initialFontSize: 0,
      initialAngle: 0,
      initialRotation: 0,
      currentValDisplay: `Geser Foto #${slotIndex + 1}`,
    });
  };

  const startInteraction = (
    mode: DragMode,
    type: 'sticker' | 'text',
    id: string,
    canvasX: number,
    canvasY: number,
    elementX: number,
    elementY: number,
    scale: number,
    fontSize: number,
    rotation: number,
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    if (containerRef.current) {
      try {
        containerRef.current.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }

    const dist = Math.hypot(canvasX - elementX, canvasY - elementY) || 1;
    const angle = Math.atan2(canvasY - elementY, canvasX - elementX) * (180 / Math.PI);

    setDragState({
      mode,
      type,
      id,
      initialCanvasX: canvasX,
      initialCanvasY: canvasY,
      elementStartX: elementX,
      elementStartY: elementY,
      initialDist: dist,
      initialScale: scale,
      initialFontSize: fontSize,
      initialAngle: angle,
      initialRotation: rotation,
      currentValDisplay:
        mode === 'resize'
          ? type === 'sticker'
            ? `${Math.round(scale * 100)}%`
            : `${fontSize}px`
          : mode === 'rotate'
          ? `${Math.round(rotation)}°`
          : undefined,
    });
  };

  const handleGlobalPointerMove = (e: React.PointerEvent) => {
    if (!dragState || dragState.mode === 'none') return;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    // Slot Panning / Cropping
    if (dragState.mode === 'slot-pan' && dragState.slotIndex !== undefined && onUpdateSlotAdjustment) {
      const dx = x - dragState.initialCanvasX;
      const dy = y - dragState.initialCanvasY;
      onUpdateSlotAdjustment(dragState.slotIndex, {
        panX: Math.round(dragState.elementStartX + dx),
        panY: Math.round(dragState.elementStartY + dy),
      });
      return;
    }

    // Sticker / Text Move
    if (dragState.mode === 'move') {
      const dx = x - dragState.initialCanvasX;
      const dy = y - dragState.initialCanvasY;
      const newX = Math.max(40, Math.min(TARGET_WIDTH - 40, dragState.elementStartX + dx));
      const newY = Math.max(40, Math.min(TARGET_HEIGHT - 40, dragState.elementStartY + dy));

      if (dragState.type === 'sticker' && onUpdateSticker) {
        onUpdateSticker(dragState.id, { x: newX, y: newY });
      } else if (dragState.type === 'text' && onUpdateText) {
        onUpdateText(dragState.id, { x: newX, y: newY });
      }
    } else if (dragState.mode === 'resize') {
      // Scaling based on distance to element center
      const currentDist = Math.hypot(x - dragState.elementStartX, y - dragState.elementStartY);
      const ratio = currentDist / Math.max(20, dragState.initialDist);

      if (dragState.type === 'sticker' && onUpdateSticker) {
        const newScale = Math.max(0.3, Math.min(4.0, Number((dragState.initialScale * ratio).toFixed(2))));
        onUpdateSticker(dragState.id, { scale: newScale });
        setDragState((prev) => prev ? { ...prev, currentValDisplay: `${Math.round(newScale * 100)}%` } : null);
      } else if (dragState.type === 'text' && onUpdateText) {
        const newFontSize = Math.max(14, Math.min(100, Math.round(dragState.initialFontSize * ratio)));
        onUpdateText(dragState.id, { fontSize: newFontSize });
        setDragState((prev) => prev ? { ...prev, currentValDisplay: `${newFontSize}px` } : null);
      }
    } else if (dragState.mode === 'rotate') {
      // Angle from element center to pointer
      const currentAngle = Math.atan2(y - dragState.elementStartY, x - dragState.elementStartX) * (180 / Math.PI);
      const angleDiff = currentAngle - dragState.initialAngle;
      const newRotation = (Math.round(dragState.initialRotation + angleDiff) + 360) % 360;

      if (dragState.type === 'sticker' && onUpdateSticker) {
        onUpdateSticker(dragState.id, { rotation: newRotation });
        setDragState((prev) => prev ? { ...prev, currentValDisplay: `${Math.round(newRotation)}°` } : null);
      } else if (dragState.type === 'text' && onUpdateText) {
        onUpdateText(dragState.id, { rotation: newRotation });
        setDragState((prev) => prev ? { ...prev, currentValDisplay: `${Math.round(newRotation)}°` } : null);
      }
    }
  };

  const handleGlobalPointerUp = (e: React.PointerEvent) => {
    if (dragState && dragState.mode !== 'none') {
      setDragState(null);
      if (containerRef.current) {
        try {
          containerRef.current.releasePointerCapture(e.pointerId);
        } catch {
          // Safe fallback
        }
      }
      if (onDragEnd) onDragEnd();
    }
  };

  // Re-render Canvas Content using Double Buffering & Image Cache
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !template || !template.slots) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;

    // Only assign dimensions if changed to prevent wiping canvas bitmap
    if (canvas.width !== TARGET_WIDTH) canvas.width = TARGET_WIDTH;
    if (canvas.height !== TARGET_HEIGHT) canvas.height = TARGET_HEIGHT;

    // Setup or reuse in-memory offscreen canvas
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = TARGET_WIDTH;
      offscreenCanvasRef.current.height = TARGET_HEIGHT;
    }
    const offscreenCanvas = offscreenCanvasRef.current;
    if (offscreenCanvas.width !== TARGET_WIDTH) offscreenCanvas.width = TARGET_WIDTH;
    if (offscreenCanvas.height !== TARGET_HEIGHT) offscreenCanvas.height = TARGET_HEIGHT;

    const offCtx = offscreenCanvas.getContext('2d');
    if (!offCtx) return;

    const render = async () => {
      // 1. Fetch images from persistent cache (resolves immediately if cached)
      const slotUrls = photoUrls.slice(0, template.slots.length);
      const stickerImgUrls = stickers
        .filter((s) => s.url.startsWith('data:image/') || s.url.startsWith('http://') || s.url.startsWith('https://') || s.url.includes('.png'))
        .map((s) => s.url);

      const [loadedImages, frameImg] = await Promise.all([
        Promise.all(slotUrls.map((u) => getImage(u))),
        template.frameUrl ? getImage(template.frameUrl) : Promise.resolve(null),
        ...stickerImgUrls.map((u) => getImage(u)),
      ]);

      if (isCancelled) return;

      // 2. Clear background & clean frame card on OFFSCREEN canvas
      offCtx.fillStyle = '#0F131D';
      offCtx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      // Clean outer border
      offCtx.strokeStyle = '#263147';
      offCtx.lineWidth = 16;
      offCtx.strokeRect(16, 16, TARGET_WIDTH - 32, TARGET_HEIGHT - 32);

      // 3. Render photo slots with per-slot crop, zoom, pan, and individual/global filters
      template.slots.forEach((slot, index) => {
        const img = loadedImages[index];
        const slotAdj = slotAdjustments[index] || {
          zoom: 1,
          panX: 0,
          panY: 0,
          rotation: 0,
          brightness: 0,
          contrast: 0,
        };
        const slotFilter = slotAdj.filter || filter;
        const isSlotSelected = selectedSlotIndex === index;

        offCtx.save();
        offCtx.beginPath();
        const r = 24;
        offCtx.roundRect(slot.x, slot.y, slot.width, slot.height, r);
        offCtx.clip();

        offCtx.fillStyle = '#182032';
        offCtx.fillRect(slot.x, slot.y, slot.width, slot.height);

        if (img && img.naturalWidth > 0) {
          let filterString = '';
          const b = 100 + adjustments.brightness + (slotAdj.brightness || 0);
          const c = 100 + adjustments.contrast + (slotAdj.contrast || 0);
          filterString += `brightness(${b}%) contrast(${c}%) `;

          if (slotFilter === 'bw') {
            filterString += 'grayscale(100%) ';
          } else if (slotFilter === 'sepia') {
            filterString += 'sepia(80%) hue-rotate(-20deg) ';
          } else if (slotFilter === 'warm') {
            filterString += 'sepia(25%) saturate(140%) ';
          } else if (slotFilter === 'cool') {
            filterString += 'hue-rotate(180deg) saturate(110%) ';
          } else if (slotFilter === 'glamour') {
            filterString += 'contrast(105%) brightness(110%) saturate(120%) ';
          }

          offCtx.filter = filterString.trim();

          const totalRot = ((adjustments.rotation || 0) + (slotAdj.rotation || 0) + 360) % 360;
          offCtx.translate(
            slot.x + slot.width / 2 + (slotAdj.panX || 0),
            slot.y + slot.height / 2 + (slotAdj.panY || 0)
          );
          offCtx.rotate((totalRot * Math.PI) / 180);

          const imgAspect = img.naturalWidth / img.naturalHeight;
          const slotAspect = slot.width / slot.height;
          let baseW = slot.width;
          let baseH = slot.height;

          if (imgAspect > slotAspect) {
            baseW = slot.height * imgAspect;
          } else {
            baseH = slot.width / imgAspect;
          }

          const zoom = Math.max(1.0, slotAdj.zoom || 1.0);
          const drawW = baseW * zoom;
          const drawH = baseH * zoom;

          offCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
          // Modern empty slot placeholder
          offCtx.fillStyle = isSlotSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)';
          offCtx.fillRect(slot.x, slot.y, slot.width, slot.height);

          offCtx.fillStyle = isSlotSelected ? '#38BDF8' : 'rgba(255, 255, 255, 0.85)';
          offCtx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
          offCtx.textAlign = 'center';
          offCtx.fillText(`+ Slot Foto #${index + 1}`, slot.x + slot.width / 2, slot.y + slot.height / 2 - 14);

          offCtx.fillStyle = isSlotSelected ? 'rgba(56, 189, 248, 0.7)' : 'rgba(255, 255, 255, 0.45)';
          offCtx.font = '500 22px "Plus Jakarta Sans", sans-serif';
          offCtx.fillText(`Sentuh foto di panel kiri`, slot.x + slot.width / 2, slot.y + slot.height / 2 + 24);
        }

        offCtx.restore();

        // Slot border frame
        if (isSlotSelected) {
          offCtx.strokeStyle = '#38BDF8';
          offCtx.lineWidth = 10;
          offCtx.beginPath();
          offCtx.roundRect(slot.x, slot.y, slot.width, slot.height, 24);
          offCtx.stroke();
        } else if (!template.frameUrl || template.frameUrl.trim().length === 0) {
          offCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          offCtx.lineWidth = 6;
          offCtx.beginPath();
          offCtx.roundRect(slot.x, slot.y, slot.width, slot.height, 24);
          offCtx.stroke();
        }
      });

      // 4. Render Frame Overlay PNG (on top of photos so transparent cutouts reveal photos)
      if (frameImg && frameImg.naturalWidth > 0) {
        offCtx.drawImage(frameImg, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
      }

      // 5. Render Decorative Stickers (PNG Images OR Emoji Characters)
      stickers.forEach((sticker) => {
        offCtx.save();
        offCtx.translate(sticker.x, sticker.y);
        offCtx.rotate(((sticker.rotation || 0) * Math.PI) / 180);
        offCtx.scale(sticker.scale || 1, sticker.scale || 1);

        const isImage =
          sticker.url.startsWith('data:image/') ||
          sticker.url.startsWith('http://') ||
          sticker.url.startsWith('https://') ||
          sticker.url.includes('.png');

        if (isImage) {
          const cachedImg = imageCacheRef.current.get(sticker.url);
          if (cachedImg && cachedImg.naturalWidth > 0) {
            const imgAspect = cachedImg.naturalWidth / cachedImg.naturalHeight;
            let drawW = 90;
            let drawH = 90;
            if (imgAspect > 1) {
              drawH = 90 / imgAspect;
            } else {
              drawW = 90 * imgAspect;
            }
            offCtx.drawImage(cachedImg, -drawW / 2, -drawH / 2, drawW, drawH);
          }
        } else {
          // Render Emoji character
          offCtx.font = '72px sans-serif';
          offCtx.textAlign = 'center';
          offCtx.textBaseline = 'middle';
          offCtx.fillText(sticker.url, 0, 0);
        }
        offCtx.restore();
      });

      // 6. Render Custom Texts
      texts.forEach((txt) => {
        offCtx.save();
        offCtx.translate(txt.x, txt.y);
        offCtx.rotate(((txt.rotation || 0) * Math.PI) / 180);

        offCtx.font = `bold ${(txt.fontSize || 34) * 1.5}px "${txt.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;
        offCtx.fillStyle = txt.color;
        offCtx.textAlign = 'center';
        offCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        offCtx.shadowBlur = 8;
        offCtx.fillText(txt.text, 0, 0);
        offCtx.restore();
      });

      if (isCancelled) return;

      // 7. Atomic Blit: Salin hasil offscreen yang SUDAH SELESAI SEMPURNA ke kanvas utama
      ctx.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
      ctx.drawImage(offscreenCanvas, 0, 0);

      // 8. Debounced onRenderComplete - hindari eksekusi toDataURL saat sedang dragging/interaksi
      if (onRenderComplete) {
        if (renderCompleteTimerRef.current) {
          clearTimeout(renderCompleteTimerRef.current);
        }
        renderCompleteTimerRef.current = setTimeout(() => {
          if (!isCancelled && canvasRef.current) {
            try {
              const url = canvasRef.current.toDataURL('image/jpeg', 0.92);
              if (url !== lastRenderedUrlRef.current) {
                lastRenderedUrlRef.current = url;
                onRenderComplete(url);
              }
            } catch {
              // ignore
            }
          }
        }, 350);
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [
    template,
    photoUrls,
    filter,
    adjustments,
    slotAdjustments,
    selectedSlotIndex,
    stickers,
    texts,
    onRenderComplete,
    getImage,
  ]);

  // Calculate overlay bounding box dimensions for active element (sticker / text)
  let overlayStyle: React.CSSProperties = { display: 'none' };
  let currentRotation = 0;

  if (activeElement && (activeSticker || activeText)) {
    const el = activeSticker || activeText!;
    const posXPercent = (el.x / TARGET_WIDTH) * 100;
    const posYPercent = (el.y / TARGET_HEIGHT) * 100;
    currentRotation = el.rotation || 0;

    const canvas = canvasRef.current;
    const screenScale = canvas && canvas.clientWidth > 0 ? canvas.clientWidth / TARGET_WIDTH : 0.4;

    let boxWidthPx = 100;
    let boxHeightPx = 100;

    if (activeSticker) {
      const stickerScale = activeSticker.scale || 1;
      const canvasDim = 90 * stickerScale;
      boxWidthPx = Math.max(76, canvasDim * screenScale + 32);
      boxHeightPx = Math.max(76, canvasDim * screenScale + 32);
    } else if (activeText) {
      const fontSize = activeText.fontSize || 34;
      const textCanvasFont = fontSize * 1.5;
      const textCanvasWidth = Math.max(120, activeText.text.length * (textCanvasFont * 0.65));
      const textCanvasHeight = textCanvasFont * 1.3;
      boxWidthPx = Math.max(100, textCanvasWidth * screenScale + 36);
      boxHeightPx = Math.max(56, textCanvasHeight * screenScale + 24);
    }

    overlayStyle = {
      position: 'absolute',
      left: `${posXPercent}%`,
      top: `${posYPercent}%`,
      width: `${boxWidthPx}px`,
      height: `${boxHeightPx}px`,
      transform: `translate(-50%, -50%) rotate(${currentRotation}deg)`,
      transformOrigin: 'center center',
      pointerEvents: 'auto',
    };
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const photoUrl =
      e.dataTransfer.getData('text/plain') ||
      e.dataTransfer.getData('application/photobooth-url');
    if (!photoUrl) return;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const targetSlotIndex = template.slots.findIndex(
      (s) => x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height
    );

    if (targetSlotIndex !== -1 && onDropPhotoOnSlot) {
      onDropPhotoOnSlot(targetSlotIndex, photoUrl);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handleGlobalPointerMove}
      onPointerUp={handleGlobalPointerUp}
      onPointerCancel={handleGlobalPointerUp}
      className={`relative flex flex-col items-center justify-center p-2 select-none ${className}`}
    >
      {/* Studio Preview Container */}
      <div className="relative h-full max-h-[78vh] aspect-[2/3] rounded-3xl overflow-hidden glass-panel-elevated p-2 shadow-2xl border-2 border-white/15">
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="w-full h-full object-contain rounded-2xl shadow-lg touch-none"
        />

        {/* Interactive Bounding Box & Resizer/Rotator/Delete Handles */}
        {activeElement && (activeSticker || activeText) && (
          <div
            style={overlayStyle}
            onPointerDown={(e) => {
              const el = activeSticker || activeText!;
              const { x, y } = getCanvasCoords(e.clientX, e.clientY);
              startInteraction(
                'move',
                activeElement.type,
                el.id,
                x,
                y,
                el.x,
                el.y,
                activeSticker ? activeSticker.scale || 1 : 1,
                activeText ? activeText.fontSize || 34 : 34,
                el.rotation || 0,
                e
              );
            }}
            className="border-2 border-dashed border-amber-400 bg-amber-500/10 rounded-2xl cursor-move touch-none flex items-center justify-center shadow-glow-primary transition-colors"
          >
            {/* Center Drag Hint Icon */}
            <div className="p-2 rounded-full bg-slate-950/60 text-amber-400 pointer-events-none border border-white/20">
              <Move className="w-4 h-4 stroke-[2.5]" />
            </div>

            {/* Live Indicator (Ukuran / Rotasi saat ditarik) */}
            {dragState?.currentValDisplay && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-950/90 text-amber-400 font-mono font-bold text-xs px-2.5 py-1 rounded-full border border-amber-400/50 shadow-lg pointer-events-none whitespace-nowrap">
                {dragState.mode === 'rotate' ? 'Sudut: ' : 'Ukuran: '}
                {dragState.currentValDisplay}
              </div>
            )}

            {/* TOP HANDLE: Rotate Controller (Ikon Pemutar) */}
            <div
              className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer pointer-events-auto touch-manipulation group"
              onPointerDown={(e) => {
                const el = activeSticker || activeText!;
                const { x, y } = getCanvasCoords(e.clientX, e.clientY);
                startInteraction(
                  'rotate',
                  activeElement.type,
                  el.id,
                  x,
                  y,
                  el.x,
                  el.y,
                  activeSticker ? activeSticker.scale || 1 : 1,
                  activeText ? activeText.fontSize || 34 : 34,
                  el.rotation || 0,
                  e
                );
              }}
              title="Tarik melingkar untuk memutar sudut bebas"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl border-2 border-white touch-manipulation active:scale-95 group-hover:scale-105 transition-transform">
                <RotateCw className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="w-0.5 h-3 bg-emerald-400" />
            </div>

            {/* BOTTOM-RIGHT HANDLE: Resizer Controller (Ikon Resizer Perbesar / Perkecil) */}
            <div
              className="absolute -bottom-4 -right-4 w-11 h-11 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xl border-2 border-white cursor-nwse-resize touch-manipulation active:scale-95 hover:scale-105 transition-transform pointer-events-auto group"
              onPointerDown={(e) => {
                const el = activeSticker || activeText!;
                const { x, y } = getCanvasCoords(e.clientX, e.clientY);
                startInteraction(
                  'resize',
                  activeElement.type,
                  el.id,
                  x,
                  y,
                  el.x,
                  el.y,
                  activeSticker ? activeSticker.scale || 1 : 1,
                  activeText ? activeText.fontSize || 34 : 34,
                  el.rotation || 0,
                  e
                );
              }}
              title="Tarik ikon ini untuk memperbesar atau memperkecil bebas"
            >
              <Maximize2 className="w-5 h-5 stroke-[3]" />
            </div>

            {/* TOP-RIGHT HANDLE: Quick Delete Button (Hapus) */}
            <button
              type="button"
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl border-2 border-white cursor-pointer touch-manipulation active:scale-90 hover:scale-105 transition-transform pointer-events-auto"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (activeElement.type === 'sticker' && onDeleteSticker && activeSticker) {
                  onDeleteSticker(activeSticker.id);
                  setActiveElement(null);
                } else if (activeElement.type === 'text' && onDeleteText && activeText) {
                  onDeleteText(activeText.id);
                  setActiveElement(null);
                }
              }}
              title="Hapus Elemen Ini"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
