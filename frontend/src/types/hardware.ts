export type DeviceConnectionStatus = 'connected' | 'demo' | 'disconnected' | 'busy' | 'error';

export interface CameraDeviceInfo {
  id: string;
  name: string;
  type: 'webcam' | 'virtual' | 'dslr' | 'external';
  status: DeviceConnectionStatus;
  isDefault: boolean;
  resolution?: string;
}

export interface PrinterSettingsConfig {
  borderless: boolean;
  orientation: 'portrait' | 'landscape' | 'auto';
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  colorMode: 'color' | 'grayscale' | 'vivid';
  autoCut: boolean;
  dpi: number;
  customPaperName?: string;
  customPaperWidthMm?: number;
  customPaperHeightMm?: number;
  printQuality?: 'standard' | 'high' | 'photo_fine' | 'ultra_glossy';
  mediaType?: 'glossy' | 'luster' | 'matte' | 'plain';
  sharpening?: 'off' | 'low' | 'medium' | 'high';
  brightnessOffset?: number;
  contrastOffset?: number;
}

export interface PrinterCustomConfig {
  printerName: string;
  displayName?: string;
  paperSize: string;
  isDefault: boolean;
  isActive: boolean;
  settings: PrinterSettingsConfig;
}

export interface PrinterInfo {
  id: string;
  name: string;
  displayName?: string;
  isDefault: boolean;
  status: DeviceConnectionStatus;
  paperStatus?: 'ready' | 'low' | 'empty';
  ribbonStatus?: 'ready' | 'low' | 'empty';
  supportedSizes?: string[]; // e.g. ["4R", "2x6"]
  paperSize?: string;
  settings?: PrinterSettingsConfig;
}

export interface PrintJobParams {
  sessionId: string;
  copies: number;
  layoutImageUrl: string;
}

export interface PrintJobResult {
  jobId: string;
  status: 'queued' | 'printing' | 'completed' | 'failed';
  message?: string;
}
