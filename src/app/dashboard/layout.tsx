// /dashboard/layout.tsx — provides a `@modal` parallel-route slot so the
// dashboard can render a centered report modal *over* the dashboard
// without unmounting it. The intercepting route at
//   /dashboard/@modal/(..)report/[id]/page.tsx
// fires when the user clicks a script card from inside the dashboard;
// closing the modal navigates back and the slot returns to default.
//
// Anuj 2026-04-30 v0.7.

export default function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
