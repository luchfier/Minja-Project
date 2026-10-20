// src/services/package.service.ts
// Service manajemen paket foto (Packages)
// Sesuai API_CONTRACT.md §3.3

import type { PrismaClient } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import type { z } from 'zod';
import type { createPackageSchema, updatePackageSchema } from '../schemas/package.schema.js';
import { logAuditEvent } from './audit.service.js';

export class PackageService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Mengambil daftar paket aktif untuk pelanggan / booth
   * GET /api/public/packages dan GET /api/packages
   */
  async getActivePackages() {
    return this.prisma.package.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Mengambil semua paket (termasuk nonaktif) dengan paginasi untuk Admin
   * GET /api/admin/packages
   */
  async getAllPackages(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.package.findMany({
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.package.count(),
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
   * Mengambil detail paket berdasarkan ID
   */
  async getPackageById(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
    });

    if (!pkg) {
      throw new AppError(404, ErrorCode.PACKAGE_NOT_FOUND, 'Paket tidak ditemukan');
    }

    return pkg;
  }

  /**
   * Membuat paket baru
   * POST /api/admin/packages
   */
  async createPackage(
    data: z.infer<typeof createPackageSchema>,
    adminId?: string,
    ipAddress?: string
  ) {
    // Cek duplikasi nama di antara paket aktif
    const existing = await this.prisma.package.findFirst({
      where: { name: data.name, isActive: true },
    });

    if (existing) {
      throw new AppError(
        409,
        ErrorCode.CONFLICT,
        `Paket dengan nama '${data.name}' sudah ada dan sedang aktif`
      );
    }

    const pkg = await this.prisma.package.create({
      data,
    });

    await logAuditEvent(this.prisma, {
      action: 'PACKAGE_CREATED',
      adminId,
      ipAddress,
      details: { packageId: pkg.id, name: pkg.name, price: pkg.price },
    });

    return pkg;
  }

  /**
   * Memperbarui paket
   * PUT /api/admin/packages/:id
   */
  async updatePackage(
    id: string,
    data: z.infer<typeof updatePackageSchema>,
    adminId?: string,
    ipAddress?: string
  ) {
    const existing = await this.getPackageById(id);

    if (data.name && data.name !== existing.name) {
      const duplicate = await this.prisma.package.findFirst({
        where: { name: data.name, isActive: true, id: { not: id } },
      });

      if (duplicate) {
        throw new AppError(
          409,
          ErrorCode.CONFLICT,
          `Paket aktif lain dengan nama '${data.name}' sudah ada`
        );
      }
    }

    // Validasi konsistensi selections & shots jika diubah
    const maxShots = data.maxShots ?? existing.maxShots;
    const maxSelections = data.maxSelections ?? existing.maxSelections;
    const defaultPrints = data.defaultPrints ?? existing.defaultPrints;

    if (maxSelections > maxShots) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Maksimal foto terpilih (maxSelections) tidak boleh melebihi maxShots'
      );
    }

    if (defaultPrints > maxSelections) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Jumlah cetak default tidak boleh melebihi maxSelections'
      );
    }

    const updated = await this.prisma.package.update({
      where: { id },
      data,
    });

    await logAuditEvent(this.prisma, {
      action: 'PACKAGE_UPDATED',
      adminId,
      ipAddress,
      details: { packageId: id, changedFields: Object.keys(data) },
    });

    return updated;
  }

  /**
   * Menonaktifkan paket (soft delete)
   * DELETE /api/admin/packages/:id
   */
  async deactivatePackage(id: string, adminId?: string, ipAddress?: string) {
    await this.getPackageById(id);

    const updated = await this.prisma.package.update({
      where: { id },
      data: { isActive: false },
    });

    await logAuditEvent(this.prisma, {
      action: 'PACKAGE_DEACTIVATED',
      adminId,
      ipAddress,
      details: { packageId: id, name: updated.name },
    });

    return { message: 'Paket dinonaktifkan' };
  }
}
