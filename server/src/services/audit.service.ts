// src/services/audit.service.ts
// Service pencatatan Audit Log
// Sesuai ARCHITECTURE.md §6.4 & DATABASE_SCHEMA.md §2.3

import type { PrismaClient } from '@prisma/client';

export interface CreateAuditLogParams {
  action: string;
  adminId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}

export async function logAuditEvent(
  prisma: PrismaClient,
  params: CreateAuditLogParams
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        adminId: params.adminId ?? null,
        ipAddress: params.ipAddress ?? null,
        details: params.details ? (params.details as any) : undefined,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
