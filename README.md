# Teologos (MVP)

Stack: Next.js (web) + NestJS (API) + Agent Orchestrator (Node) + Qdrant + Postgres + MinIO.
Execute com Docker Compose.

## Como rodar
1) Copie `.env.example` para `.env` e preencha as chaves.
2) `docker compose up -d` (ou `docker-compose up -d`).
3) Acesse: Web `http://localhost:3000` | API `http://localhost:4000/health`

## Serviços
- web: Next.js
- api: NestJS
- agent: orquestrador de RAG/LLM
- qdrant: vetores
- db: Postgres
- minio: storage S3-compatível
