import type { Metadata } from 'next';
import './globals.css';
import ErrorLogger from './ErrorLogger';

export const metadata: Metadata = {
  title: 'OrbitGuard — Space Debris Collision Risk Estimator',
  description:
    'Real-time space debris collision risk estimation for low Earth orbit. Built for SprintStack Hackathon PS09.',
  keywords: ['space debris', 'collision risk', 'ISRO', 'orbital mechanics', 'PS09', 'SprintStack'],
  openGraph: {
    title: 'OrbitGuard',
    description: 'Space Debris Collision Risk Estimator — PS09',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ErrorLogger />
        {children}
      </body>
    </html>
  );
}
