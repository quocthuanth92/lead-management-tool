import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePlaceholderLeadDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  source!: string;
}
