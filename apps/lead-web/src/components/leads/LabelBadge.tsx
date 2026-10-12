import type { LeadLabel } from '@lead/shared-contracts';

import { Badge } from '@/components/ui/badge';
import { LABEL_TEXT } from '@/lib/leads/presentation';
import { cn } from '@/lib/utils';

const LABEL_CLASSES: Record<LeadLabel, string> = {
  UNLABELED: 'border-border bg-muted text-foreground',
  POTENTIAL: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  SPAM: 'border-red-300 bg-red-100 text-red-900'
};

export function LabelBadge({ label, className }: { label: LeadLabel; className?: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium', LABEL_CLASSES[label], className)}>
      {LABEL_TEXT[label]}
    </Badge>
  );
}
