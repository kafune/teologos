import { Injectable } from '@nestjs/common';

export interface AgentDescriptor {
  id: string;
  name: string;
  tradition: string;
}

@Injectable()
export class AgentsService {
  private readonly agents: AgentDescriptor[] = [
    { id: 'agostinho', name: 'Santo Agostinho', tradition: 'Patrística' },
    { id: 'aquinas', name: 'Tomás de Aquino', tradition: 'Escolástica' },
    { id: 'calvino', name: 'João Calvino', tradition: 'Reforma' },
  ];

  findAll(): AgentDescriptor[] {
    return this.agents;
  }
}
