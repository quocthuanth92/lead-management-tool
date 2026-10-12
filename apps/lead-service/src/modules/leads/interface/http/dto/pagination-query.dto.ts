import { PAGINATION } from '@lead/shared-contracts';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: PAGINATION.DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PAGINATION.MAX_LIMIT,
    default: PAGINATION.DEFAULT_LIMIT
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_LIMIT)
  limit: number = PAGINATION.DEFAULT_LIMIT;
}
