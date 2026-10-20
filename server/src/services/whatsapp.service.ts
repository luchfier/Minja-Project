// src/services/whatsapp.service.ts
// Service Integrasi WhatsApp Business Cloud API (Meta Graph API)
// Sesuai ARCHITECTURE.md §5.1 & THE_NEXT_STEP.md §6.2

import { getEnv } from '../config/env.js';
import { AppError, ErrorCode } from '../types/common.types.js';

export interface WhatsAppSendResult {
  sent: boolean;
  messageId: string;
  recipientPhone: string;
  isSimulated: boolean;
}

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private isConfigured: boolean;

  constructor() {
    const env = getEnv();
    this.accessToken = env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.isConfigured =
      this.accessToken.trim().length > 0 && this.phoneNumberId.trim().length > 0;
  }

  public isLiveApiConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Menormalisasi nomor telepon Indonesia ke format standar internasional (628xxx)
   */
  public sanitizePhoneNumber(raw: string): string {
    let clean = raw.replace(/[^0-9]/g, '');

    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    }

    if (clean.length < 10 || clean.length > 16) {
      throw new AppError(
        400,
        ErrorCode.WHATSAPP_INVALID_PHONE,
        `Nomor telepon '${raw}' tidak valid. Masukkan nomor WhatsApp aktif (contoh: 08123456789).`
      );
    }

    return clean;
  }

  /**
   * Mengirim pesan template / tautan unduhan galeri foto ke pelanggan via WhatsApp
   */
  async sendGalleryNotification(
    rawPhone: string,
    galleryUrl: string,
    boothName = 'Minja Photobooth'
  ): Promise<WhatsAppSendResult> {
    const recipientPhone = this.sanitizePhoneNumber(rawPhone);

    const messageBody =
      `Halo Kak! ✨\n\n` +
      `Terima kasih sudah mengabadikan momen istimewa di *${boothName}*! 📸🎉\n\n` +
      `Foto kenangan, GIF animasi, dan Live Motion Anda sudah siap diunduh di tautan resmi berikut:\n` +
      `🔗 ${galleryUrl}\n\n` +
      `_Catatan: Tautan ini aktif selama 48 jam. Segera simpan foto ke galeri smartphone Anda._`;

    // 1. Fallback Simulasi jika token Meta WhatsApp belum diisi (Mode Development / Testing)
    if (!this.isConfigured || process.env['NODE_ENV'] === 'test') {
      const simMessageId = `wa_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      console.log(`[WhatsAppService:Simulated] Pesan terkirim ke +${recipientPhone}:`);
      console.log(messageBody);

      return {
        sent: true,
        messageId: simMessageId,
        recipientPhone,
        isSimulated: true,
      };
    }

    // 2. Kirim pesan sesungguhnya via Meta Graph API v21.0
    const endpoint = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: messageBody,
          },
        }),
        signal: AbortSignal.timeout(10000), // 10 detik timeout
      });

      const data = (await response.json()) as any;

      if (!response.ok || data.error) {
        throw new AppError(
          500,
          ErrorCode.WHATSAPP_DELIVERY_FAILED,
          `Gagal mengirim WhatsApp via Meta API: ${data.error?.message || response.statusText}`,
          { metaError: data.error }
        );
      }

      const messageId =
        Array.isArray(data.messages) && data.messages[0]?.id
          ? data.messages[0].id
          : `wa_${Date.now()}`;

      return {
        sent: true,
        messageId,
        recipientPhone,
        isSimulated: false,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        500,
        ErrorCode.WHATSAPP_DELIVERY_FAILED,
        `Koneksi ke WhatsApp Cloud API gagal: ${err.message}`,
        { error: err }
      );
    }
  }
}
