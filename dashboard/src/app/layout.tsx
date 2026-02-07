import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GYWD Dashboard',
  description: 'Project intelligence dashboard for PMP-GYWD',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gywd-bg text-gywd-text antialiased">
        {children}
      </body>
    </html>
  );
}
