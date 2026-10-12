'use client';

import { useId } from 'react';

import { LEAD_LABELS, type LeadLabel } from '@lead/shared-contracts';

import { LABEL_TEXT } from '@/lib/leads/presentation';

interface LabelFilterProps {
  value: LeadLabel | '';
  onChange: (label: LeadLabel | '') => void;
}

export function LabelFilter({ value, onChange }: LabelFilterProps) {
  const id = useId();

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        Label
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as LeadLabel | '')}
        className="h-9 rounded-md border bg-background px-2 text-sm"
      >
        <option value="">All labels</option>
        {LEAD_LABELS.map((label) => (
          <option key={label} value={label}>
            {LABEL_TEXT[label]}
          </option>
        ))}
      </select>
    </div>
  );
}
