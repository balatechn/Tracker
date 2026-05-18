import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'NGI Tracker — Domain & SaaS Management',
  description: 'National Group India — IT Asset Renewal Tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-surface text-gray-800 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
