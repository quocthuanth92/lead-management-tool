import { APIResponse } from '@playwright/test';

import { CustomWorld } from './world';

export async function getServiceHealth(world: CustomWorld): Promise<APIResponse> {
  if (!world.api) {
    await world.initApi();
  }
  return world.api!.get('/api/v1/health');
}
