// src/routes/delivery.routes.ts
// Route handler untuk Distribusi Digital (Galeri S3/R2 & Pengiriman WhatsApp)
// Sesuai ARCHITECTURE.md §4.2, §5.1 & THE_NEXT_STEP.md §6

import type { FastifyInstance } from 'fastify';
import { DeliveryService } from '../services/delivery.service.js';
import {
  sendWhatsAppSchema,
  uploadGalleryFileSchema,
} from '../schemas/delivery.schema.js';
import { requireBoothAuth } from '../middleware/auth.middleware.js';
import { sendSuccess } from '../middleware/error.middleware.js';

export async function deliveryRoutes(app: FastifyInstance): Promise<void> {
  const deliveryService = new DeliveryService(app.prisma);

  /**
   * GET /api/sessions/:sessionId/gallery
   * Mengambil tautan galeri privat berbatas waktu (48 jam) & QR code string
   */
  app.get(
    '/api/sessions/:sessionId/gallery',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const gallery = await deliveryService.getOrCreateGallery(sessionId);
      sendSuccess(reply, gallery);
    }
  );

  /**
   * POST /api/sessions/:sessionId/whatsapp
   * Mengirimkan tautan galeri foto langsung ke nomor WhatsApp pelanggan
   */
  app.post(
    '/api/sessions/:sessionId/whatsapp',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const body = sendWhatsAppSchema.parse(request.body);
      const result = await deliveryService.sendWhatsAppNotification(
        sessionId,
        body.phoneNumber
      );
      sendSuccess(reply, result);
    }
  );

  /**
   * POST /api/sessions/:sessionId/gallery/upload
   * Mengunggah file foto atau video ke galeri sesi
   */
  app.post(
    '/api/sessions/:sessionId/gallery/upload',
    { preHandler: [requireBoothAuth] },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const body = uploadGalleryFileSchema.parse(request.body);
      const uploaded = await deliveryService.uploadGalleryFile(
        sessionId,
        body.fileType,
        body.dataUrl,
        body.fileName
      );
      sendSuccess(reply, uploaded, 201);
    }
  );

  /**
   * GET /api/public/gallery/:sessionId
   * Akses publik untuk smartphone pelanggan mengunduh foto
   */
  app.get('/api/public/gallery/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const { token } = (request.query as { token?: string }) || {};

    if (!token) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'TOKEN_REQUIRED',
          message: 'Parameter token verifikasi galeri wajib disertakan.',
        },
      });
    }

    const galleryData = await deliveryService.getPublicGallery(sessionId, token);
    sendSuccess(reply, galleryData);
  });
}
