import { LeadDetailsView } from '@/components/leads/LeadDetailsView';
import { sanitizeInternalPath } from '@/lib/auth/route-guard';

const INBOX_PATH = '/leads';

interface LeadDetailsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}

export default async function LeadDetailsPage({ params, searchParams }: LeadDetailsPageProps) {
  const { id } = await params;
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = sanitizeInternalPath(
    Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo,
    INBOX_PATH
  );
  const isInboxPath =
    returnTo === INBOX_PATH ||
    returnTo.startsWith(`${INBOX_PATH}?`) ||
    returnTo.startsWith(`${INBOX_PATH}/`);

  return <LeadDetailsView leadId={id} returnTo={isInboxPath ? returnTo : INBOX_PATH} />;
}
