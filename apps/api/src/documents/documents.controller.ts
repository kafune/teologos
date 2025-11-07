import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('agents/:agentId/documents')
  list(@Param('agentId') agentId: string) {
    return this.documentsService.list(agentId);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('agents/:agentId/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  upload(
    @Param('agentId') agentId: string,
    @Body() payload: CreateDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Envie um arquivo PDF para ingestão.');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Apenas arquivos PDF são aceitos.');
    }
    return this.documentsService.ingest(agentId, payload, file);
  }
}
