import type { ListLeadsQuery } from '@lead/shared-contracts';
import { IsISO8601, IsOptional } from 'class-validator';

import { PaginationQueryDto } from './pagination-query.dto';

export class ListLeadsQueryDto extends PaginationQueryDto implements ListLeadsQuery {
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
