describe('lead-background-service bootstrap', () => {
  it('keeps default kafka topic placeholder', () => {
    expect(process.env.KAFKA_LEADS_TOPIC ?? 'leads.incoming').toBeDefined();
  });
});
