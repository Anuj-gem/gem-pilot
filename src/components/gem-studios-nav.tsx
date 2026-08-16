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
        background: 'rgba(14,11,20,0.92)',
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
            background: 'linear-gradient(135deg,#8b5cf6,#5B21B6)',
            borderRadius: '2px',
            transform: 'rotate(45deg)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.14em',
            color: '#fff',
            textTransform: 'uppercase',
          }}
        >
          GEM Studios
        </span>
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <a
          href="/#see"
          style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: 'rgba(243,239,232,0.6)',
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          What we do
        </a>
        <a
          href="/blog"
          style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: 'rgba(243,239,232,0.6)',
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          Blog
        </a>
        <a
          href="mailto:info@gem.studio"
          style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            color: '#C4B5FD',
            borderBottom: '1px solid rgba(196,181,253,0.45)',
            paddingBottom: '2px',
            fontWeight: 600,
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          Partner with us
        </a>
      </div>
    </nav>
  )
}
