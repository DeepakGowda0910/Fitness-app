import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { supabaseTokenVerifier } from './auth.js';
import { loadConfig } from './config.js';
import { createDatabase } from './database.js';

const config = loadConfig();
const { db, close } = createDatabase(config.DATABASE_URL);

const app = await NestFactory.create(AppModule.register({ db, verifyToken: supabaseTokenVerifier(config) }));
app.enableCors({ origin: config.CORS_ORIGINS.split(',').map((o) => o.trim()) });
app.enableShutdownHooks();
process.once('beforeExit', () => void close());
await app.listen(config.PORT);
console.log(`API listening on port ${config.PORT}`);
