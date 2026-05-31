import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Smart Food & Grocery Scheduler',
    template: '%s | Food Scheduler',
  },
  description: 'Plan meals, manage groceries, reduce food waste, and track household food consumption',
  keywords: ['meal planning', 'grocery management', 'food waste', 'Indian recipes', 'family meals'],
  authors: [{ name: 'Smart Food Scheduler' }],
  openGraph: {
    type: 'website',
    title: 'Smart Food & Grocery Scheduler',
    description: 'Plan meals, manage groceries, reduce food waste',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
