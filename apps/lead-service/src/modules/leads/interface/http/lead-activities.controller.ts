import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { LeadActivityItem, PagedResult } from '@lead/shared-contracts';

import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ParseObjectIdPipe } from '../../../../common/pipes/parse-object-id.pipe';
import { AddLeadActivityService } from '../../application/add-lead-activity.service';
import { ListLeadActivitiesService } from '../../application/list-lead-activities.service';
import { AddActivityDto } from './dto/add-activity.dto';
import { ListActivitiesQueryDto } from './dto/list-activities-query.dto';

@Controller('leads/:id/activities')
export class LeadActivitiesController {
  constructor(
    private readonly addActivityService: AddLeadActivityService,
    private readonly listActivitiesService: ListLeadActivitiesService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: AddActivityDto
  ): Promise<LeadActivityItem> {
    return this.addActivityService.execute(user.userId, id, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: ListActivitiesQueryDto
  ): Promise<PagedResult<LeadActivityItem>> {
    return this.listActivitiesService.execute(user.userId, id, query);
  }
}
