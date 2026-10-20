// src/routes/system.routes.ts
// System endpoints: health check, version
// Sesuai API_CONTRACT.md §3.14

import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../middleware/error.middleware.js';

const APP_VERSION = '1.0.0';
const startTime = Date.now();

export async function systemRoutes(app: FastifyInstance): Promise<void> {
  const prisma = app.prisma;

  /**
   * GET /
   * Root API Welcome info
   */
  app.get('/', async (_request, reply) => {
    sendSuccess(reply, {
      name: 'MinjaPhotobooth API Server',
      version: APP_VERSION,
      status: 'online',
      kioskFrontendUrl: 'http://localhost:5173',
      healthCheck: '/api/system/health',
    });
  });

  /**
   * GET /api/system/health
   * Health check endpoint — tidak memerlukan autentikasi.
   */
  app.get('/api/system/health', async (_request, reply) => {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    sendSuccess(reply, {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      database: dbStatus,
      uptime: uptimeSeconds,
      version: APP_VERSION,
    });
  });

  /**
   * GET /api/system/version
   * Versi sistem & status update
   */
  app.get('/api/system/version', async (_request, reply) => {
    sendSuccess(reply, {
      currentVersion: APP_VERSION,
      latestVersion: null,
      updateAvailable: false,
      downloadUrl: null,
      releaseNotes: null,
      checkedAt: new Date().toISOString(),
    });
  });
}

