import { LEAD_LABELS, LIMITS } from '@lead/shared-contracts';
import type { LeadLabel, SearchLeadsQuery } from '@lead/shared-contracts';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, ValidateIf } from 'class-validator';

import { ListLeadsQueryDto } from './list-leads-query.dto';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class SearchLeadsQueryDto extends ListLeadsQueryDto implements SearchLeadsQuery {
  @ValidateIf((dto: SearchLeadsQueryDto) => dto.q !== undefined || dto.label === undefined)
  @Transform(trimString)
  @IsString({ message: 'Provide q or label' })
  @Length(LIMITS.SEARCH_MIN, LIMITS.SEARCH_MAX)
  q?: string;

  @ValidateIf((dto: SearchLeadsQueryDto) => dto.label !== undefined)
  @IsIn(LEAD_LABELS)
  label?: LeadLabel;
}
