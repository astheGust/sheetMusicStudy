import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Instrument_Serif } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Cadenza — Sua biblioteca de partituras de piano',
  description:
    'Organize suas partituras de piano, acompanhe o que está dominado, enferrujado ou em leitura e escolha o que estudar hoje.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#16171b',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`dark ${geist.variable} ${display.variable}`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
