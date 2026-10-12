import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LoginForm } from './login-form';

const mockReplace = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh })
}));

const fetchMock = jest.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as unknown as Response;
}

beforeEach(() => {
  mockReplace.mockReset();
  mockRefresh.mockReset();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginForm', () => {
  it('validates input before calling the BFF', async () => {
    render(<LoginForm nextPath="/leads" />);

    fillAndSubmit('not-an-email', '');

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the generic error for rejected credentials', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        statusCode: 401,
        message: 'Invalid email or password',
        error: 'Unauthorized'
      })
    );
    render(<LoginForm nextPath="/leads" />);

    fillAndSubmit('sales.a@example.com', 'wrong-pass');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('disables the submit button while the request is in flight', async () => {
    let resolveRequest: (value: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (resolveRequest = resolve)));
    render(<LoginForm nextPath="/leads" />);

    fillAndSubmit('sales.a@example.com', 'secret-pass');

    const button = await screen.findByRole('button', { name: 'Signing in…' });
    expect(button).toBeDisabled();

    resolveRequest(jsonResponse(200, { user: { fullName: 'Ava' } }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/leads'));
  });

  it('redirects to the requested path after a successful sign-in', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { user: { fullName: 'Ava' } }));
    render(<LoginForm nextPath="/leads/65f1a2b3c4d5e6f7a8b9c0d1" />);

    fillAndSubmit('sales.a@example.com', 'secret-pass');

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/leads/65f1a2b3c4d5e6f7a8b9c0d1')
    );
    expect(mockRefresh).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, { method?: string }];
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
  });
});
