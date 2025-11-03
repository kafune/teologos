import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async askAgent(payload: ChatDto) {
    const orchestratorUrl =
      this.configService.get<string>('AGENT_ORCHESTRATOR_URL') ??
      'http://agent:8080/ask';

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(orchestratorUrl, payload),
      );

      return data;
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
