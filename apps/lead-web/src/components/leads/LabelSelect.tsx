'use client';

import type { LeadLabel } from '@lead/shared-contracts';
import { LEAD_LABELS } from '@lead/shared-contracts';
import { useId, useState } from 'react';
import { toast } from 'sonner';

import { useSetLabel } from '@/hooks/useSetLabel';
import { LABEL_TEXT } from '@/lib/leads/presentation';

export function isLeadLabel(value: string): value is LeadLabel {
  return (LEAD_LABELS as readonly string[]).includes(value);
}

interface LabelSelectProps {
  leadId: string;
  label: LeadLabel;
}

export function LabelSelect({ leadId, label }: LabelSelectProps) {
  const selectId = useId();
  const [pendingLabel, setPendingLabel] = useState<LeadLabel | null>(null);
  const setLabel = useSetLabel(leadId);

  const handleChange = (next: LeadLabel) => {
    setPendingLabel(next);
    setLabel.mutate(next, {
      onError: () => toast.error('Could not update the label. Try again.'),
      onSettled: () => setPendingLabel(null)
    });
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="text-sm font-medium text-muted-foreground">
        Label
      </label>
      <select
        id={selectId}
        value={pendingLabel ?? label}
        disabled={setLabel.isPending}
        onChange={(event) => handleChange(event.target.value as LeadLabel)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {LEAD_LABELS.map((option) => (
          <option key={option} value={option}>
            {LABEL_TEXT[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
