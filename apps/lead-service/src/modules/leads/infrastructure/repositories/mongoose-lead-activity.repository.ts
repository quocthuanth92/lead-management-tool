import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LeadActivityAttrs } from '@lead/persistence';
import { Model } from 'mongoose';

import { LeadActivity } from '../../domain/entities/lead-activity.entity';
import {
  LeadActivityPage,
  LeadActivityRepositoryPort
} from '../../domain/ports/lead-activity-repository.port';

type ActivityRow = LeadActivityAttrs & { _id: unknown };

@Injectable()
export class MongooseLeadActivityRepository implements LeadActivityRepositoryPort {
  constructor(
    @InjectModel('LeadActivity') private readonly activityModel: Model<LeadActivityAttrs>
  ) {}

  async add(activity: Omit<LeadActivity, 'id'>): Promise<LeadActivity> {
    const created = await this.activityModel.create({
      leadId: activity.leadId,
      userId: activity.userId,
      authorName: activity.authorName,
      type: activity.type,
      content: activity.content,
      createdAt: activity.createdAt
    });
    return toEntity(created.toObject() as ActivityRow);
  }

  async list(leadId: string, page: number, limit: number): Promise<LeadActivityPage> {
    const [rows, total] = await Promise.all([
      this.activityModel
        .find({ leadId })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<ActivityRow[]>()
        .exec(),
      this.activityModel.countDocuments({ leadId }).exec()
    ]);
    return { items: rows.map(toEntity), total };
  }
}

function toEntity(row: ActivityRow): LeadActivity {
  return {
    id: String(row._id),
    leadId: String(row.leadId),
    userId: String(row.userId),
    authorName: row.authorName,
    type: row.type as LeadActivity['type'],
    content: row.content,
    createdAt: row.createdAt
  };
}
