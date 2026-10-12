import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';

import { LabelSelect } from './LabelSelect';

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

const mockToastError = toast.error as unknown as jest.Mock;
const fetchMock = jest.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as unknown as Response;
}

function saveResponse(label: string): Response {
  return jsonResponse(200, { id: 'lead-1', label, lastUpdate: '2026-10-12T10:00:00.000Z' });
}

function renderLabelSelect(label: 'UNLABELED' | 'POTENTIAL' | 'SPAM' = 'UNLABELED') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client}>
      <LabelSelect leadId="lead-1" label={label} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  mockToastError.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('LabelSelect', () => {
  it('shows exactly one selected value, with one option per label', () => {
    renderLabelSelect('POTENTIAL');

    const select = screen.getByRole('combobox', { name: 'Label' }) as HTMLSelectElement;
    expect(select).toHaveValue('POTENTIAL');
    expect(select.selectedOptions).toHaveLength(1);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Unlabeled',
      'Potential',
      'Spam'
    ]);
  });

  it('shows the new label immediately while the change is saving', async () => {
    let resolveSave: (value: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (resolveSave = resolve)));
    renderLabelSelect();
    const select = screen.getByRole('combobox', { name: 'Label' });

    fireEvent.change(select, { target: { value: 'SPAM' } });

    expect(select).toHaveValue('SPAM');
    resolveSave(saveResponse('SPAM'));
    await waitFor(() => expect(select).toBeEnabled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/lead-service/leads/lead-1/label');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ label: 'SPAM' });
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('disables the control while the label is saving', async () => {
    let resolveSave: (value: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (resolveSave = resolve)));
    renderLabelSelect();
    const select = screen.getByRole('combobox', { name: 'Label' });

    fireEvent.change(select, { target: { value: 'POTENTIAL' } });

    expect(select).toBeDisabled();
    resolveSave(saveResponse('POTENTIAL'));
    await waitFor(() => expect(select).toBeEnabled());
  });

  it('rolls the value back and shows a toast when saving fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { message: 'Database unavailable' }));
    renderLabelSelect('UNLABELED');
    const select = screen.getByRole('combobox', { name: 'Label' });

    fireEvent.change(select, { target: { value: 'SPAM' } });

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Could not update the label. Try again.')
    );
    expect(select).toHaveValue('UNLABELED');
    expect(select).toBeEnabled();
  });
});
