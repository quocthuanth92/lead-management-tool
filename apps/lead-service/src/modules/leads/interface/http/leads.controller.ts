import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import type {
  LeadDetails,
  LeadListItem,
  PagedResult,
  SetLabelResponse
} from '@lead/shared-contracts';

import { ApiKeyGuard } from '../../../../common/guards/api-key.guard';
import { AuthenticatedUser, JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../../../common/pipes/parse-object-id.pipe';
import { CreateLeadService } from '../../application/create-lead.service';
import { GetLeadDetailsService } from '../../application/get-lead-details.service';
import { ListLeadsService } from '../../application/list-leads.service';
import { SetLeadLabelService } from '../../application/set-lead-label.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { SearchLeadsQueryDto } from './dto/search-leads-query.dto';
import { SetLabelDto } from './dto/set-label.dto';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly createLeadService: CreateLeadService,
    private readonly listLeadsService: ListLeadsService,
    private readonly leadDetailsService: GetLeadDetailsService,
    private readonly setLeadLabelService: SetLeadLabelService
  ) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  create(@Body() body: CreateLeadDto): Promise<{ id: string }> {
    return this.createLeadService.execute(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  inbox(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLeadsQueryDto
  ): Promise<PagedResult<LeadListItem>> {
    return this.listLeadsService.inbox(user.userId, query);
  }

  // Declared before `:id` so that "search" is never parsed as a lead id.
  @Get('search')
  @UseGuards(JwtAuthGuard)
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchLeadsQueryDto
  ): Promise<PagedResult<LeadListItem>> {
    return this.listLeadsService.search(user.userId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  details(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string
  ): Promise<LeadDetails> {
    return this.leadDetailsService.execute(user.userId, id);
  }

  @Put(':id/label')
  @UseGuards(JwtAuthGuard)
  setLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: SetLabelDto
  ): Promise<SetLabelResponse> {
    return this.setLeadLabelService.execute(user.userId, id, body.label);
  }
}
