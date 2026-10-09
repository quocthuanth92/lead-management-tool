import { buildSearchFields, normalizePhone, registerModels } from '@lead/persistence';
import mongoose from 'mongoose';

import { ScryptPasswordHasher } from '../modules/auth/infrastructure/scrypt-password-hasher';

async function seed(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  const emailA = process.env.E2E_USER_A_EMAIL;
  const emailB = process.env.E2E_USER_B_EMAIL;
  const password = process.env.SEED_SALESPERSON_PASSWORD;
  if (!mongoUri || !emailA || !emailB || !password) {
    throw new Error(
      'Seed requires MONGODB_URI, E2E_USER_A_EMAIL, E2E_USER_B_EMAIL, and SEED_SALESPERSON_PASSWORD'
    );
  }

  await mongoose.connect(mongoUri);
  try {
    const models = registerModels(mongoose.connection);
    const salespeople = await Promise.all(
      [emailA, emailB].map(async (email, index) => {
        const passwordHash = await new ScryptPasswordHasher().hash(password);
        return models.User.findOneAndUpdate(
          { email: email.trim().toLowerCase() },
          {
            $setOnInsert: {
              email: email.trim().toLowerCase(),
              passwordHash,
              fullName: `Salesperson ${index + 1}`,
              role: 'SALESPERSON',
              isActive: true
            }
          },
          { upsert: true, new: true }
        );
      })
    );

    if (process.argv.includes('--with-samples')) {
      const samples = [
        { fullName: 'Sample Lead One', phone: '+15550000001', message: 'Sample enquiry' },
        { fullName: 'Sample Lead Two', phone: '+15550000002', message: 'Sample test drive' }
      ];
      for (const [index, sample] of samples.entries()) {
        const phone = normalizePhone(sample.phone);
        if (!phone) {
          throw new Error('Configured sample phone number is invalid');
        }
        const existing = await models.Lead.exists({ phone });
        if (existing) {
          continue;
        }
        const createdAt = new Date();
        const lead = await models.Lead.create({
          userId: salespeople[index % salespeople.length]?._id,
          assignmentStatus: 'ASSIGNED',
          ...sample,
          phone,
          source: 'INTERNAL',
          label: 'UNLABELED',
          hasView: false,
          ...buildSearchFields({ fullName: sample.fullName, phone }),
          schemaVersion: 1,
          createdAt,
          updatedAt: createdAt
        });
        await models.LeadActivity.create({
          leadId: lead._id,
          userId: salespeople[index % salespeople.length]?._id,
          authorName: salespeople[index % salespeople.length]?.fullName,
          type: 'NOTE',
          content: 'Sample follow-up activity',
          createdAt
        });
      }
    }
    console.log(`Seeded salespeople: ${emailA}, ${emailB}`);
  } finally {
    await mongoose.disconnect();
  }
}

void seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seed failed');
  process.exitCode = 1;
});
