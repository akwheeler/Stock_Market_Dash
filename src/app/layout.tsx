import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SPY Analytics Dashboard | HMM & LSTM Market Analysis',
  description: 'Production-ready SPY ETF analytics dashboard with Hidden Markov Models, LSTM neural networks, regime detection, and multi-model consensus trading signals.',
  openGraph: {
    title: 'SPY Analytics Dashboard',
    description: 'ML-powered market regime detection and trading signal generation for SPY ETF',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0a0e17] text-[#e2e8f0] antialiased">
        {children}
        <footer className="disclaimer text-center px-4 pb-6 max-w-4xl mx-auto">
          <strong>Disclaimer:</strong> This application is for educational and research purposes only.
          It does not constitute financial advice. The models are simplified implementations trained on
          historical data and have no predictive power over future market movements. Past performance does
          not guarantee future results. Always consult a qualified financial advisor before making investment decisions.
        </footer>
      </body>
    </html>
  );
}
