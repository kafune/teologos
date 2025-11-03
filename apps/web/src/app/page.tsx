// # Objetivo:
// Desenvolver o front-end do projeto **Teologos**, uma plataforma SaaS em Português do Brasil
// que permite conversar com agentes de IA especializados em teólogos clássicos (Agostinho,
// Tomás de Aquino, Calvino etc). Cada agente é um “teólogo digital” com estilo e comportamento
// fiel ao autor original.

// # Stack:
// - Next.js 14 (App Router)
// - React 18
// - Tailwind CSS
// - Axios para chamadas HTTP
// - Comunicação com a API local em http://localhost:4000
// - UI moderna, minimalista e teológica (tons neutros, legível, foco no conteúdo)

// # Páginas iniciais:
// 1. `/` – tela principal de chat:
//    - Header com logo “Teologos”.
//    - Dropdown para selecionar o agente (ex: Agostinho, Aquino, Calvino).
//    - Caixa de entrada (input multiline) para a pergunta.
//    - Botão “Perguntar”.
//    - Área de resposta com:
//        - Texto retornado pela API.
//        - Citações formatadas no padrão “[[obra, seção/página]]”.
//        - Scroll suave e fundo neutro.
// 2. `/about` – texto curto sobre o projeto.
// 3. `/login` – placeholder de autenticação futura (Auth0).

// # Funcionalidades:
// - Enviar POST para `http://localhost:4000/chat` com `{ agent, message }`.
// - Renderizar a resposta (`answer`) e as citações (`citations[]`).
// - Exibir loading state enquanto aguarda resposta.
// - Lidar com erros (toast simples ou mensagem em vermelho).
// - Layout responsivo (desktop/mobile).

// # Diretrizes visuais:
// - Tema claro e tipografia legível (Inter ou Roboto).
// - Container central com largura máxima de 720px.
// - Bordas arredondadas, espaçamento generoso, foco no texto.
// - Textos e botões em PT-BR (“Perguntar”, “Selecione um teólogo”, etc).
// - Modo escuro opcional no futuro.

// # Saída esperada:
// Gere a estrutura base do projeto:
// - `src/app/page.tsx` – tela principal de chat.
// - `src/components/ChatBox.tsx` – componente de chat com input e resposta.
// - `src/components/Header.tsx` – cabeçalho simples com logo e seleção de teólogo.
// - `src/styles/globals.css` – Tailwind configurado.

// Implemente componentes funcionais e estados React usando TypeScript.
// O código deve rodar imediatamente com `npm run dev` ou `yarn dev`.

"use client";

import { useMemo, useState } from "react";

import { ChatBox } from "@/components/ChatBox";
import { Header } from "@/components/Header";

const AGENTS = [
  "Agostinho de Hipona",
  "Tomás de Aquino",
  "João Calvino",
  "Martinho Lutero",
  "Teresa de Ávila",
] as const;

export default function Home() {
  const [selectedAgent, setSelectedAgent] = useState<(typeof AGENTS)[number]>(
    AGENTS[0],
  );

  const availableAgents = useMemo(() => [...AGENTS], []);

  return (
    <div className="min-h-screen bg-[var(--background)] py-10 font-sans text-[var(--foreground)]">
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl flex-col gap-10 px-4 pb-16 md:px-6 lg:px-8">
        <Header
          agents={availableAgents}
          selectedAgent={selectedAgent}
          onAgentChange={(agent) =>
            setSelectedAgent(agent as (typeof AGENTS)[number])
          }
        />
        <ChatBox agent={selectedAgent} />
      </main>
    </div>
  );
}
