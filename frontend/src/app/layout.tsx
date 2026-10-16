import type { Metadata } from 'next'

import { PageShell } from '@/components/page-shell'
import { QueryProvider } from '@/components/query-provider'
import { ThemeProvider, ThemeScript } from '@/components/theme-provider'
import { SITE } from '@/lib/site'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} · ${SITE.descriptor}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.promise,
  applicationName: SITE.name,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <PageShell>{children}</PageShell>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
