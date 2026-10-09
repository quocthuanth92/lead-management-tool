import { Inject, Injectable } from '@nestjs/common';

import { Lead } from '../domain/entities/lead.entity';
import { LeadRepositoryPort, LEAD_REPOSITORY_PORT } from '../domain/ports/lead-repository.port';

@Injectable()
export class LeadsService {
  constructor(@Inject(LEAD_REPOSITORY_PORT) private readonly leadRepository: LeadRepositoryPort) {}

  findById(id: string): Promise<Lead | null> {
    return this.leadRepository.findById(id);
  }
}
