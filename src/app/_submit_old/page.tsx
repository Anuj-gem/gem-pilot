// OLD guided submit flow — DELETED.
// The submit page now lives at (app)/submit/page.tsx.
// This file must be removed to avoid route conflict.
// TODO: Delete this entire /app/submit/ directory.
import { redirect } from 'next/navigation'
export default function DeprecatedSubmit() { redirect('/submit') }
