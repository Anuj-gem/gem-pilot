// Intercepting route — fires when the user clicks a /report/[id] link
// from inside the dashboard segment. Renders the ReportModal which
// loads the standalone report page in an iframe.
//
// The `(..)` matcher means: from this file's segment (dashboard), go up
// one level to find the `report` route. URL becomes /report/[id] while
// the dashboard remains the underlying page.
//
// Anuj 2026-04-30 v0.7.

import { ReportModal } from '@/components/dashboard/report-modal'

export default async function InterceptedReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ReportModal reportId={id} />
}
