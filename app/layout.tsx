import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../components/LanguageProvider';

const BASE_PATH = process.env.NODE_ENV === 'production' ? '/CRAN3O_Color_Studio' : '';

export const metadata: Metadata = {
  title: 'CRAN3O Color Studio - OKLCH Generative Design Workspace',
  description: 'A premium color studio utility for architectural, CMF industrial, and graphic design systems using OKLCH and APCA contrast validation.',
  manifest: `${BASE_PATH}/manifest.json`,
  icons: {
    icon: `${BASE_PATH}/icons/icon.svg`,
    apple: `${BASE_PATH}/icons/icon.svg`,
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
