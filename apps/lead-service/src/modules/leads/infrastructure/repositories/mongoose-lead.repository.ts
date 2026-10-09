import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LeadAttrs } from '@lead/persistence';
import { Model, Types } from 'mongoose';

import { Lead } from '../../domain/entities/lead.entity';
import { LeadRepositoryPort } from '../../domain/ports/lead-repository.port';

@Injectable()
export class MongooseLeadRepository implements LeadRepositoryPort {
  constructor(@InjectModel('Lead') private readonly leadModel: Model<LeadAttrs>) {}

  async findById(id: string): Promise<Lead | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const row = await this.leadModel.findById(id).lean().exec();
    if (!row) {
      return null;
    }
    return {
      id: String(row._id),
      ...(row.userId ? { userId: String(row.userId) } : {}),
      customerName: row.fullName,
      phone: row.phone,
      ...(row.email ? { email: row.email } : {}),
      message: row.message,
      source: row.source,
      label: row.label,
      hasView: row.hasView,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}
