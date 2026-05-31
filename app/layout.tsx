import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRAN3O COLOR - OKLCH Generative Design Workspace',
  description: 'A premium color studio utility for architectural, CMF industrial, and graphic design systems using OKLCH and APCA contrast validation.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'CRAN3O COLOR',
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
