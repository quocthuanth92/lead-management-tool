interface LeadDetailsPageProps {
  params: { id: string };
}

export default function LeadDetailsPage({ params }: LeadDetailsPageProps) {
  const { id } = params;
  return (
    <main>
      <h1>Lead Details</h1>
      <p>Lead {id} placeholder.</p>
    </main>
  );
}
