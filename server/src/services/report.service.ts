// src/services/report.service.ts
// Service Laporan Transaksi, Finansial, dan Kasir Tunai
// Sesuai API_CONTRACT.md §3.6 & §3.12

import type { PrismaClient } from '@prisma/client';

export class ReportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Mengambil ringkasan metrik finansial & performa booth
   */
  async getReportsSummary(): Promise<{
    totalRevenue: number;
    totalSessions: number;
    completedSessions: number;
    failedSessions: number;
    totalPrints: number;
    averageSessionDurationSeconds: number;
    qrisRevenue: number;
    cashRevenue: number;
    totalDiscountGiven: number;
  }> {
    const [settledPayments, sessions] = await Promise.all([
      this.prisma.payment.findMany({
        where: { transactionStatus: 'settlement' },
      }),
      this.prisma.session.findMany(),
    ]);

    let totalRevenue = 0;
    let qrisRevenue = 0;
    let cashRevenue = 0;

    for (const p of settledPayments) {
      totalRevenue += p.grossAmount;
      if (p.paymentType === 'cash') {
        cashRevenue += p.grossAmount;
      } else {
        qrisRevenue += p.grossAmount;
      }
    }

    const totalSessions = sessions.length;
    let completedSessions = 0;
    let failedSessions = 0;
    let totalPrints = 0;
    let totalDuration = 0;

    for (const s of sessions) {
      totalPrints += s.totalPrints;
      totalDuration += s.durationSeconds;
      if (s.state === 'COMPLETED' || s.state === 'SHARING') {
        completedSessions++;
      } else if (s.state === 'CANCELLED' || s.state === 'EXPIRED') {
        failedSessions++;
      }
    }

    const avgDuration =
      totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 180;

    return {
      totalRevenue,
      totalSessions,
      completedSessions,
      failedSessions,
      totalPrints,
      averageSessionDurationSeconds: avgDuration,
      qrisRevenue,
      cashRevenue,
      totalDiscountGiven: 0,
    };
  }

  /**
   * Mengambil daftar transaksi pembayaran berpaginasi
   */
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params?.page ? Math.max(1, params.page) : 1;
    const limit = params?.limit ? Math.min(100, Math.max(1, params.limit)) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            include: { package: true },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const items = payments.map((p) => {
      const isExtra = p.orderId.includes('-EXT-');
      const pkgName = isExtra
        ? 'Tambahan Cetak Foto'
        : p.session?.package?.name || 'Paket Foto Studio';

      return {
        id: p.id,
        orderId: p.orderId,
        sessionCode: 'MJ-' + (p.sessionId.slice(-4) || '8888').toUpperCase(),
        packageName: pkgName,
        paymentMethod: (p.paymentType === 'cash' ? 'cash' : 'qris') as 'cash' | 'qris',
        subtotal: p.grossAmount,
        voucherCode: undefined,
        discountAmount: 0,
        grossAmount: p.grossAmount,
        additionalPrints: p.session?.additionalPrints || 0,
        status: p.transactionStatus,
        paymentType: p.paymentType === 'cash' ? 'Tunai / Kasir' : 'QRIS Midtrans',
        createdAt: p.createdAt.toISOString(),
        settlementTime: p.settlementTime ? p.settlementTime.toISOString() : undefined,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Mengekspor laporan transaksi ke format CSV
   */
  async exportTransactionsCsv(params?: { startDate?: string; endDate?: string }): Promise<string> {
    const { items } = await this.getTransactions({ page: 1, limit: 1000, ...params });

    const header = [
      'Order ID',
      'Kode Sesi',
      'Paket',
      'Metode Bayar',
      'Nominal (Rp)',
      'Status',
      'Tanggal Dibuat',
      'Waktu Pelunasan',
    ].join(',');

    const rows = items.map((t) =>
      [
        `"${t.orderId}"`,
        `"${t.sessionCode}"`,
        `"${t.packageName}"`,
        `"${t.paymentType}"`,
        t.grossAmount,
        `"${t.status}"`,
        `"${t.createdAt}"`,
        `"${t.settlementTime || '-'}"`,
      ].join(',')
    );

    return [header, ...rows].join('\n');
  }

  /**
   * Mengambil antrean transaksi tunai yang menunggu konfirmasi kasir
   */
  async getCashPendingTransactions(): Promise<any[]> {
    const pendings = await this.prisma.payment.findMany({
      where: {
        paymentType: 'cash',
        transactionStatus: 'pending',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          include: { package: true },
        },
      },
    });

    return pendings.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      sessionCode: 'MJ-' + (p.sessionId.slice(-4) || '8888').toUpperCase(),
      packageName: p.session?.package?.name || 'Paket Photobooth',
      paymentMethod: 'cash' as const,
      subtotal: p.grossAmount,
      discountAmount: 0,
      grossAmount: p.grossAmount,
      status: 'pending' as const,
      createdAt: p.createdAt.toISOString(),
      expiresAt: p.expiryTime.toISOString(),
    }));
  }

  /**
   * Mengambil riwayat catatan audit konfirmasi tunai
   */
  async getCashAuditLogs(): Promise<any[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { action: 'CASH_PAYMENT_CONFIRMED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return logs.map((l) => {
      const details = (l.details as any) || {};
      return {
        id: l.id,
        orderId: details.orderId || 'ORD-CASH',
        operatorId: details.confirmedBy || 'Petugas Kasir',
        grossAmount: details.grossAmount || 0,
        receivedAmount: details.receivedAmount || 0,
        changeAmount: details.changeAmount || 0,
        timestamp: l.createdAt.toISOString(),
        note: details.note || undefined,
      };
    });
  }
}
