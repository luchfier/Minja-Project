export type FilterPreset = 
  | 'normal'
  | 'bw'
  | 'sepia'
  | 'warm'
  | 'cool'
  | 'glamour';

export interface StickerElement {
  id: string;
  name: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface TextElement {
  id: string;
  text: string;
  fontFamily: string;
  color: string;
  fontSize: number;
  x: number;
  y: number;
  rotation: number;
}

export interface PhotoAdjustment {
  brightness: number; // -100 to 100, default 0
  contrast: number;   // -100 to 100, default 0
  rotation: number;   // 0, 90, 180, 270
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface SlotAdjustment {
  zoom: number;       // 1.0 to 2.5, default 1.0
  panX: number;       // horizontal crop offset in px
  panY: number;       // vertical crop offset in px
  rotation: number;   // 0, 90, 180, 270
  brightness: number; // -100 to 100, default 0
  contrast: number;   // -100 to 100, default 0
  filter?: FilterPreset; // optional per-slot filter override
}

export interface EditorComposition {
  templateId: string;
  photoSlotMappings: Record<string, { photoId: string; adjustments: PhotoAdjustment }>;
  filter: FilterPreset;
  slotAdjustments?: Record<number, SlotAdjustment>;
  stickers: StickerElement[];
  texts: TextElement[];
}
