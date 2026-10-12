'use client';

import type { ActivityType } from '@lead/shared-contracts';
import { ACTIVITY_TYPES, DEFAULT_ACTIVITY_TYPE, LIMITS } from '@lead/shared-contracts';
import type { FormEvent, KeyboardEvent } from 'react';
import { useId, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAddActivity } from '@/hooks/useAddActivity';
import { ApiError } from '@/lib/api/client';
import { ACTIVITY_TYPE_TEXT } from '@/lib/leads/presentation';
import { cn } from '@/lib/utils';

const FALLBACK_ERROR_MESSAGE = 'Could not add the activity. Try again.';

interface ActivityComposerProps {
  leadId: string;
}

export function ActivityComposer({ leadId }: ActivityComposerProps) {
  const typeId = useId();
  const noteId = useId();
  const counterId = useId();
  const [type, setType] = useState<ActivityType>(DEFAULT_ACTIVITY_TYPE);
  const [content, setContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const addActivity = useAddActivity(leadId);

  // The server trims the note before checking its length, so the counter does the same.
  const trimmed = content.trim();
  const length = trimmed.length;
  const isOverLimit = length > LIMITS.NOTE_MAX;
  const canSubmit = length > 0 && !isOverLimit && !addActivity.isPending;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    setErrorMessage(null);
    try {
      await addActivity.mutateAsync({ type, content: trimmed });
      setContent('');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : FALLBACK_ERROR_MESSAGE);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Add activity</h2>
      <div className="flex items-center gap-2">
        <label htmlFor={typeId} className="text-sm font-medium text-muted-foreground">
          Activity type
        </label>
        <select
          id={typeId}
          value={type}
          onChange={(event) => setType(event.target.value as ActivityType)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {ACTIVITY_TYPES.map((option) => (
            <option key={option} value={option}>
              {ACTIVITY_TYPE_TEXT[option]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor={noteId} className="text-sm font-medium text-muted-foreground">
          Activity note
        </label>
        <Textarea
          id={noteId}
          rows={3}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-invalid={isOverLimit || undefined}
          aria-describedby={counterId}
        />
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Ctrl+Enter to add</span>
          <span
            id={counterId}
            className={cn(
              'tabular-nums text-muted-foreground',
              isOverLimit && 'font-medium text-destructive'
            )}
          >
            {length} / {LIMITS.NOTE_MAX}
          </span>
        </div>
      </div>
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          Add
        </Button>
      </div>
    </form>
  );
}
