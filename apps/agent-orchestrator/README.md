# agent-orchestrator

Microserviço em Node.js que orquestra agentes teológicos chamando a API da OpenAI.

## Requisitos

- Node.js 20+
- NPM

## Configuração

1. Copie o arquivo `.env.example` para `.env` e ajuste as variáveis.
2. Instale as dependências:

   ```bash
   npm install
   ```

## Desenvolvimento

Execute em modo watch:

```bash
npm run dev
```

## Build e produção

```bash
npm run build
npm start
```

O servidor escuta por padrão em `0.0.0.0:8080`.

## Testes

```bash
npm test
```

## Docker

```bash
docker build -t agent-orchestrator .
docker run --rm -p 8080:8080 --env-file .env agent-orchestrator
```
