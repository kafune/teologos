import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly configService: ConfigService) {}

  async askAgent(payload: ChatDto) {
    const orchestratorUrl =
      process.env.AGENT_ORCHESTRATOR_URL ??
      this.configService.get<string>('AGENT_ORCHESTRATOR_URL');

    const orchestratorToken =
      process.env.AGENT_ORCHESTRATOR_TOKEN ??
      this.configService.get<string>('AGENT_ORCHESTRATOR_TOKEN');

    if (!orchestratorUrl) {
      this.logger.error('AGENT_ORCHESTRATOR_URL não configurada');
      throw new HttpException(
        { error: 'Agente indisponível' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!orchestratorToken) {
      this.logger.error('AGENT_ORCHESTRATOR_TOKEN não configurado');
      throw new HttpException(
        { error: 'Agente indisponível' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const requestPayload = {
      agent: payload.agent,
      message: payload.message,
    };

    try {
      const { data } = await axios.post(orchestratorUrl, requestPayload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${orchestratorToken}`,
        },
      });

      const { answer, citations } = data ?? {};

      return { answer, citations };
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const responseData = axiosError.response?.data;

      this.logger.error(
        `Falha ao contatar o orquestrador (${status ?? 'sem status'}) para o agente ${payload.agent}`,
        axiosError.stack ??
          (typeof responseData === 'string'
            ? responseData
            : JSON.stringify(responseData)),
      );

      throw new HttpException(
        { error: 'Agente indisponível' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
