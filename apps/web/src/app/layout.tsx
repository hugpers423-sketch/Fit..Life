import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NutriFlow — Nutrición y fitness en un solo plan',
  description: 'Registra tus comidas y entrenos, calcula tu IMC y alcanza tus metas con un plan hecho para ti.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#15803d' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
