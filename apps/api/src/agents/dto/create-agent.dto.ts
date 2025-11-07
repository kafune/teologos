import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateAgentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(slugRegex, {
    message:
      'O identificador deve conter apenas letras minúsculas, números e hífens, sem espaços ou caracteres especiais.',
  })
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  slug?: string;
}
