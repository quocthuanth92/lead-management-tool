import type { ReactNode } from 'react';

import './globals.css';
import { Providers } from './providers';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
