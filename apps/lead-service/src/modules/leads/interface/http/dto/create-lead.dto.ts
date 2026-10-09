import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, MaxLength, Matches } from 'class-validator';
import { CreateLeadRequest, LIMITS } from '@lead/shared-contracts';
import { normalizePhone } from '@lead/persistence';

export class CreateLeadDto implements CreateLeadRequest {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, LIMITS.FULL_NAME_MAX)
  fullName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? (normalizePhone(value) ?? value) : value))
  @IsString()
  @Matches(/^\+?\d{7,20}$/)
  phone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(LIMITS.EMAIL_MAX)
  email?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, LIMITS.MESSAGE_MAX)
  message!: string;
}
