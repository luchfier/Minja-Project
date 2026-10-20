// src/server.ts
// Entry point — Memulai server Fastify
// Sesuai ARCHITECTURE.md §6.1

import 'dotenv/config';
import { buildApp } from './app.js';
import { getEnv } from './config/env.js';

async function main(): Promise<void> {
  const app = await buildApp();
  const env = getEnv();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`🚀 MinjaPhotobooth API Server v1.0.0 running on port ${env.PORT}`);
    app.log.info(`📖 Environment: ${env.NODE_ENV}`);
  } catch (err) {
    app.log.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    process.exit(0);
  });
});

main();
