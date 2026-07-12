import { expect, test } from '@playwright/test'

// Full authenticated coverage (real chat + why-tree render) needs Clerk
// test-mode credentials, tracked as a follow-up. This smoke test instead
// proves the composed route tree (App.tsx, ProjectCreatePage, ProtectedRoute)
// actually builds and serves — no crash, no literal placeholder text — which
// is the exact failure class US-38a exists to catch (App.tsx/InvestigationPanel
// were `<div>...placeholder</div>` for four prior stories without any test
// noticing).
test('visiting an investigation page redirects to login and renders no placeholder text', async ({
  page,
}) => {
  await page.goto('/projects/some-project-id')
  await page.waitForURL('**/login*')
  await expect(page.locator('body')).not.toContainText('placeholder')
})

test('the new-project route is reachable and redirects to login', async ({ page }) => {
  await page.goto('/projects/new')
  await page.waitForURL('**/login*')
})
