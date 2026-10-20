// src/services/delivery.service.ts
// Service Orkestrasi Distribusi Digital (Galeri Berbatas Waktu & WhatsApp API)
// Sesuai ARCHITECTURE.md §4.2, §6.3 & THE_NEXT_STEP.md §6

import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { StorageService } from './storage.service.js';
import { WhatsAppService } from './whatsapp.service.js';
import { AppError, ErrorCode } from '../types/common.types.js';

export interface GalleryDetails {
  galleryId: string;
  sessionId: string;
  qrString: string;
  galleryUrl: string;
  token: string;
  expiresAt: string;
  accessCount: number;
}

export class DeliveryService {
  constructor(
    private prisma: PrismaClient,
    private storageService: StorageService = new StorageService(),
    private whatsappService: WhatsAppService = new WhatsAppService()
  ) {}

  /**
   * Membuat atau mengambil galeri privat berbatas waktu (48 jam) untuk sebuah sesi
   */
  async getOrCreateGallery(sessionId: string): Promise<GalleryDetails> {
    const existing = await this.prisma.gallery.findUnique({
      where: { sessionId },
    });

    if (existing) {
      const galleryUrl = `https://gallery.minjaphotobooth.com/s/${sessionId}?token=${existing.token}`;
      return {
        galleryId: existing.id,
        sessionId: existing.sessionId,
        qrString: galleryUrl,
        galleryUrl,
        token: existing.token,
        expiresAt: existing.expiresAt.toISOString(),
        accessCount: existing.accessCount,
      };
    }

    // Pastikan session ada di database sebelum membuat Gallery (mencegah foreign key constraint error)
    const sessionExists = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!sessionExists) {
      let pkg = await this.prisma.package.findFirst();
      if (!pkg) {
        pkg = await this.prisma.package.create({
          data: {
            name: 'Paket Photobooth Standar',
            price: 50000,
            durationSeconds: 180,
            maxShots: 6,
            maxSelections: 3,
            defaultPrints: 2,
            additionalPrintPrice: 15000,
          },
        });
      }

      await this.prisma.session.create({
        data: {
          id: sessionId,
          packageId: pkg.id,
          basePrice: pkg.price,
          totalPrice: pkg.price,
          maxShots: pkg.maxShots,
          maxSelections: pkg.maxSelections,
          totalPrints: pkg.defaultPrints,
          durationSeconds: pkg.durationSeconds,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });
    }

    // Buat token kriptografis unik 32 karakter (crypto-secure)
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000); // 48 jam

    const created = await this.prisma.gallery.create({
      data: {
        sessionId,
        token,
        expiresAt,
      },
    });

    const galleryUrl = `https://gallery.minjaphotobooth.com/s/${sessionId}?token=${token}`;

    return {
      galleryId: created.id,
      sessionId: created.sessionId,
      qrString: galleryUrl,
      galleryUrl,
      token: created.token,
      expiresAt: created.expiresAt.toISOString(),
      accessCount: created.accessCount,
    };
  }

  /**
   * Mengirimkan notifikasi tautan unduhan galeri foto via WhatsApp
   */
  async sendWhatsAppNotification(
    sessionId: string,
    phoneNumber: string
  ): Promise<{ sent: boolean; messageId: string }> {
    const gallery = await this.getOrCreateGallery(sessionId);

    // Ambil nama booth dari settings jika ada
    const settings = await this.prisma.settings.findFirst();
    const boothName = settings?.boothName || 'Minja Photobooth';

    const sendRes = await this.whatsappService.sendGalleryNotification(
      phoneNumber,
      gallery.galleryUrl,
      boothName
    );

    // Catat DeliveryJob ke database untuk audit pengiriman
    try {
      await this.prisma.deliveryJob.create({
        data: {
          sessionId,
          galleryId: gallery.galleryId,
          channel: 'whatsapp',
          phoneNumber: sendRes.recipientPhone,
          status: 'sent',
          messageId: sendRes.messageId,
          sentAt: new Date(),
        },
      });
    } catch (err) {
      console.warn('[DeliveryService] Gagal menyimpan DeliveryJob ke Prisma:', err);
    }

    return {
      sent: true,
      messageId: sendRes.messageId,
    };
  }

  /**
   * Mengunggah file foto atau video ke penyimpanan galeri
   */
  async uploadGalleryFile(
    sessionId: string,
    fileType: 'layout_4r' | 'gif' | 'live_video' | 'raw_photo',
    dataUrl: string,
    customName?: string
  ): Promise<{ url: string; sizeBytes: number }> {
    const ext = fileType === 'gif' ? 'gif' : fileType === 'live_video' ? 'mp4' : 'jpg';
    const fileName = customName || `${fileType}_${Date.now()}.${ext}`;
    const mimeType =
      ext === 'gif' ? 'image/gif' : ext === 'mp4' ? 'video/mp4' : 'image/jpeg';

    const result = await this.storageService.uploadFile(
      sessionId,
      fileName,
      dataUrl,
      mimeType
    );

    return {
      url: result.publicUrl,
      sizeBytes: result.sizeBytes,
    };
  }

  /**
   * Akses publik untuk smartphone pelanggan mengunduh foto dari galeri
   */
  async getPublicGallery(
    sessionId: string,
    token: string
  ): Promise<{
    sessionCode: string;
    expiresAt: string;
    isExpired: boolean;
    files: string[];
    accessCount: number;
  }> {
    const gallery = await this.prisma.gallery.findUnique({
      where: { sessionId },
      include: {
        session: true,
      },
    });

    if (!gallery || gallery.token !== token) {
      throw new AppError(
        404,
        ErrorCode.GALLERY_TOKEN_INVALID,
        'Tautan galeri tidak valid atau token verifikasi salah.'
      );
    }

    const isExpired = new Date() > gallery.expiresAt;
    if (isExpired) {
      throw new AppError(
        410,
        ErrorCode.GALLERY_EXPIRED,
        'Masa aktif tautan galeri foto telah berakhir (maksimal 48 jam).'
      );
    }

    // Update access count
    await this.prisma.gallery.update({
      where: { id: gallery.id },
      data: { accessCount: { increment: 1 } },
    });

    const files = await this.storageService.listSessionFiles(sessionId);

    return {
      sessionCode: gallery.session.id.slice(-5).toUpperCase(),
      expiresAt: gallery.expiresAt.toISOString(),
      isExpired: false,
      files,
      accessCount: gallery.accessCount + 1,
    };
  }
}
