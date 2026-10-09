import { render, screen } from '@testing-library/react';
import React from 'react';

import LeadDetailsPage from './(app)/leads/[id]/page';
import LeadsInboxPage from './(app)/leads/page';
import LoginPage from './(auth)/login/page';

describe('app shell routes', () => {
  it('renders login page shell', () => {
    render(React.createElement(LoginPage));
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('renders lead inbox shell', () => {
    render(React.createElement(LeadsInboxPage));
    expect(screen.getByRole('heading', { name: 'Lead Inbox' })).toBeInTheDocument();
  });

  it('renders lead details shell', async () => {
    const page = LeadDetailsPage({ params: { id: '123' } });
    render(page);
    expect(screen.getByText('Lead 123 placeholder.')).toBeInTheDocument();
  });
});
