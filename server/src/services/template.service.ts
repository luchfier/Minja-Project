// src/services/template.service.ts
// Service pengelolaan template foto 4R
// Sesuai API_CONTRACT.md §3.4

import type { PrismaClient } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import type { z } from 'zod';
import type { createTemplateSchema, updateTemplateSchema } from '../schemas/template.schema.js';
import { logAuditEvent } from './audit.service.js';

export class TemplateService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Mengambil template aktif untuk pelanggan / booth
   * GET /api/public/templates dan GET /api/templates
   */
  async getActiveTemplates() {
    return this.prisma.template.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mengambil semua template untuk Admin dengan paginasi
   * GET /api/admin/templates
   */
  async getAllTemplates(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.template.findMany({
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.template.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mengambil template berdasarkan ID
   */
  async getTemplateById(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new AppError(404, ErrorCode.TEMPLATE_NOT_FOUND, 'Template tidak ditemukan');
    }

    return template;
  }

  /**
   * Membuat template baru
   * POST /api/admin/templates
   */
  async createTemplate(
    data: z.infer<typeof createTemplateSchema>,
    adminId?: string,
    ipAddress?: string
  ) {
    const { isDefault: _isDefault, slots, ...prismaData } = data;
    const template = await this.prisma.template.create({
      data: {
        name: prismaData.name,
        thumbnailUrl: prismaData.thumbnailUrl || '',
        frameOverlayUrl: prismaData.frameOverlayUrl,
        orientation: prismaData.orientation || 'portrait',
        slotsCount: prismaData.slotsCount ?? (slots?.length || 1),
        slots: (slots as any) || [],
        isActive: prismaData.isActive ?? true,
      },
    });

    await logAuditEvent(this.prisma, {
      action: 'TEMPLATE_CREATED',
      adminId,
      ipAddress,
      details: { templateId: template.id, name: template.name },
    });

    return template;
  }

  /**
   * Memperbarui template yang ada
   * PUT /api/admin/templates/:id
   */
  async updateTemplate(
    id: string,
    data: z.infer<typeof updateTemplateSchema>,
    adminId?: string,
    ipAddress?: string
  ) {
    await this.getTemplateById(id);

    // Filter out virtual/client fields like isDefault that don't exist on Prisma Template model
    const { isDefault: _isDefault, slots, ...prismaData } = data;

    const updated = await this.prisma.template.update({
      where: { id },
      data: {
        ...prismaData,
        slots: slots ? (slots as any) : undefined,
      },
    });

    await logAuditEvent(this.prisma, {
      action: 'TEMPLATE_UPDATED',
      adminId,
      ipAddress,
      details: { templateId: id, changedFields: Object.keys(data) },
    });

    return updated;
  }

  /**
   * Menghapus template secara permanen
   * DELETE /api/admin/templates/:id
   */
  async deleteTemplate(id: string, adminId?: string, ipAddress?: string) {
    const template = await this.getTemplateById(id);

    // Unlink any sessions referencing this template to prevent foreign key errors
    await this.prisma.session.updateMany({
      where: { templateId: id },
      data: { templateId: null },
    });

    await this.prisma.template.delete({
      where: { id },
    });

    await logAuditEvent(this.prisma, {
      action: 'TEMPLATE_DELETED',
      adminId,
      ipAddress,
      details: { templateId: id, name: template.name },
    });

    return { success: true, message: 'Template berhasil dihapus permanen' };
  }
}
