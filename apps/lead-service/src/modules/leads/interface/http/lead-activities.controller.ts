import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import type { LeadActivityItem, PagedResult } from '@lead/shared-contracts';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import {
  ErrorResponseModel,
  LeadActivityModel,
  PagedActivityModel
} from '../../../../common/openapi/openapi.models';
import { ParseObjectIdPipe } from '../../../../common/pipes/parse-object-id.pipe';
import { AddLeadActivityService } from '../../application/add-lead-activity.service';
import { ListLeadActivitiesService } from '../../application/list-lead-activities.service';
import { AddActivityDto } from './dto/add-activity.dto';
import { ListActivitiesQueryDto } from './dto/list-activities-query.dto';

@Controller('leads/:id/activities')
@ApiTags('Activities')
export class LeadActivitiesController {
  constructor(
    private readonly addActivityService: AddLeadActivityService,
    private readonly listActivitiesService: ListLeadActivitiesService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Append a follow-up activity to a lead' })
  @ApiBearerAuth('bearerAuth')
  @ApiCreatedResponse({ description: 'Activity appended', type: LeadActivityModel })
  @ApiResponse({ status: 400, description: 'Invalid activity data', type: ErrorResponseModel })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or expired token',
    type: ErrorResponseModel
  })
  @ApiResponse({ status: 404, description: 'Lead not found', type: ErrorResponseModel })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded', type: ErrorResponseModel })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: AddActivityDto
  ): Promise<LeadActivityItem> {
    return this.addActivityService.execute(user.userId, id, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List a lead's activities, newest first" })
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ description: 'One page of activities', type: PagedActivityModel })
  @ApiResponse({ status: 400, description: 'Invalid query parameters', type: ErrorResponseModel })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or expired token',
    type: ErrorResponseModel
  })
  @ApiResponse({ status: 404, description: 'Lead not found', type: ErrorResponseModel })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded', type: ErrorResponseModel })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: ListActivitiesQueryDto
  ): Promise<PagedResult<LeadActivityItem>> {
    return this.listActivitiesService.execute(user.userId, id, query);
  }
}
