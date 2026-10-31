/**
 * End-to-end smoke test for the Columbina theme on DSH 0.2.x.
 *
 * Start an isolated test host first, then pass its authenticated URL:
 *
 *   $env:DSH_HOME = 'C:\path\to\.e2e-home'
 *   dsh plugin --profile e2e add link:C:\path\to\dsh-columbina-theme
 *   dsh --profile e2e --port 0 --no-open
 *   $env:E2E_BASE = "http://127.0.0.1:<port>/?token=<token>"
 *   node scripts/smoke-test.mjs
 *
 * The test only writes through the plugin's own settings surface and restores
 * the background/activeTitle fields before exiting.
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'

// playwright-core resolves from this package's own node_modules (devDependency).
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')

const BASE = process.env.E2E_BASE
if (!BASE) {
  console.error('E2E_BASE is required (use the authenticated URL printed by `dsh web`)')
  process.exit(1)
}
const origin = new URL(BASE).origin
const CONFIG = `${origin}/plugins/dsh-columbina-theme/config`
const SHOT_DIR = new URL('../.e2e-home/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const failures = []
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === undefined ? '' : `: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`)
  if (!ok) failures.push(name)
}

// Browser executable: $EDGE_PATH wins; otherwise common install locations.
const browserPath = [
  process.env.EDGE_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/microsoft-edge',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p))

const fetchConfig = async () => (await fetch(CONFIG, { cache: 'no-store' })).json()
const waitForConfig = async (predicate, timeout = 15000) => {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const config = await fetchConfig()
    if (predicate(config)) return config
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('timed out waiting for the config endpoint')
}

const browser = await chromium.launch({
  executablePath: browserPath,
  headless: true,
  args: ['--no-first-run', '--disable-extensions'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`) })
page.on('pageerror', (err) => errors.push(`[pageerror] ${String(err)}`))

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
// The host now contributes the theme as a structured style row, so the served
// element has no data-plugin attribute; identify it by its CSS marker.
await page.waitForFunction(() => [...document.querySelectorAll('style')]
  .some((element) => element.textContent.includes('/* dsh-columbina-theme */')), { timeout: 20000 })
await page.waitForTimeout(800)
// A fresh home shows the onboarding dialog over the shell; dismiss it.
await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]')
  dialog?.querySelector('button[aria-label="关闭"], button[aria-label="Close"]')?.click()
})
await page.waitForTimeout(500)

const applied = await page.evaluate(() => {
  const row = document.querySelector('[role="treeitem"][aria-selected="true"]')
  const titleSpan = row ? row.querySelector(':scope > span[class$="_title"]') : null
  const staticStyle = [...document.querySelectorAll('style')]
    .find((element) => element.textContent.includes('/* dsh-columbina-theme */'))
  return {
    staticStyle: !!staticStyle,
    bgLayerImage: getComputedStyle(document.body, '::before').backgroundImage,
    maskLayerColor: getComputedStyle(document.body, '::after').backgroundColor,
    bodyBgProp: document.body.style.getPropertyValue('--columbina-bg-image'),
    rootBgProp: document.documentElement.style.getPropertyValue('--columbina-bg-image'),
    bodyMaskProp: document.body.style.getPropertyValue('--columbina-mask-alpha'),
    rootMaskProp: document.documentElement.style.getPropertyValue('--columbina-mask-alpha'),
    titleAttr: document.body.getAttribute('data-columbina-title'),
    tokenBgBase: document.body.style.getPropertyValue('--dsw-alias-bg-base'),
    tokenLabel: document.body.style.getPropertyValue('--dsw-alias-label-primary'),
    sidebarFillResolved: getComputedStyle(document.body).getPropertyValue('--dsw-specific-sidebar-fill'),
    selectedRow: !!row,
    selectedTitleColor: titleSpan ? getComputedStyle(titleSpan).color : null,
    selectedTitleBgImage: titleSpan ? getComputedStyle(titleSpan).backgroundImage.slice(0, 60) : null,
    selectedTitleWeight: titleSpan ? getComputedStyle(titleSpan).fontWeight : null,
  }
})
console.log('APPLIED:', JSON.stringify(applied, null, 2))
check('first-paint style tag', applied.staticStyle)
check('background layer painted', applied.bgLayerImage.includes('/plugins/dsh-columbina-theme/'), applied.bgLayerImage)
check('mask layer painted', applied.maskLayerColor.startsWith('rgba('), applied.maskLayerColor)
check('layer properties applied inline on body', applied.bodyBgProp.includes('/plugins/dsh-columbina-theme/') && applied.bodyMaskProp !== '', { bodyBgProp: applied.bodyBgProp, bodyMaskProp: applied.bodyMaskProp })
check('theme tokens applied on body', applied.tokenBgBase.startsWith('rgba('), applied.tokenBgBase)
check('selected session title glow', applied.selectedRow && applied.selectedTitleBgImage.includes('gradient'), applied.selectedTitleBgImage)
check('selected title weight', applied.selectedTitleWeight === '600', applied.selectedTitleWeight)

// The skin layer is applied by the client half after boot. On rc5 the plugin
// targets stable data-* hooks for the composer / question / approval surfaces,
// so the injected stylesheet must carry them even though no message is rendered.
await page.waitForFunction(() => document.querySelector('style[data-columbina-skin-style]') !== null, { timeout: 20000 }).catch(() => {})
const skin = await page.evaluate(() => {
  const tag = document.querySelector('style[data-columbina-skin-style]')
  const card = document.querySelector('[data-composer-card]')
  const css = tag ? tag.textContent : ''
  return {
    injected: tag !== null,
    hasComposerHook: css.includes('[data-composer-card]'),
    hasQuestionHook: css.includes('[data-question-key]'),
    hasApprovalHook: css.includes('[data-approval-key]'),
    hasAssistantRoot: /\.(xMeOpW|v5IAXa)_root/.test(css),
    composerCard: card !== null,
    composerRadius: card ? getComputedStyle(card).borderTopLeftRadius : null,
  }
})
check('skin layer injected', skin.injected)
check('skin targets rc5 composer hook', skin.hasComposerHook)
check('skin targets rc5 question hook', skin.hasQuestionHook)
check('skin targets rc5 approval hook', skin.hasApprovalHook)
check('skin targets an assistant Markdown root hash', skin.hasAssistantRoot)
check('composer card present', skin.composerCard)
check('composer card radius follows host token', Number.parseFloat(skin.composerRadius || '0') >= 20, skin.composerRadius)

// Simulate the Desktop Windows titlebar attribute: the app's own rule paints
// the whole frame with the opaque sidebar fill, which would hide the wallpaper
// layer. The theme must keep that frame on the translucent base surface.
const desktopFrame = await page.evaluate(() => {
  const root = document.documentElement
  const had = root.hasAttribute('data-windows-titlebar')
  root.setAttribute('data-windows-titlebar', '')
  const frame = document.querySelector('[class*="_frame"]')
  const background = frame ? getComputedStyle(frame).backgroundColor : null
  if (!had) root.removeAttribute('data-windows-titlebar')
  return { found: !!frame, background }
})
check('desktop Windows frame stays translucent', desktopFrame.found && desktopFrame.background.startsWith('rgba('), desktopFrame)
if (existsSync(SHOT_DIR)) await page.screenshot({ path: `${SHOT_DIR}preview-e2e-home.png` })

// Open the Plugins manager from the sidebar and the installed bundle's page.
const clickText = (text, exact = true) => page.evaluate(({ value, exactMatch }) => {
  const nodes = [...document.querySelectorAll('button, a, [role="treeitem"], [role="tab"], [role="menuitem"]')]
  const target = nodes.find((el) => {
    const label = (el.textContent || '').trim()
    return exactMatch ? label === value : label.startsWith(value)
  })
  if (!target) return false
  target.click()
  return true
}, { value: text, exactMatch: exact })

check('plugins page opened', await clickText('插件'))
await page.waitForTimeout(800)
check('installed plugin row', await clickText('dsh-columbina-theme'))
const card = page.locator('[data-testid="dsh-columbina-theme-settings"]')
await card.waitFor({ state: 'visible', timeout: 15000 })
check('settings card mounted on the bundle page', await card.isVisible())

const swatches = await page.evaluate(() => [...document.querySelectorAll('[data-testid="dsh-columbina-theme-settings"] button')]
  .filter((button) => button.title !== '')
  .map((button) => button.style.backgroundImage)
  .filter(Boolean)
  .map((value) => value.replace(/^url\("?/, '').replace(/"?\)$/, '')))
console.log('SWATCHES:', JSON.stringify(swatches))
check('two preset swatches', swatches.length >= 2, swatches.length)
check('swatches load preview thumbnails', swatches.every((url) => url.includes('/thumbs/')), swatches)

// Click the second preset and wait for the persisted setting.
const clicked = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('[data-testid="dsh-columbina-theme-settings"] button')]
  const target = buttons.find((button) => (button.title || '') === 'columbina-2')
  if (!target) return null
  target.click()
  return target.title
})
check('second preset clicked', clicked === 'columbina-2', clicked)
const afterBackground = await waitForConfig((config) => config.background === 'columbina-2')
check('background setting persisted', afterBackground.background === 'columbina-2', afterBackground.background)

// Toggle the active-title effect off and check the live attribute.
const toggled = await page.evaluate(() => {
  const input = document.querySelector('[data-testid="dsh-columbina-theme-settings"] input[type="checkbox"]')
  if (!input) return false
  input.click()
  return true
})
check('active title checkbox toggled', toggled)
await waitForConfig((config) => config.activeTitle === false)
await page.waitForTimeout(300)
check('title attribute retracted live', (await page.evaluate(() => document.body.hasAttribute('data-columbina-title'))) === false)

// Reload: the host-rendered static style must already carry the saved values.
await page.reload({ waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(800)
const reloaded = await page.evaluate(() => ({
  style: [...document.querySelectorAll('style')]
    .find((element) => element.textContent.includes('/* dsh-columbina-theme */'))?.textContent ?? '',
  titleAttr: document.body.hasAttribute('data-columbina-title'),
}))
check('first paint uses the saved background', reloaded.style.includes('/assets/columbina-2.png'), reloaded.style.match(/--columbina-bg-image:[^;]+/)?.[0])
check('first paint keeps the title effect off', reloaded.titleAttr === false)

// Restore the auto background and the default title effect for the next run.
await fetch(CONFIG, {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ background: '', activeTitle: true }),
})

await page.waitForTimeout(300)
if (existsSync(SHOT_DIR)) await page.screenshot({ path: `${SHOT_DIR}preview-e2e-final.png` })
console.log('ERRORS:', JSON.stringify(errors.slice(0, 10), null, 2))
await browser.close()
process.exit(failures.length === 0 ? 0 : 2)
