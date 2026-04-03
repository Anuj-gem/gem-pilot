'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackBlurredReportViewed, trackReportUnlocked } from '@/lib/posthog'

interface ReportAnalyticsProps {
  evaluationId: string
  isBlurred: boolean
}

/**
 * Fires analytics events for the report page.
 * - blurred_report_viewed: when a non-subscriber sees the blurred report
 * - report_unlocked: when a user returns from Stripe and sees the full report
 */
export function ReportAnalytics({ evaluationId, isBlurred }: ReportAnalyticsProps) {
  const searchParams = useSearchParams()
  const justSubscribed = searchParams.get('subscribed') === 'true'

  useEffect(() => {
    if (isBlurred) {
      trackBlurredReportViewed({ evaluationId })
    }
    if (justSubscribed && !isBlurred) {
      trackReportUnlocked({ evaluationId })
    }
  }, [evaluationId, isBlurred, justSubscribed])

  return null
}
