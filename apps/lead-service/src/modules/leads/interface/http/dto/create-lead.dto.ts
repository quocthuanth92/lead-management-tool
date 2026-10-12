import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, MaxLength, Matches } from 'class-validator';
import { CreateLeadRequest, LIMITS } from '@lead/shared-contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizePhone } from '@lead/persistence';

export class CreateLeadDto implements CreateLeadRequest {
  @ApiProperty({ minLength: 1, maxLength: LIMITS.FULL_NAME_MAX })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, LIMITS.FULL_NAME_MAX)
  fullName!: string;

  @ApiProperty({
    minLength: 7,
    maxLength: 25,
    description: 'Phone number; spaces and punctuation are normalized before validation.'
  })
  @Transform(({ value }) => (typeof value === 'string' ? (normalizePhone(value) ?? value) : value))
  @IsString()
  @Matches(/^\+?\d{7,20}$/)
  phone!: string;

  @ApiPropertyOptional({ format: 'email', maxLength: LIMITS.EMAIL_MAX })
  @IsOptional()
  @IsEmail()
  @MaxLength(LIMITS.EMAIL_MAX)
  email?: string;

  @ApiProperty({ minLength: 1, maxLength: LIMITS.MESSAGE_MAX })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, LIMITS.MESSAGE_MAX)
  message!: string;
}
