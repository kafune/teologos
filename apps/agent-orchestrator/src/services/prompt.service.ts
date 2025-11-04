import { readFile } from 'fs/promises';
import path from 'path';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { Passage } from './rag.service.js';
import type { ContextPassage, PromptBuildParams } from '../types/index.js';

type AgentProfile = {
  promptConstitution?: string[] | string;
};

async function loadAgentProfile(agentSlug: string): Promise<AgentProfile> {
  const trimmedSlug = agentSlug.trim();
  if (!trimmedSlug) {
    throw new Error('Agent slug is required to load the profile.');
  }

  const profilePath = path.resolve(process.cwd(), 'profiles', `${trimmedSlug}.json`);
  const raw = await readFile(profilePath, 'utf-8');
  return JSON.parse(raw) as AgentProfile;
}

function formatPassage(passage: Passage, index: number): string {
  const parts: string[] = [`#${index + 1}`];
  const title = passage.title?.trim() || `Trecho ${index + 1}`;
  parts.push(title);
  if (passage.section) {
    parts.push(passage.section);
  }
  if (passage.page !== undefined && passage.page !== null && `${passage.page}`.trim() !== '') {
    parts.push(`p. ${passage.page}`);
  }

  const header = parts.join(' — ');
  const bodyLines = [header, passage.text.trim()];
  if (passage.url) {
    bodyLines.push(passage.url);
  }

  return bodyLines.join('\n');
}

function buildContextSection(ctx: Passage[]): string {
  if (!ctx.length) {
    return '';
  }

  const ordered = [...ctx].sort((a, b) => a.ord - b.ord);
  const formatted = ordered.map((passage, index) => formatPassage(passage, index)).join('\n\n');

  return ['Contexto de suporte:', formatted].join('\n\n');
}

function normalizeConstitution(promptConstitution?: string[] | string): string {
  if (Array.isArray(promptConstitution)) {
    return promptConstitution.map((item) => item.trim()).filter(Boolean).join('\n');
  }

  if (typeof promptConstitution === 'string') {
    return promptConstitution.trim();
  }

  return '';
}

export async function buildMessages(agentSlug: string, question: string, ctx: Passage[]): Promise<ChatCompletionMessageParam[]> {
  const profile = await loadAgentProfile(agentSlug);
  const constitution = normalizeConstitution(profile.promptConstitution);
  const contextSection = buildContextSection(ctx);

  const systemContent = [constitution, contextSection].filter(Boolean).join('\n\n').trim();
  const systemMessage: ChatCompletionMessageParam = {
    role: 'system',
    content: systemContent || constitution,
  };

  const userMessage: ChatCompletionMessageParam = {
    role: 'user',
    content: question.trim(),
  };

  return [systemMessage, userMessage];
}

export function buildCitations(ctx: Passage[]): Array<{ title: string; section?: string; page?: number | string; url?: string }> {
  return ctx.map(({ title, section, page, url }) => ({
    title,
    section,
    page,
    url,
  }));
}

function formatContext(context: ContextPassage[]): string {
  if (!context.length) {
    return '';
  }

  const formatted = context
    .map((item, index) => {
      const header = item.title?.trim() || `Trecho ${index + 1}`;
      const body = item.text.trim();
      const meta: string[] = [];
      if (item.section) {
        meta.push(`Seção: ${item.section}`);
      }
      if (item.page !== undefined && item.page !== null && `${item.page}`.trim() !== '') {
        meta.push(`Página: ${item.page}`);
      }
      if (item.url) {
        meta.push(`URL: ${item.url}`);
      }
      const metadataLine = meta.length ? meta.join(' | ') : '';
      return [`### ${header}`, body, metadataLine].filter(Boolean).join('\n');
    })
    .join('\n\n');

  return [
    'Contexto de suporte fornecido (use apenas se relevante):',
    formatted,
    'Se não utilizar um trecho específico, não o cite.',
  ].join('\n\n');
}

export function buildPrompt({ agent, message, context = [] }: PromptBuildParams): ChatCompletionMessageParam[] {
  const trimmedAgent = agent.trim();
  const trimmedMessage = message.trim();

  const systemSections: string[] = [
    `Você é o Agente ${trimmedAgent}, inspirado no estilo e limites doutrinários do teólogo que representa.`,
    'Responda sempre em português do Brasil, mantendo clareza pastoral e rigor acadêmico.',
    'Ao extrapolar inferências que não estejam claramente fundamentadas, marque o trecho com *(inferência)*.',
    'Evite afirmações doutrinárias sem evidências textuais ou tradição confiável; quando não souber, admita a limitação.',
  ];

  const contextSection = formatContext(context);
  if (contextSection) {
    systemSections.push(contextSection);
  }

  const systemPrompt = systemSections.join('\n\n');

  const userPrompt = [
    'Pergunta recebida:',
    trimmedMessage,
    '',
    'Responder de forma concisa, mas completa. Caso precise sugerir leituras, forneça referências bibliográficas no corpo do texto.',
  ].join('\n');

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  return messages;
}
