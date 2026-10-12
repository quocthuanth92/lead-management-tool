import { LEAD_LABELS } from '@lead/shared-contracts';
import type { LeadLabel, SetLabelRequest } from '@lead/shared-contracts';
import { IsIn } from 'class-validator';

export class SetLabelDto implements SetLabelRequest {
  @IsIn(LEAD_LABELS)
  label!: LeadLabel;
}
