import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags
} from '@nestjs/swagger';
import type {
  LeadDetails,
  LeadListItem,
  PagedResult,
  SetLabelResponse
} from '@lead/shared-contracts';

import { ApiKeyGuard } from '../../../../common/guards/api-key.guard';
import { AuthenticatedUser, JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import {
  CreateLeadResponseModel,
  ErrorResponseModel,
  LeadDetailsModel,
  PagedLeadListModel,
  SetLabelResponseModel
} from '../../../../common/openapi/openapi.models';
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
@ApiTags('Leads')
export class LeadsController {
  constructor(
    private readonly createLeadService: CreateLeadService,
    private readonly listLeadsService: ListLeadsService,
    private readonly leadDetailsService: GetLeadDetailsService,
    private readonly setLeadLabelService: SetLeadLabelService
  ) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Ingest a lead from a trusted internal system' })
  @ApiSecurity('apiKeyAuth')
  @ApiCreatedResponse({ description: 'Lead stored as unread', type: CreateLeadResponseModel })
  @ApiResponse({ status: 400, description: 'Invalid lead data', type: ErrorResponseModel })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key', type: ErrorResponseModel })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded', type: ErrorResponseModel })
  create(@Body() body: CreateLeadDto): Promise<{ id: string }> {
    return this.createLeadService.execute(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List the signed-in salesperson's lead inbox" })
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ description: 'One page of leads', type: PagedLeadListModel })
  @ApiResponse({ status: 400, description: 'Invalid query parameters', type: ErrorResponseModel })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or expired token',
    type: ErrorResponseModel
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded', type: ErrorResponseModel })
  inbox(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLeadsQueryDto
  ): Promise<PagedResult<LeadListItem>> {
    return this.listLeadsService.inbox(user.userId, query);
  }

  // Declared before `:id` so that "search" is never parsed as a lead id.
  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Search the signed-in salesperson's leads" })
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ description: 'One page of matching leads', type: PagedLeadListModel })
  @ApiResponse({ status: 400, description: 'Invalid query parameters', type: ErrorResponseModel })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or expired token',
    type: ErrorResponseModel
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded', type: ErrorResponseModel })
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchLeadsQueryDto
  ): Promise<PagedResult<LeadListItem>> {
    return this.listLeadsService.search(user.userId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get lead details and mark the lead as read' })
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ description: 'Lead details', type: LeadDetailsModel })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or expired token',
    type: ErrorResponseModel
  })
  @ApiResponse({ status: 404, description: 'Lead not found', type: ErrorResponseModel })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded', type: ErrorResponseModel })
  details(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string
  ): Promise<LeadDetails> {
    return this.leadDetailsService.execute(user.userId, id);
  }

  @Put(':id/label')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Set or replace the lead label' })
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ description: 'Label updated', type: SetLabelResponseModel })
  @ApiResponse({ status: 400, description: 'Invalid label', type: ErrorResponseModel })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or expired token',
    type: ErrorResponseModel
  })
  @ApiResponse({ status: 404, description: 'Lead not found', type: ErrorResponseModel })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded', type: ErrorResponseModel })
  setLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: SetLabelDto
  ): Promise<SetLabelResponse> {
    return this.setLeadLabelService.execute(user.userId, id, body.label);
  }
}
