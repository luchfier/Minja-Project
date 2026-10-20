export interface PhotoSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  layerIndex: number;
}

export interface TemplateItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  frameUrl: string; // PNG overlay
  layoutType: '4R_PORTRAIT' | '4R_LANDSCAPE' | 'STRIP_2x6' | 'CUSTOM';
  width: number;  // 1200 or 1800 px at 300 DPI
  height: number; // 1800 or 1200 px at 300 DPI
  slots: PhotoSlot[];
  isActive: boolean;
  isDefault?: boolean;
}
