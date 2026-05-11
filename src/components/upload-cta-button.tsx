'use client'

/**
 * UploadCTAButton — fires the global upload modal event instead of
 * navigating to the landing page.  Drop-in replacement for any
 * <Link href="/">Upload a script</Link> on app pages.
 */
export function UploadCTAButton({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => window.dispatchEvent(new Event('gem:open-script-upload-modal'))}
    >
      {children}
    </button>
  )
}
