// src/services/session.service.ts
// Service manajemen Sesi Pelanggan (Sessions)
// Sesuai ARCHITECTURE.md §6.3 & API_CONTRACT.md §3.5

import type { PrismaClient, SessionState } from '@prisma/client';
import { AppError, ErrorCode } from '../types/common.types.js';
import type {
  CreateSessionInput,
  UpdateSessionStateInput,
  CompleteSessionInput,
} from '../schemas/session.schema.js';

export interface SessionDto {
  id: string;
  packageId: string;
  packageName: string;
  state: SessionState;
  basePrice: number;
  additionalPrints: number;
  additionalPrintCost: number;
  totalPrice: number;
  maxShots: number;
  maxSelections: number;
  totalPrints: number;
  durationSeconds: number;
  shotsTaken: number;
  photosSelected: number;
  photosPrinted: number;
  createdAt: string;
  expiresAt: string;
  payment?: {
    orderId: string;
    grossAmount: number;
    transactionStatus: string;
    qrString?: string | null;
  } | null;
}

export class SessionService {
  constructor(private prisma: PrismaClient) {}

  private mapToDto(session: any): SessionDto {
    return {
      id: session.id,
      packageId: session.packageId,
      packageName: session.package?.name || 'Paket Foto',
      state: session.state,
      basePrice: session.basePrice,
      additionalPrints: session.additionalPrints,
      additionalPrintCost: session.additionalPrintCost,
      totalPrice: session.totalPrice,
      maxShots: session.maxShots,
      maxSelections: session.maxSelections,
      totalPrints: session.totalPrints,
      durationSeconds: session.durationSeconds,
      shotsTaken: session.shotsTaken,
      photosSelected: session.photosSelected,
      photosPrinted: session.photosPrinted,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      payment: Array.isArray(session.payments) && session.payments.length > 0
        ? {
            orderId: session.payments[session.payments.length - 1].orderId,
            grossAmount: session.payments[session.payments.length - 1].grossAmount,
            transactionStatus: session.payments[session.payments.length - 1].transactionStatus,
            qrString: session.payments[session.payments.length - 1].qrString,
          }
        : session.payment
        ? {
            orderId: session.payment.orderId,
            grossAmount: session.payment.grossAmount,
            transactionStatus: session.payment.transactionStatus,
            qrString: session.payment.qrString,
          }
        : null,
    };
  }

  /**
   * Membuat sesi baru berdasarkan paket yang dipilih pelanggan
   */
  async createSession(input: CreateSessionInput): Promise<SessionDto> {
    const pkg = await this.prisma.package.findUnique({
      where: { id: input.packageId },
    });

    if (!pkg) {
      throw new AppError(404, ErrorCode.PACKAGE_NOT_FOUND, 'Paket foto tidak ditemukan');
    }

    if (!pkg.isActive) {
      throw new AppError(400, ErrorCode.PACKAGE_INACTIVE, 'Paket foto sedang tidak aktif');
    }

    const additionalPrints = input.additionalPrints || 0;
    const additionalPrintCost = additionalPrints * pkg.additionalPrintPrice;
    const totalPrice = pkg.price + additionalPrintCost;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

    const session = await this.prisma.session.create({
      data: {
        packageId: pkg.id,
        state: 'AWAITING_PAYMENT',
        basePrice: pkg.price,
        additionalPrints,
        additionalPrintCost,
        totalPrice,
        maxShots: pkg.maxShots,
        maxSelections: pkg.maxSelections,
        totalPrints: pkg.defaultPrints + additionalPrints,
        durationSeconds: pkg.durationSeconds,
        expiresAt,
      },
      include: {
        package: true,
        payments: true,
      },
    });

    return this.mapToDto(session);
  }

  /**
   * Mengambil detail sesi berdasarkan ID
   */
  async getSession(id: string): Promise<SessionDto> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        package: true,
        payments: true,
        template: true,
      },
    });

    if (!session) {
      throw new AppError(404, ErrorCode.SESSION_NOT_FOUND, 'Sesi tidak ditemukan');
    }

    return this.mapToDto(session);
  }

  /**
   * Mengambil sesi aktif saat ini di booth
   */
  async getActiveSession(): Promise<SessionDto | null> {
    const session = await this.prisma.session.findFirst({
      where: {
        state: {
          notIn: ['COMPLETED', 'CANCELLED', 'EXPIRED'],
        },
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        package: true,
        payments: true,
      },
    });

    return session ? this.mapToDto(session) : null;
  }

  /**
   * Update state lifecycle sesi
   */
  async updateSessionState(id: string, input: UpdateSessionStateInput): Promise<SessionDto> {
    const existing = await this.prisma.session.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, ErrorCode.SESSION_NOT_FOUND, 'Sesi tidak ditemukan');
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        state: input.state as SessionState,
        shotsTaken: input.shotsTaken !== undefined ? input.shotsTaken : undefined,
        photosSelected: input.photosSelected !== undefined ? input.photosSelected : undefined,
      },
      include: {
        package: true,
        payments: true,
      },
    });

    return this.mapToDto(updated);
  }

  /**
   * Menyelesaikan sesi foto
   */
  async completeSession(id: string, input: CompleteSessionInput): Promise<SessionDto> {
    const existing = await this.prisma.session.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, ErrorCode.SESSION_NOT_FOUND, 'Sesi tidak ditemukan');
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        state: 'COMPLETED',
        completedAt: new Date(),
        shotsTaken: input.shotsTaken,
        photosSelected: input.photosSelected,
        photosPrinted: input.photosPrinted,
      },
      include: {
        package: true,
        payments: true,
      },
    });

    return this.mapToDto(updated);
  }

  /**
   * Membatalkan sesi
   */
  async cancelSession(id: string, reason?: string): Promise<SessionDto> {
    const existing = await this.prisma.session.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, ErrorCode.SESSION_NOT_FOUND, 'Sesi tidak ditemukan');
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        state: 'CANCELLED',
        cancelReason: reason || 'Dibatalkan oleh pengguna',
      },
      include: {
        package: true,
        payments: true,
      },
    });

    return this.mapToDto(updated);
  }
}
