import { LEAD_LABELS, LIMITS } from '@lead/shared-contracts';
import type { LeadLabel, SearchLeadsQuery } from '@lead/shared-contracts';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, ValidateIf } from 'class-validator';

import { ListLeadsQueryDto } from './list-leads-query.dto';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class SearchLeadsQueryDto extends ListLeadsQueryDto implements SearchLeadsQuery {
  @ApiPropertyOptional({
    minLength: LIMITS.SEARCH_MIN,
    maxLength: LIMITS.SEARCH_MAX,
    description: 'At least one of q or label is required.'
  })
  @ValidateIf((dto: SearchLeadsQueryDto) => dto.q !== undefined || dto.label === undefined)
  @Transform(trimString)
  @IsString({ message: 'Provide q or label' })
  @Length(LIMITS.SEARCH_MIN, LIMITS.SEARCH_MAX)
  q?: string;

  @ApiPropertyOptional({ enum: LEAD_LABELS, enumName: 'LeadLabel' })
  @ValidateIf((dto: SearchLeadsQueryDto) => dto.label !== undefined)
  @IsIn(LEAD_LABELS)
  label?: LeadLabel;
}
