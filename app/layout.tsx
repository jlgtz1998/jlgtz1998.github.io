import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../components/LanguageProvider';

export const metadata: Metadata = {
  title: 'CRAN3O Color Studio - OKLCH Generative Design Workspace',
  description: 'A premium color studio utility for architectural, CMF industrial, and graphic design systems using OKLCH and APCA contrast validation.',
  manifest: '/CRAN3O_Color_Studio/manifest.json',
  icons: {
    icon: '/CRAN3O_Color_Studio/icons/icon.svg',
    apple: '/CRAN3O_Color_Studio/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'CRAN3O Color Studio',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" id="studio-root-html">
      <body className="light">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
