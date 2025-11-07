import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list() {
    return this.agentsService.findAll();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async create(@Body() payload: CreateAgentDto) {
    return this.agentsService.create(payload);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.agentsService.remove(id);
    return { success: true };
  }
}
