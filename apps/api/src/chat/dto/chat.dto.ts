import { IsNotEmpty, IsString } from 'class-validator';

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  agent!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}
