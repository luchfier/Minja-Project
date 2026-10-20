// src/services/asset.service.ts
// Service pengelolaan Aset Kreatif Kiosk: Font Tipografi & Stiker (PNG / Emoji)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FontItem {
  id: string;
  name: string;
  fontFamily: string;
  googleFont?: string;
  previewText?: string;
  isCustom?: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface StickerItem {
  id: string;
  name: string;
  category: string;
  type: 'emoji' | 'image';
  url: string; // Emoji character OR data URL / image link
  isActive: boolean;
  createdAt: string;
}

const DEFAULT_FONTS: FontItem[] = [
  {
    id: 'plus-jakarta-sans',
    name: 'Modern Studio',
    fontFamily: 'Plus Jakarta Sans',
    googleFont: 'Plus Jakarta Sans:wght@400;700;800',
    previewText: 'Modern Studio',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'playfair-display',
    name: 'Playfair Elegan',
    fontFamily: 'Playfair Display',
    googleFont: 'Playfair Display:ital,wght@0,600;0,800;1,600',
    previewText: 'Elegan & Anggun',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dancing-script',
    name: 'Dancing Script',
    fontFamily: 'Dancing Script',
    googleFont: 'Dancing Script:wght@700',
    previewText: 'Tulisan Sambung',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'montserrat',
    name: 'Montserrat Bold',
    fontFamily: 'Montserrat',
    googleFont: 'Montserrat:wght@800;900',
    previewText: 'Tegas & Modern',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pacifico',
    name: 'Pacifico Fun',
    fontFamily: 'Pacifico',
    googleFont: 'Pacifico',
    previewText: 'Ceria & Santai',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'oswald',
    name: 'Oswald Solid',
    fontFamily: 'Oswald',
    googleFont: 'Oswald:wght@700',
    previewText: 'Statement Kuat',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'caveat',
    name: 'Caveat Santai',
    fontFamily: 'Caveat',
    googleFont: 'Caveat:wght@700',
    previewText: 'Coretan Alami',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cinzel',
    name: 'Cinzel Klasik',
    fontFamily: 'Cinzel',
    googleFont: 'Cinzel:wght@700',
    previewText: 'Klasik Istimewa',
    isCustom: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_STICKERS: StickerItem[] = [
  { id: 'stk-heart', name: 'Red Heart', category: 'Emoji', type: 'emoji', url: '❤️', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-sparkles', name: 'Sparkles', category: 'Emoji', type: 'emoji', url: '✨', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-cool', name: 'Cool Sunglasses', category: 'Emoji', type: 'emoji', url: '😎', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-party', name: 'Party Popper', category: 'Emoji', type: 'emoji', url: '🎉', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-crown', name: 'Gold Crown', category: 'Emoji', type: 'emoji', url: '👑', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-camera', name: 'Vintage Camera', category: 'Emoji', type: 'emoji', url: '📷', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-butterfly', name: 'Butterfly', category: 'Emoji', type: 'emoji', url: '🦋', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-ribbon', name: 'Pink Ribbon', category: 'Emoji', type: 'emoji', url: '🎀', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-flame', name: 'Flame Hits', category: 'Emoji', type: 'emoji', url: '🔥', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-peace', name: 'Peace Sign', category: 'Emoji', type: 'emoji', url: '✌️', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-flower', name: 'Cherry Blossom', category: 'Emoji', type: 'emoji', url: '🌸', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-cake', name: 'Birthday Cake', category: 'Emoji', type: 'emoji', url: '🎂', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-star', name: 'Gold Star', category: 'Emoji', type: 'emoji', url: '⭐', isActive: true, createdAt: new Date().toISOString() },
  { id: 'stk-celebrate', name: 'Partying Face', category: 'Emoji', type: 'emoji', url: '🥳', isActive: true, createdAt: new Date().toISOString() },
];

export class AssetService {
  private storageDir: string;
  private fontsFile: string;
  private stickersFile: string;

  constructor() {
    this.storageDir = path.resolve(__dirname, '../../storage/assets');
    this.fontsFile = path.join(this.storageDir, 'fonts.json');
    this.stickersFile = path.join(this.storageDir, 'stickers.json');

    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    if (!fs.existsSync(this.fontsFile)) {
      fs.writeFileSync(this.fontsFile, JSON.stringify(DEFAULT_FONTS, null, 2), 'utf8');
    }

    if (!fs.existsSync(this.stickersFile)) {
      fs.writeFileSync(this.stickersFile, JSON.stringify(DEFAULT_STICKERS, null, 2), 'utf8');
    }
  }

  // =================== FONTS ===================

  async getFonts(includeInactive = false): Promise<FontItem[]> {
    try {
      this.ensureInitialized();
      const content = fs.readFileSync(this.fontsFile, 'utf8');
      const list: FontItem[] = JSON.parse(content);
      return includeInactive ? list : list.filter((f) => f.isActive);
    } catch {
      return DEFAULT_FONTS;
    }
  }

  async createFont(data: {
    name: string;
    fontFamily: string;
    googleFont?: string;
    previewText?: string;
  }): Promise<FontItem> {
    const list = await this.getFonts(true);
    const id = `fnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newFont: FontItem = {
      id,
      name: data.name.trim(),
      fontFamily: data.fontFamily.trim(),
      googleFont: data.googleFont?.trim() || undefined,
      previewText: data.previewText?.trim() || data.name.trim(),
      isCustom: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    list.push(newFont);
    fs.writeFileSync(this.fontsFile, JSON.stringify(list, null, 2), 'utf8');
    return newFont;
  }

  async deleteFont(id: string): Promise<boolean> {
    const list = await this.getFonts(true);
    const filtered = list.filter((f) => f.id !== id);
    if (filtered.length === list.length) return false;
    fs.writeFileSync(this.fontsFile, JSON.stringify(filtered, null, 2), 'utf8');
    return true;
  }

  async toggleFont(id: string): Promise<FontItem | null> {
    const list = await this.getFonts(true);
    const item = list.find((f) => f.id === id);
    if (!item) return null;
    item.isActive = !item.isActive;
    fs.writeFileSync(this.fontsFile, JSON.stringify(list, null, 2), 'utf8');
    return item;
  }

  // =================== STICKERS ===================

  async getStickers(includeInactive = false): Promise<StickerItem[]> {
    try {
      this.ensureInitialized();
      const content = fs.readFileSync(this.stickersFile, 'utf8');
      const list: StickerItem[] = JSON.parse(content);
      return includeInactive ? list : list.filter((s) => s.isActive);
    } catch {
      return DEFAULT_STICKERS;
    }
  }

  async createSticker(data: {
    name: string;
    category?: string;
    type: 'emoji' | 'image';
    url: string;
  }): Promise<StickerItem> {
    const list = await this.getStickers(true);
    const id = `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSticker: StickerItem = {
      id,
      name: data.name.trim(),
      category: data.category?.trim() || (data.type === 'image' ? 'PNG Kustom' : 'Emoji'),
      type: data.type,
      url: data.url.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    list.push(newSticker);
    fs.writeFileSync(this.stickersFile, JSON.stringify(list, null, 2), 'utf8');
    return newSticker;
  }

  async deleteSticker(id: string): Promise<boolean> {
    const list = await this.getStickers(true);
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length === list.length) return false;
    fs.writeFileSync(this.stickersFile, JSON.stringify(filtered, null, 2), 'utf8');
    return true;
  }

  async toggleSticker(id: string): Promise<StickerItem | null> {
    const list = await this.getStickers(true);
    const item = list.find((s) => s.id === id);
    if (!item) return null;
    item.isActive = !item.isActive;
    fs.writeFileSync(this.stickersFile, JSON.stringify(list, null, 2), 'utf8');
    return item;
  }
}
