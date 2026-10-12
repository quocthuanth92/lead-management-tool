import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '@lead/persistence';

import { USER_REPOSITORY_PORT } from './domain/ports/user-repository.port';
import { MongooseUserRepository } from './infrastructure/mongoose-user.repository';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema, collection: 'users' }])],
  providers: [
    MongooseUserRepository,
    { provide: USER_REPOSITORY_PORT, useExisting: MongooseUserRepository }
  ],
  exports: [USER_REPOSITORY_PORT, MongooseModule]
})
export class UsersModule {}
