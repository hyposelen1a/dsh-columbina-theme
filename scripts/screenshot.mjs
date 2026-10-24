/**
 * Capture the README preview screenshots from a running DSH Web host.
 *
 *   $env:E2E_BASE = "http://127.0.0.1:<port>/?token=<token>"
 *   node scripts/screenshot.mjs
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync } from 'node:fs'

// playwright-core resolves from this package's own node_modules (devDependency).
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')

const BASE = process.env.E2E_BASE
if (!BASE) {
  console.error('E2E_BASE is required (use the authenticated URL printed by `dsh web`)')
  process.exit(1)
}
const OUT = process.env.OUT_DIR || new URL('../docs/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
mkdirSync(OUT, { recursive: true })

// Browser executable: $EDGE_PATH wins; otherwise common install locations.
const browserPath = [
  process.env.EDGE_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/microsoft-edge',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p))

const browser = await chromium.launch({
  executablePath: browserPath,
  headless: true,
  args: ['--no-first-run', '--disable-extensions'],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errors = []
page.on('pageerror', (err) => errors.push(String(err)))
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForFunction(() => [...document.querySelectorAll('style')]
  .some((element) => element.textContent.includes('/* dsh-columbina-theme */')), { timeout: 20000 })
await page.waitForTimeout(1800)

const clickText = (text) => page.evaluate((value) => {
  const element = [...document.querySelectorAll('button, a, [role="menuitem"], [role="tab"]')]
    .find((node) => (node.textContent || '').trim().startsWith(value))
  if (!element) return false
  element.click()
  return true
}, text)

/** Close the onboarding / preview notice dialogs that a fresh home shows. */
const dismissDialogs = async () => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const closed = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const button = dialog?.querySelector('button[aria-label="关闭"], button[aria-label="Close"]')
        ?? [...(dialog?.querySelectorAll('button') ?? [])].find((node) => /^(继续|关闭|稍后配置|跳过|Close|Continue|Later|Skip)$/.test((node.textContent || '').trim()))
      if (!button) return false
      button.click()
      return true
    })
    if (!closed) return
    await page.waitForTimeout(700)
  }
}

const setScheme = async (label) => {
  await clickText('更多')
  await page.waitForTimeout(500)
  await clickText('设置')
  await page.waitForTimeout(1000)
  await clickText(label)
  await page.waitForTimeout(1200)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
  await dismissDialogs()
}

await dismissDialogs()
await setScheme('浅色')
await page.screenshot({ path: `${OUT}/screenshot-light.png` })
await setScheme('深色')
await page.screenshot({ path: `${OUT}/screenshot-dark.png` })
console.log('ERRORS:', JSON.stringify(errors))
await browser.close()
