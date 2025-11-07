import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsOptional()
  @IsUrl(undefined, { message: 'Informe uma URL válida.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  sourceUrl?: string;
}
