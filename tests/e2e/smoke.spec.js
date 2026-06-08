import { expect, test } from '@playwright/test'

test('host routes mount micro apps and clear Vue hash route on React switch', async ({
  page,
}) => {
  // 主应用首页：验证 shell 自身能正常启动。
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Host Overview' }),
  ).toBeVisible()
  await expect(page.getByText('Registered apps')).toBeVisible()

  // React 子应用：验证 qiankun 能按 /react-dashboard 拉取并挂载 React 应用。
  await page.goto('/react-dashboard')
  await expect(
    page.getByRole('heading', { name: 'Revenue Dashboard' }),
  ).toBeVisible()
  await expect(page.locator('#micro-app-container')).toContainText(
    'Active users',
  )

  // Vue 子应用：首页先挂载，再进入一个内部 hash 路由。
  await page.goto('/vue3-app')
  await expect(page.getByRole('heading', { name: 'Vue3 App' })).toBeVisible()
  await expect(page.locator('#micro-app-container')).toContainText('首页')

  await page
    .locator('#micro-app-container')
    .getByRole('menuitem', { name: '拨测池管理' })
    .click()
  await expect(page).toHaveURL(/\/vue3-app\/?#\/dial\/pool/)
  await expect(page.locator('#micro-app-container')).toContainText('拨测池管理')

  // 回到 React 子应用时，pathname 和 hash 都不能残留 Vue 的内部路由。
  await page.getByRole('button', { name: 'React Dashboard' }).click()
  await expect(page).toHaveURL(/\/react-dashboard$/)
  await expect(
    page.getByRole('heading', { name: 'Revenue Dashboard' }),
  ).toBeVisible()

  const currentUrl = new URL(page.url())
  expect(currentUrl.pathname).toBe('/react-dashboard')
  expect(currentUrl.hash).toBe('')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
