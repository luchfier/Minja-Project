// electron/preload.ts
// Preload Script untuk Komunikasi Aman Antara Renderer (React) & Main Process (Node.js)
// Sesuai ARCHITECTURE.md §4.3 & SECURITY.md §7

import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronKioskBridge {
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

const kioskBridge: ElectronKioskBridge = {
  isElectron: true,
  platform: process.platform,

  exitKiosk: (pin?: string) => {
    return ipcRenderer.invoke('kiosk:exit', pin);
  },

  toggleFullscreen: () => {
    return ipcRenderer.invoke('kiosk:toggle-fullscreen');
  },

  getSystemInfo: () => {
    return ipcRenderer.invoke('kiosk:get-system-info');
  },

  onKioskEvent: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['kiosk:status', 'kiosk:admin-prompt'];
    if (validChannels.includes(channel)) {
      const subscription = (_event: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    return () => {};
  },
};

// Expose context safely into window object with contextIsolation: true
contextBridge.exposeInMainWorld('electronKiosk', kioskBridge);
