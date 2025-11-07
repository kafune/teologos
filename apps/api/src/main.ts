// # Objetivo:
// Desenvolver o backend (API) do projeto **Teologos**, uma plataforma SaaS em Português do Brasil
// que permite conversar com agentes de IA especializados em teólogos clássicos (Agostinho, Tomás
// de Aquino, Calvino, etc). Cada agente é um “teólogo digital” com comportamento e estilo próprios.

// # Stack:
// - NestJS 10+
// - TypeScript
// - Axios (para chamadas HTTP ao agente-orchestrator)
// - Prisma ORM (PostgreSQL)
// - Class Validator e DTOs
// - CORS habilitado (para localhost:3000)
// - Porta padrão: 4000

// # Estrutura esperada:
// src/
//  ├── main.ts                   # Bootstrap e configurações globais
//  ├── app.module.ts             # Módulo raiz
//  ├── chat/
//  │    ├── chat.controller.ts   # Rota POST /chat
//  │    ├── chat.service.ts      # Chama o agente e processa resposta
//  │    ├── dto/chat.dto.ts      # Validação de entrada
//  ├── agents/
//  │    ├── agents.controller.ts # Rota GET /agents (lista teólogos disponíveis)
//  │    └── agents.service.ts    # Retorna lista fixa do MVP
//  ├── health/
//  │    └── health.controller.ts # Rota GET /health
//  ├── database/
//  │    ├── prisma.service.ts    # Conexão com PostgreSQL
//  │    └── schema.prisma        # Esquema inicial

// # Endpoints a implementar:

// ## GET /health
// Retorna `{ status: 'ok', uptime }`

// ## GET /agents
// Retorna lista fixa de agentes:
// [
//   { id: 'agostinho', name: 'Santo Agostinho', tradition: 'Patrística' },
//   { id: 'aquinas', name: 'Tomás de Aquino', tradition: 'Escolástica' },
//   { id: 'calvino', name: 'João Calvino', tradition: 'Reforma' }
// ]

// ## POST /chat
// Recebe JSON `{ agent: string, message: string }`
// Valida via DTO.
// Faz POST para o serviço local `agent-orchestrator` (`http://agent:8080/ask`).
// Exemplo de corpo enviado ao orquestrador:

// { "agent": "agostinho", "message": "O que é a graça?" }

// Retorna a resposta JSON `{ answer, citations }` do orquestrador.

// Em caso de erro, retornar `{ error: 'Agente indisponível' }` com status 500.

// # Requisitos adicionais:
// - Usar classes e decorators padrão do NestJS (`@Controller`, `@Injectable`, `@Module`).
// - Habilitar validação global (`app.useGlobalPipes(new ValidationPipe())`).
// - Usar `ConfigModule` para variáveis de ambiente (.env).
// - Tratar exceções com `HttpException` e `Logger`.

// # Saída esperada:
// Gerar todos os arquivos necessários para que o projeto rode com:

// npm install
// npm run start:dev

// E ao acessar:
// - `GET http://localhost:4000/health` → deve retornar `{ status: 'ok' }`
// - `GET http://localhost:4000/agents` → deve retornar lista de teólogos
// - `POST http://localhost:4000/chat` → deve encaminhar para o `agent-orchestrator` e devolver resposta

// O código deve estar limpo, comentado e pronto para ser integrado ao front-end (Next.js).

import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const normalizeOrigin = (origin?: string | null) => {
    if (!origin) {
      return origin;
    }

    const trimmed = origin.trim();

    if (!trimmed || trimmed === '*') {
      return trimmed;
    }

    return trimmed.replace(/\/$/, '');
  };

  const isPrivateHostname = (hostname: string) => {
    if (!hostname) {
      return false;
    }

    const normalized = hostname.toLowerCase();

    if (
      normalized === 'localhost' ||
      normalized === '0.0.0.0' ||
      normalized === '127.0.0.1'
    ) {
      return true;
    }

    if (normalized.endsWith('.local')) {
      return true;
    }

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
      const [first, second] = normalized.split('.').map(Number);

      if (first === 10 || first === 127) {
        return true;
      }

      if (first === 192 && second === 168) {
        return true;
      }

      if (first === 172 && second >= 16 && second <= 31) {
        return true;
      }
    }

    if (
      normalized.startsWith('fe80') ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd')
    ) {
      return true;
    }

    return false;
  };

  const isPrivateNetworkOrigin = (origin?: string | null) => {
    if (!origin) {
      return false;
    }

    try {
      const { hostname } = new URL(origin);
      return isPrivateHostname(hostname);
    } catch {
      return false;
    }
  };

  const rawOrigins = configService.get<string>('CORS_ORIGINS');
  const allowedOriginsList = rawOrigins
    ? rawOrigins
        .split(/[,\s]+/)
        .map(normalizeOrigin)
        .filter((origin): origin is string => Boolean(origin))
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  const allowedOrigins = new Set(allowedOriginsList);

  const allowPrivateOriginsValue = configService.get(
    'ALLOW_PRIVATE_NETWORK_CORS',
  );
  const allowPrivateOrigins =
    allowPrivateOriginsValue === undefined
      ? true
      : String(allowPrivateOriginsValue).toLowerCase() !== 'false';

  Logger.log(
    `CORS habilitado para: ${Array.from(allowedOrigins).join(', ')}`,
    'Bootstrap',
  );

  app.enableCors({
    origin: (requestOrigin, callback) => {
      const normalizedOrigin = normalizeOrigin(requestOrigin);

      const isAllowed =
        !normalizedOrigin ||
        allowedOrigins.has('*') ||
        allowedOrigins.has(normalizedOrigin) ||
        (allowPrivateOrigins && isPrivateNetworkOrigin(requestOrigin));

      if (isAllowed) {
        return callback(null, true);
      }

      Logger.warn(
        `Origem CORS bloqueada: ${requestOrigin} (permitidas: ${Array.from(allowedOrigins).join(', ')})`,
        'Bootstrap',
      );
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT') ?? 4000;

  await app.listen(port, '0.0.0.0');
  Logger.log(`Aplicação iniciada na porta ${port}`, 'Bootstrap');
}

bootstrap();
