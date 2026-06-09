import { expect, test } from '@playwright/test'

function microAppContainer(page) {
  return page.locator('#micro-app-container')
}

function activeMicroStatus(page) {
  return page.locator('.topbar .status')
}

async function clickVueMenuItem(page, name, urlPattern) {
  const menuItem = microAppContainer(page).getByRole('menuitem', { name, exact: true })
  await expect(menuItem).toBeVisible()
  await expect(async () => {
    await menuItem.click()
    await expect(page).toHaveURL(urlPattern, { timeout: 2000 })
  }).toPass({ timeout: 10_000 })
}

test('host routes mount micro apps and clear Vue hash route on React switch', async ({ page }) => {
  // 主应用首页：验证 shell 自身能正常启动。
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Host Overview' })).toBeVisible()
  await expect(page.getByText('Registered apps')).toBeVisible()

  // React 子应用：验证 qiankun 能按 /react-dashboard 拉取并挂载 React 应用。
  await page.goto('/react-dashboard')
  await expect(page.getByRole('heading', { name: 'Revenue Dashboard' })).toBeVisible()
  await expect(microAppContainer(page)).toContainText('Active users')

  // Vue 子应用：首页先挂载，再进入一个内部 hash 路由。
  await page.goto('/vue3-app')
  await expect(page.getByRole('heading', { name: 'Vue3 App' })).toBeVisible()
  await expect(microAppContainer(page)).toContainText('首页')

  await clickVueMenuItem(page, '拨测池管理', /\/vue3-app\/?#\/dial\/pool/)
  await expect(microAppContainer(page)).toContainText('拨测池管理')

  // 回到 React 子应用时，pathname 和 hash 都不能残留 Vue 的内部路由。
  await page.getByRole('button', { name: 'React Dashboard' }).click()
  await expect(page).toHaveURL(/\/react-dashboard$/)
  await expect(page.getByRole('heading', { name: 'Revenue Dashboard' })).toBeVisible()

  const currentUrl = new URL(page.url())
  expect(currentUrl.pathname).toBe('/react-dashboard')
  expect(currentUrl.hash).toBe('')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('Vue app can mount and unmount repeatedly without route leakage', async ({ page }) => {
  await page.addInitScript(() => {
    window.__MICRO_APP_STATUS_EVENTS__ = []
    window.addEventListener('micro-app-status', (event) => {
      window.__MICRO_APP_STATUS_EVENTS__.push(event.detail)
    })
  })

  await page.goto('/vue3-app')
  await expect(page.getByRole('heading', { name: 'Vue3 App' })).toBeVisible()
  await expect(activeMicroStatus(page)).toHaveText('mounted')
  await clickVueMenuItem(page, '拨测池管理', /\/vue3-app\/?#\/dial\/pool/)
  await expect(microAppContainer(page)).toContainText('拨测池管理')

  await page.getByRole('button', { name: 'React Dashboard' }).click()
  await expect(page).toHaveURL(/\/react-dashboard$/)
  await expect(page.getByRole('heading', { name: 'Revenue Dashboard' })).toBeVisible()
  await expect(activeMicroStatus(page)).toHaveText('mounted')
  await expect(microAppContainer(page)).not.toContainText('Vue3 App')

  await page.getByRole('button', { name: 'Vue3 App' }).click()
  await expect(page.getByRole('heading', { name: 'Vue3 App' })).toBeVisible()
  await expect(activeMicroStatus(page)).toHaveText('mounted')
  await expect(microAppContainer(page)).toContainText('首页')
  await clickVueMenuItem(page, '流量转发', /\/vue3-app\/?#\/trafficForwarding/)
  await expect(
    microAppContainer(page).getByRole('columnheader', { name: '物理主机' })
  ).toBeVisible()

  await page.getByRole('button', { name: 'React Dashboard' }).click()
  await expect(page).toHaveURL(/\/react-dashboard$/)
  await expect(page.getByRole('heading', { name: 'Revenue Dashboard' })).toBeVisible()
  await expect(activeMicroStatus(page)).toHaveText('mounted')
  await expect(page.getByRole('alert')).toHaveCount(0)

  const lifecycle = await page.evaluate(() => {
    const events = window.__MICRO_APP_STATUS_EVENTS__ || []
    return {
      vueMounted: events.filter((event) => event.name === 'vue3-app' && event.status === 'mounted')
        .length,
      vueIdle: events.filter((event) => event.name === 'vue3-app' && event.status === 'idle')
        .length,
      vueErrors: events.filter((event) => event.name === 'vue3-app' && event.status === 'error')
        .length
    }
  })

  expect(lifecycle.vueMounted).toBeGreaterThanOrEqual(1)
  expect(lifecycle.vueIdle).toBeGreaterThanOrEqual(1)
  expect(lifecycle.vueErrors).toBe(0)
})
