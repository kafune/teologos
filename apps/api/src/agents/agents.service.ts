import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';

export interface AgentDescriptor {
  id: string;
  name: string;
  tradition?: string | null;
}

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AgentDescriptor[]> {
    const agents = await this.prisma.agent.findMany({
      orderBy: { name: 'asc' },
    });

    return agents.map((agent) => this.mapAgent(agent));
  }

  private mapAgent(agent: { id: string; name: string; tradition: string | null }): AgentDescriptor {
    return {
      id: agent.id,
      name: agent.name,
      tradition: agent.tradition ?? undefined,
    };
  }

  private static normalizeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(payload: CreateAgentDto): Promise<AgentDescriptor> {
    const name = payload.name?.trim();
    if (!name) {
      throw new BadRequestException('Nome é obrigatório.');
    }

    const slug = payload.slug?.trim()
      ? payload.slug.trim().toLowerCase()
      : AgentsService.normalizeSlug(name);

    if (!slug) {
      throw new BadRequestException('Não foi possível gerar um identificador válido.');
    }

    const defaultTradition = 'Professor do Seminário';

    try {
      const agent = await this.prisma.agent.create({
        data: {
          id: slug,
          name,
          tradition: defaultTradition,
        },
      });

      return this.mapAgent(agent);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Já existe um agente com esse identificador.');
        }
      }

      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new BadRequestException('Identificador inválido.');
    }

    try {
      await this.prisma.agent.delete({
        where: { id: trimmed },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Agente não encontrado.');
        }
      }

      throw error;
    }
  }
}
