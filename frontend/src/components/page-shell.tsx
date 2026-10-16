import { BookOpen, Database, Layers, LayoutDashboard } from 'lucide-react'
import * as React from 'react'

import { AppLink } from '@/components/app-link'
import { Backdrop } from '@/components/backdrop'
import { Footer, type FooterSection } from '@/components/footer'
import { Navbar, type NavLink } from '@/components/navbar'
import { QueueKitLogo } from '@/components/queuekit-logo'
import { SITE } from '@/lib/site'

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.295 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  )
}

/**
 * QueueKit page frame: ChaiUI backdrop, sticky navbar, max-w-6xl column, footer.
 * Nav matches product IA: Overview · Redis Lab · Queue Studio · Docs · GitHub.
 */
export const NAV_LINKS: NavLink[] = [
  { label: 'Overview', href: '/', icon: <LayoutDashboard className="size-4" /> },
  { label: 'Redis Lab', href: '/playground', icon: <Database className="size-4" /> },
  { label: 'Queue Studio', href: '/queues', icon: <Layers className="size-4" /> },
  { label: 'Docs', href: '/docs', icon: <BookOpen className="size-4" /> },
  {
    label: 'GitHub',
    href: SITE.githubUrl,
    external: true,
    icon: <GitHubIcon className="size-4" />,
  },
]

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Redis Lab', href: '/playground' },
      { label: 'Queue Studio', href: '/queues' },
      { label: 'Docs', href: '/docs' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'About', href: '/about' },
      { label: 'GitHub', href: SITE.githubUrl, external: true },
      { label: 'AsterIQ', href: 'https://asteriq.in', external: true },
    ],
  },
  {
    title: 'Labs',
    wide: true,
    links: [
      { label: 'Keys and TTL', href: '/playground/keys' },
      { label: 'Cache-aside', href: '/playground/cache' },
      { label: 'Rate limits', href: '/playground/limits' },
      { label: 'Job lifecycle', href: '/queues/jobs' },
      { label: 'Workers', href: '/queues/workers' },
    ],
  },
]

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-[3px] focus:ring-ring/50"
      >
        Skip to main content
      </a>
      <Backdrop />
      <div className="mx-auto flex w-full flex-1 flex-col sm:max-w-6xl">
        <Navbar
          logo={
            <AppLink
              href="/"
              aria-label="QueueKit home"
              className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <QueueKitLogo />
            </AppLink>
          }
          links={NAV_LINKS}
        />
        <main id="main-content" className="flex flex-1 flex-col gap-y-4 p-6 sm:p-12">
          {children}
        </main>
        <Footer
          logo={<QueueKitLogo />}
          tagline={SITE.descriptor}
          owner={SITE.owner}
          disclaimer={SITE.disclaimer}
          sections={FOOTER_SECTIONS}
        />
      </div>
    </div>
  )
}
