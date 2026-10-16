import Link from 'next/link'
import * as React from 'react'

type AppLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  /** Force external behavior even when href is relative. */
  external?: boolean
}

function isExternalHref(href: string, external?: boolean): boolean {
  if (external) return true
  return /^(https?:|mailto:|tel:)/i.test(href)
}

/**
 * Client-side navigation for in-app routes; plain anchors for external URLs.
 * ChaiUI shells ship with raw `<a>` tags — swap those for this in QueueKit.
 */
export const AppLink = React.forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink(
  { href, external, children, ...props },
  ref,
) {
  if (isExternalHref(href, external)) {
    const { target, rel, ...rest } = props
    return (
      <a ref={ref} href={href} target={target ?? '_blank'} rel={rel ?? 'noopener noreferrer'} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <Link ref={ref} href={href} {...props}>
      {children}
    </Link>
  )
})
