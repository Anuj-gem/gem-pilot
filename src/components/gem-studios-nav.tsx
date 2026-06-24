// Minimal GEM Studios nav for static pages (blog, etc.)
// Matches the dark editorial nav on gem.studio landing.

export default function GemStudiosNav() {
  return (
    <nav
      style={{
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        position: 'sticky',
        top: 0,
        background: '#0A0A0A',
        zIndex: 100,
        fontFamily: 'Inter, -apple-system, sans-serif',
        fontWeight: 300,
      }}
    >
      <a
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            width: '15px',
            height: '15px',
            background: '#7C3AED',
            borderRadius: '2px',
            transform: 'rotate(45deg)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 400,
            letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.85)',
            textTransform: 'uppercase',
          }}
        >
          GEM Studios
        </span>
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <a
          href="/blog"
          style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.52)',
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          Blog
        </a>
        <a
          href="/pitch"
          style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.75)',
            borderBottom: '0.5px solid rgba(255,255,255,0.25)',
            paddingBottom: '2px',
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          Submit a project
        </a>
      </div>
    </nav>
  )
}
