import { LEAD_LABELS } from '@lead/shared-contracts';
import type { LeadLabel, SetLabelRequest } from '@lead/shared-contracts';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class SetLabelDto implements SetLabelRequest {
  @ApiProperty({ enum: LEAD_LABELS, enumName: 'LeadLabel' })
  @IsIn(LEAD_LABELS)
  label!: LeadLabel;
}
