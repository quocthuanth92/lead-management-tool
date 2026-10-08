import { Body, Controller, Post } from '@nestjs/common';

import { LeadsService } from '../../application/leads.service';
import { CreatePlaceholderLeadDto } from './dto/create-placeholder-lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('placeholder')
  async createPlaceholder(@Body() body: CreatePlaceholderLeadDto): Promise<{ id: string }> {
    const created = await this.leadsService.createPlaceholderLead({
      customerName: body.customerName,
      phone: body.phone,
      email: body.email,
      source: body.source
    });
    return { id: created.id };
  }
}
