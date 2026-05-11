/**
 * Test helpers for GEM E2E tests.
 *
 * AUTH SETUP:
 * These tests need two Supabase test accounts:
 *   1. A FREE user  — subscription_status != 'active'
 *   2. A PRO user   — subscription_status == 'active'
 *
 * Set these env vars before running:
 *   TEST_FREE_EMAIL    — email for the free test account
 *   TEST_FREE_PASSWORD — password for the free test account
 *   TEST_PRO_EMAIL     — email for the Pro test account
 *   TEST_PRO_PASSWORD  — password for the Pro test account
 *   TEST_BASE_URL      — defaults to https://gem-pilot.vercel.app
 *
 * Create these accounts manually in Supabase, upload a script on each,
 * and set subscription_status = 'active' on the Pro account's profile row.
 */

import { Page } from '@playwright/test'

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  // Wait for redirect to dashboard or wherever
  await page.waitForURL(/\/(dashboard|start|review)/, { timeout: 15000 })
}

export function getFreeCredentials() {
  const email = process.env.TEST_FREE_EMAIL
  const password = process.env.TEST_FREE_PASSWORD
  if (!email || !password) {
    throw new Error('Set TEST_FREE_EMAIL and TEST_FREE_PASSWORD env vars')
  }
  return { email, password }
}

export function getProCredentials() {
  const email = process.env.TEST_PRO_EMAIL
  const password = process.env.TEST_PRO_PASSWORD
  if (!email || !password) {
    throw new Error('Set TEST_PRO_EMAIL and TEST_PRO_PASSWORD env vars')
  }
  return { email, password }
}
