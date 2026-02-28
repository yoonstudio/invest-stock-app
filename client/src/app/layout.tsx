import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { MainLayout } from '@/components/layout/MainLayout';

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Investment MCP - 투자 정보 대시보드',
  description: 'AI 기반 실시간 투자 정보 서비스. 주식 가격, 포트폴리오 분석, 환율 정보를 한 곳에서 확인하세요.',
  keywords: ['투자', '주식', '포트폴리오', '환율', 'MCP', 'AI'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
      >
        <Providers>
          <MainLayout>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  );
}
