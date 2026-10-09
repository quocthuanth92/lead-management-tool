export async function getServiceHealth(world) {
  if (!world.api) {
    await world.initApi();
  }
  return world.api.get('/api/v1/health');
}
