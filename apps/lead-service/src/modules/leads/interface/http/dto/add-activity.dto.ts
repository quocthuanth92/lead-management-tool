import { ACTIVITY_TYPES, LIMITS } from '@lead/shared-contracts';
import type { ActivityType, AddActivityRequest } from '@lead/shared-contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export class AddActivityDto implements AddActivityRequest {
  @ApiPropertyOptional({ enum: ACTIVITY_TYPES, enumName: 'ActivityType' })
  @IsOptional()
  @IsIn(ACTIVITY_TYPES)
  type?: ActivityType;

  @ApiProperty({
    minLength: 1,
    maxLength: LIMITS.NOTE_MAX,
    description: 'Must contain at least one non-whitespace character.'
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, LIMITS.NOTE_MAX)
  @Matches(/\S/, { message: 'content must contain a non-whitespace character' })
  content!: string;
}
