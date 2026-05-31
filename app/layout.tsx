import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quiet Future Color Studio - OKLCH Generative Design Workspace',
  description: 'A premium color studio utility for architectural, CMF industrial, and graphic design systems using OKLCH and APCA contrast validation.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'Quiet Future',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="light">
        {children}
      </body>
    </html>
  );
}
