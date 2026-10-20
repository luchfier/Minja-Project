// frontend/src/types/electron.d.ts
// Typed declaration for window.electronKiosk injected by Electron preload

export interface ElectronKioskAPI {
  isElectron: boolean;
  platform: string;
  exitKiosk: (pin?: string) => Promise<{ success: boolean; message?: string }>;
  toggleFullscreen: () => Promise<boolean>;
  getSystemInfo: () => Promise<{
    platform: string;
    arch: string;
    osVersion: string;
    memory: { totalMB: number; freeMB: number };
    kioskMode: boolean;
  }>;
  onKioskEvent: (channel: string, callback: (...args: any[]) => void) => () => void;
}

declare global {
  interface Window {
    electronKiosk?: ElectronKioskAPI;
  }
}

export {};
