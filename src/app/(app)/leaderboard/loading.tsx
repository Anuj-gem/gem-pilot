export default function LeaderboardLoading() {
  return (
    <div style={{
      background: '#2b1a55',
      minHeight: '100vh',
      width: '100vw',
      position: 'relative',
      left: '50%',
      marginLeft: '-50vw',
      marginTop: '-24px',
      paddingTop: '24px',
      marginBottom: '-64px',
      paddingBottom: '64px',
    }}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <div className="h-8 w-40 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div className="mb-6 flex gap-3">
          <div className="h-8 w-20 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-8 w-24 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-8 w-20 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl" style={{ height: 280, background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
