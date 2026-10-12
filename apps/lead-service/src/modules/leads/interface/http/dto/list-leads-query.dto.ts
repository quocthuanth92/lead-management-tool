import type { ListLeadsQuery } from '@lead/shared-contracts';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

import { PaginationQueryDto } from './pagination-query.dto';

export class ListLeadsQueryDto extends PaginationQueryDto implements ListLeadsQuery {
  @ApiPropertyOptional({
    description: 'ISO 8601 date or date-time. Defaults to six months before toDate.'
  })
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 date or date-time. Defaults to now and must be >= fromDate.'
  })
  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
