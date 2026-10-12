import { Injectable, OnApplicationBootstrap, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

import { AssignHeldLeadsService } from '../application/assign-held-leads.service';

const HELD_LEADS_JOB = 'assign-held-leads';

@Injectable()
export class HeldLeadsScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(HeldLeadsScheduler.name);
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly assignHeldLeads: AssignHeldLeadsService
  ) {}

  onApplicationBootstrap(): void {
    const intervalMs = this.config.getOrThrow<number>('ASSIGN_HELD_LEADS_INTERVAL_SECONDS') * 1000;
    this.schedulerRegistry.addInterval(
      HELD_LEADS_JOB,
      setInterval(() => void this.tick(), intervalMs)
    );
  }

  onModuleDestroy(): void {
    this.schedulerRegistry.deleteInterval(HELD_LEADS_JOB);
  }

  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      await this.assignHeldLeads.execute(
        this.config.getOrThrow<number>('ASSIGN_HELD_LEADS_BATCH_SIZE')
      );
    } catch (error) {
      this.logger.error(
        `Held lead assignment failed (error=${error instanceof Error ? error.name : 'UnknownError'})`
      );
    } finally {
      this.running = false;
    }
  }
}
