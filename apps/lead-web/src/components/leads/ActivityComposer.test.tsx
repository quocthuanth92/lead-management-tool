import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ActivityComposer } from './ActivityComposer';

const fetchMock = jest.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as unknown as Response;
}

const createdActivity = {
  id: 'act-2',
  leadId: 'lead-1',
  type: 'CALL',
  content: 'Called the customer',
  authorName: 'Ava Stone',
  createdAt: '2026-10-12T10:00:00.000Z'
};

function renderComposer() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client}>
      <ActivityComposer leadId="lead-1" />
    </QueryClientProvider>
  );
}

function noteField(): HTMLTextAreaElement {
  return screen.getByLabelText('Activity note') as HTMLTextAreaElement;
}

function typeNote(text: string) {
  fireEvent.change(noteField(), { target: { value: text } });
}

function addButton() {
  return screen.getByRole('button', { name: 'Add' });
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('ActivityComposer', () => {
  it('defaults the type to Note and offers every activity type', () => {
    renderComposer();

    expect(screen.getByLabelText('Activity type')).toHaveValue('NOTE');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Call',
      'Email',
      'SMS',
      'Note',
      'Other'
    ]);
  });

  it('keeps Add disabled while the note is empty or only whitespace', () => {
    renderComposer();
    expect(addButton()).toBeDisabled();

    typeNote('   \n\t ');
    expect(addButton()).toBeDisabled();

    typeNote('Called back');
    expect(addButton()).toBeEnabled();
  });

  it('turns the counter red above 2000 characters and disables Add', () => {
    renderComposer();

    typeNote('a'.repeat(2000));
    const counter = screen.getByText('2000 / 2000');
    expect(counter).not.toHaveClass('text-destructive');
    expect(addButton()).toBeEnabled();

    typeNote('a'.repeat(2001));
    expect(screen.getByText('2001 / 2000')).toHaveClass('text-destructive');
    expect(addButton()).toBeDisabled();
  });

  it('submits with Ctrl+Enter, sends the trimmed note and clears the field on success', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, createdActivity));
    renderComposer();
    fireEvent.change(screen.getByLabelText('Activity type'), { target: { value: 'CALL' } });
    typeNote('  Called the customer  ');

    fireEvent.keyDown(noteField(), { key: 'Enter', ctrlKey: true });

    await waitFor(() => expect(noteField()).toHaveValue(''));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/lead-service/leads/lead-1/activities');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      type: 'CALL',
      content: 'Called the customer'
    });
  });

  it('also submits with Cmd+Enter', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, createdActivity));
    renderComposer();
    typeNote('Follow up Monday');

    fireEvent.keyDown(noteField(), { key: 'Enter', metaKey: true });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it('lets Enter insert a newline without submitting', () => {
    renderComposer();
    typeNote('First line');

    fireEvent.keyDown(noteField(), { key: 'Enter' });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(noteField()).toHaveValue('First line');
  });

  it('keeps the note and shows the error when saving fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { message: 'Note is too long' }));
    renderComposer();
    typeNote('Called the customer');

    fireEvent.click(addButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Note is too long');
    expect(noteField()).toHaveValue('Called the customer');
  });
});
