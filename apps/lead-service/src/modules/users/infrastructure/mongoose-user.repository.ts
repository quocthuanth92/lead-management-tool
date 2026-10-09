import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserAttrs } from '@lead/persistence';
import { Model, Types } from 'mongoose';

import { UserRecord, UserRepositoryPort } from '../domain/ports/user-repository.port';

@Injectable()
export class MongooseUserRepository implements UserRepositoryPort {
  constructor(@InjectModel('User') private readonly userModel: Model<UserAttrs>) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.userModel.findOne({ email: email.trim().toLowerCase() }).lean().exec();
    return row ? this.toUser(row) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const row = await this.userModel.findById(id).lean().exec();
    return row ? this.toUser(row) : null;
  }

  private toUser(row: UserAttrs & { _id: Types.ObjectId }): UserRecord {
    return {
      id: String(row._id),
      email: row.email,
      passwordHash: row.passwordHash,
      fullName: row.fullName,
      role: row.role,
      isActive: row.isActive
    };
  }
}
