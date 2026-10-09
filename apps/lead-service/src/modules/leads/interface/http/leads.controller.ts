import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { ApiKeyGuard } from '../../../../common/guards/api-key.guard';
import { CreateLeadService } from '../../application/create-lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly createLeadService: CreateLeadService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  create(@Body() body: CreateLeadDto): Promise<{ id: string }> {
    return this.createLeadService.execute(body);
  }
}
