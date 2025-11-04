import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    AuthModule,
    HttpModule.register({
      timeout: 35000,
      maxRedirects: 0,
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
