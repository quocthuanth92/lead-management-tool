import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ACTIVITY_TYPES, LEAD_LABELS, LEAD_SOURCES } from '@lead/shared-contracts';
import type {
  CreateLeadResponse,
  ErrorResponse,
  HealthResponse,
  LeadActivityItem,
  LeadDetails,
  LeadListItem,
  LoginResponse,
  PagedResult,
  SessionUser,
  SetLabelResponse
} from '@lead/shared-contracts';

export class ErrorResponseModel implements ErrorResponse {
  @ApiProperty()
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }]
  })
  message!: string | string[];

  @ApiProperty()
  error!: string;
}

export class SessionUserModel implements SessionUser {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ enum: ['SALESPERSON', 'ADMIN'] })
  role!: 'SALESPERSON' | 'ADMIN';
}

export class LoginResponseModel implements LoginResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: SessionUserModel })
  user!: SessionUserModel;
}

export class CreateLeadResponseModel implements CreateLeadResponse {
  @ApiProperty()
  id!: string;
}

export class LeadActivityModel implements LeadActivityItem {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  leadId!: string;

  @ApiProperty({ enum: ACTIVITY_TYPES, enumName: 'ActivityType' })
  type!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  authorName!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class LeadListItemModel implements LeadListItem {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  customerName!: string;

  @ApiProperty({ type: String, nullable: true, required: false })
  email?: string | null;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ enum: LEAD_LABELS, enumName: 'LeadLabel' })
  label!: string;

  @ApiProperty()
  hasView!: boolean;

  @ApiProperty({ format: 'date-time' })
  lastUpdate!: string;
}

export class LeadDetailsModel extends LeadListItemModel implements LeadDetails {
  @ApiProperty({ enum: LEAD_SOURCES, enumName: 'LeadSource' })
  source!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({
    type: 'array',
    items: { $ref: getSchemaPath(LeadActivityModel) }
  })
  activities!: LeadActivityModel[];

  @ApiProperty()
  activitiesTotal!: number;
}

export class PagedLeadListModel implements PagedResult<LeadListItem> {
  @ApiProperty({
    type: 'array',
    items: { $ref: getSchemaPath(LeadListItemModel) }
  })
  items!: LeadListItemModel[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class PagedActivityModel implements PagedResult<LeadActivityItem> {
  @ApiProperty({
    type: 'array',
    items: { $ref: getSchemaPath(LeadActivityModel) }
  })
  items!: LeadActivityModel[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}

export class SetLabelResponseModel implements SetLabelResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: LEAD_LABELS, enumName: 'LeadLabel' })
  label!: string;

  @ApiProperty({ format: 'date-time' })
  lastUpdate!: string;
}

export class HealthResponseModel implements HealthResponse {
  @ApiProperty({ enum: ['ok', 'degraded', 'down'] })
  status!: 'ok' | 'degraded' | 'down';

  @ApiProperty({ enum: ['up', 'down'] })
  db!: 'up' | 'down';

  @ApiProperty({ enum: ['up', 'down'] })
  redis!: 'up' | 'down';
}

export const OPENAPI_MODELS = [
  ErrorResponseModel,
  SessionUserModel,
  LoginResponseModel,
  CreateLeadResponseModel,
  LeadActivityModel,
  LeadListItemModel,
  LeadDetailsModel,
  PagedLeadListModel,
  PagedActivityModel,
  SetLabelResponseModel,
  HealthResponseModel
];
