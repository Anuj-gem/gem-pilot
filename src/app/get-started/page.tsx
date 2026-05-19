import { Suspense } from 'react'
import GetStartedClient from './get-started-client'

export const metadata = {
  title: 'Get Started — GEM',
  description:
    'Upload your screenplay and get matched with industry opportunities.',
}

export default function GetStartedPage() {
  return (
    <Suspense fallback={null}>
      <GetStartedClient />
    </Suspense>
  )
}
