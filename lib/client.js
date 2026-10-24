window.__ModuleLoader__.load({ id: 'dsh-columbina-theme', factory: (require) => {
  const module = { exports: {} }
  const exports = module.exports
  const React = require('react')
  const { useEffect, useRef, useState } = React

  const CONFIG_ENDPOINT = '/plugins/dsh-columbina-theme/config'
  const ASSET_BASE = '/plugins/dsh-columbina-theme/assets/'
  const UPLOAD_ENDPOINT = '/plugins/dsh-columbina-theme/background'

  /** Fallback preset list until the config fetch supplies the live scan. */
  const PRESETS = [
    { id: 'columbina-1', label: 'columbina-1', file: 'columbina-1.png' },
    { id: 'columbina-2', label: 'columbina-2', file: 'columbina-2.png' },
  ]

  /** Live preset list from the host asset scan; refreshed on every config fetch. */
  let presetList = PRESETS.map(({ id, label, file }) => ({ id, label, file }))

  const DEFAULTS = {
    background: '',
    maskOpacity: 0.45,
    maskColor: '',
    inputColor: '',
    sidebarColor: '',
    fontColor: '',
    activeTitle: true,
  }

  /**
   * Per-scheme defaults applied when the stored setting is empty — mirrors
   * src/index.js SCHEME_DEFAULTS (keep both halves in sync).
   */
  const SCHEME_DEFAULTS = {
    light: { background: 'columbina-1', maskColor: '', inputColor: '#c8d1fe', sidebarColor: '#e5eaff', fontColor: '#78007a' },
    dark: { background: 'columbina-2', maskColor: '', inputColor: '#140010', sidebarColor: '#140010', fontColor: '#acabf2' },
  }

  /** Built-in mask veil RGB per scheme — mirrors src/index.js MASK_RGB. */
  const MASK_RGB = { light: '255, 255, 255', dark: '21, 21, 23' }

  function currentScheme() {
    return typeof document !== 'undefined' && document.body?.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light'
  }

  /** Stored override, else the scheme default. */
  function schemeValue(field, config) {
    const stored = config[field]
    if (typeof stored === 'string' && stored.trim() !== '') return stored
    return SCHEME_DEFAULTS[currentScheme()][field]
  }

  const TITLE_ATTR = 'data-columbina-title'
  const BG_PROP = '--columbina-bg-image'
  const MASK_PROP = '--columbina-mask-alpha'

  // NOTE: the layer structure and the token value tables below mirror
  // src/index.js buildStaticCss()/surfaceTokens()/labelTokens() — the host
  // contributes the same rules as structured index injection rows, which the
  // WebServer renders into served index.html and Electron applies to its local
  // index from the boot payload. This half only re-applies the values
  // dynamically. Keep both halves in sync when adjusting colors.

  // ---------- helpers ----------

  function hexToRgba(hex, alpha) {
    const value = hex.replace('#', '')
    const r = parseInt(value.slice(0, 2), 16)
    const g = parseInt(value.slice(2, 4), 16)
    const b = parseInt(value.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  function isHex(value) {
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
  }

  /** '#rrggbb' → 'r, g, b' for the --columbina-mask-rgb custom property. */
  function hexToRgbString(hex) {
    const value = hex.replace('#', '')
    return `${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}`
  }

  /** Adopt the live preset list from a config response. */
  function adoptPresets(raw) {
    if (Array.isArray(raw) && raw.length > 0) {
      presetList = raw.map(({ id, file, thumb }) => ({ id, file, thumb: thumb || null, label: id }))
    }
    return presetList
  }

  /** URL for one resolved background id (preset or custom:<ext>). */
  function backgroundUrl(bgId) {
    if (typeof bgId === 'string' && bgId.startsWith('custom:')) {
      const ext = bgId.slice('custom:'.length).replace(/[^a-z0-9]/gi, '')
      if (ext) return `/plugins/dsh-columbina-theme/custom/custom-bg.${ext}`
      return null
    }
    const preset = presetList.find((candidate) => candidate.id === bgId)
    if (preset) return `${ASSET_BASE}${preset.file}`
    return presetList[0] ? `${ASSET_BASE}${presetList[0].file}` : null
  }

  /** Resolve one field for an explicit scheme (stored override, else scheme default). */
  function resolveFor(config, field, scheme) {
    const stored = config[field]
    if (typeof stored === 'string' && stored.trim() !== '') return stored
    return SCHEME_DEFAULTS[scheme][field]
  }

  /** Label tokens for one resolved font color; empty → the scheme's built-ins. */
  function labelPair(fontColor, fallback) {
    if (isHex(fontColor)) {
      return {
        p: fontColor,
        s: hexToRgba(fontColor, 0.82),
        t: hexToRgba(fontColor, 0.6),
      }
    }
    return fallback
  }

  const LIGHT_LABELS = { p: '#16233c', s: '#46536b', t: '#6b7a92' }
  const DARK_LABELS = { p: '#eaf1fc', s: '#b7c5da', t: '#8d9cb5' }

  /** Surface + label color tokens, one { light, dark } pair per token. */
  function buildTokens(config) {
    const light = {
      font: labelPair(resolveFor(config, 'fontColor', 'light'), LIGHT_LABELS),
      input: resolveFor(config, 'inputColor', 'light'),
      sidebar: resolveFor(config, 'sidebarColor', 'light'),
    }
    const dark = {
      font: labelPair(resolveFor(config, 'fontColor', 'dark'), DARK_LABELS),
      input: resolveFor(config, 'inputColor', 'dark'),
      sidebar: resolveFor(config, 'sidebarColor', 'dark'),
    }
    // Main content areas follow the mask (alpha 0 at mask 0 = pure original
    // background); the input box is fixed at 80% opacity; the sidebar and
    // elevated surfaces stay opaque — mirror src/index.js surfaceTokens().
    const a = Math.min(1, Math.max(0, Number(config.maskOpacity) || 0))
    const inputRgb = (scheme, fallback) => isHex(scheme) ? hexToRgbString(scheme) : fallback
    const sidebarRgb = (scheme, fallback) => isHex(scheme) ? hexToRgbString(scheme) : fallback
    return {
      '--dsw-alias-bg-base': { light: `rgba(255, 255, 255, ${a})`, dark: `rgba(21, 21, 23, ${a})` },
      '--dsw-specific-input-major': { light: `rgba(${inputRgb(light.input, '255, 255, 255')}, 0.8)`, dark: `rgba(${inputRgb(dark.input, '44, 44, 46')}, 0.8)` },
      '--dsw-specific-tip': { light: `rgba(245, 246, 247, ${a})`, dark: `rgba(44, 44, 46, ${a})` },
      '--dsw-specific-bubble': { light: `rgba(237, 243, 254, ${a})`, dark: `rgba(44, 44, 46, ${a})` },
      '--dsw-specific-bubble-highlight': { light: `rgba(211, 226, 255, ${a})`, dark: `rgba(53, 54, 56, ${a})` },
      '--dsw-specific-sidebar-fill': { light: `rgb(${sidebarRgb(light.sidebar, '249, 250, 251')})`, dark: `rgb(${sidebarRgb(dark.sidebar, '27, 27, 28')})` },
      '--dsw-alias-label-primary': { light: light.font.p, dark: dark.font.p },
      '--dsw-alias-label-secondary': { light: light.font.s, dark: dark.font.s },
      '--dsw-alias-label-tertiary': { light: light.font.t, dark: dark.font.t },
      '--dsw-alias-label-caption': { light: light.font.t, dark: dark.font.t },
      '--dsw-alias-label-dimmed': { light: light.font.t, dark: dark.font.t },
    }
  }

  let themeService = null
  let disposeThemeOverride = null
  let lastScheme = 'light'
  let latestConfig = null

  function applyConfig(config, scheme = currentScheme()) {
    adoptPresets(config && config.presets)
    const merged = { ...DEFAULTS, ...config }
    latestConfig = merged
    lastScheme = scheme
    // Write the layer properties inline on <body>, not <html>: the static
    // stylesheet also declares them per scheme on body[data-ds-dark-theme], and
    // a body-level declaration would otherwise shadow the inherited inline
    // value. Body inline styles outrank the stylesheet, so live background and
    // mask changes still win in dark mode (Desktop included).
    const layer = document.body ?? document.documentElement
    const url = backgroundUrl(resolveFor(merged, 'background', scheme))
    layer.style.setProperty(BG_PROP, url ? `url("${url}")` : 'none')
    const opacity = Math.min(1, Math.max(0, Number(merged.maskOpacity) || 0))
    layer.style.setProperty(MASK_PROP, String(opacity))
    const panelAlpha = readPanelAlpha()
    layer.style.setProperty(PANEL_ALPHA_PROP, String(panelAlpha))
    layer.style.setProperty(PANEL_SCALE_PROP, String(panelScale(panelAlpha)))
    layer.style.setProperty(INPUT_DEEP_PROP, String(readInputDeep()))
    const maskColor = resolveFor(merged, 'maskColor', scheme)
    layer.style.setProperty(
      '--columbina-mask-rgb',
      isHex(maskColor) ? hexToRgbString(maskColor) : MASK_RGB[scheme],
    )
    if (merged.activeTitle !== false) document.body.setAttribute(TITLE_ATTR, 'on')
    else document.body.removeAttribute(TITLE_ATTR)
    if (themeService) {
      // DSH 0.2 replaces the layer of the same source and returns a disposer
      // for the new layer; the previous disposer becomes a no-op. Keep the
      // latest one for teardown.
      disposeThemeOverride = themeService.overrideTokens('dsh-columbina-theme', buildTokens(merged)) ?? null
    }
  }

  async function fetchConfig() {
    const response = await fetch(CONFIG_ENDPOINT, { cache: 'no-store' })
    if (!response.ok) throw new Error(`config request failed: ${response.status}`)
    return response.json()
  }

  // ---------- settings card ----------

  const cardStyle = {
    listStyle: 'none',
    border: '1px solid var(--dsw-alias-border-l4, #d8d8d8)',
    borderRadius: 12,
    padding: 16,
    // Official settings cards use the card-fill token; it also gives the card
    // a readable surface on the plugin manager's page, where it is not nested
    // in the settings panel.
    background: 'var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2, transparent))',
    display: 'grid',
    gap: 14,
  }
  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }
  const labelBlockStyle = { display: 'block', fontWeight: 600 }
  const hintStyle = { display: 'block', opacity: 0.65, marginTop: 3, fontWeight: 400 }
  const gridStyle = {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
  }
  const swatchStyle = {
    aspectRatio: '16 / 9', borderRadius: 10, border: '2px solid transparent', cursor: 'pointer',
    backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative',
  }
  const swatchSelectedStyle = { borderColor: '#4176e6', boxShadow: '0 0 0 2px rgba(65, 118, 230, 0.35)' }
  const swatchLabelStyle = {
    position: 'absolute', left: 6, bottom: 5, fontSize: 11, lineHeight: '16px',
    background: 'rgba(0, 0, 0, 0.55)', color: '#fff', borderRadius: 6, padding: '0 6px',
  }

  function Field({ label, hint, children }) {
    return React.createElement('label', { style: rowStyle },
      React.createElement('span', null,
        React.createElement('span', { style: labelBlockStyle }, label),
        hint ? React.createElement('small', { style: hintStyle }, hint) : null,
      ),
      children,
    )
  }

  function ColumbinaCard() {
    const [status, setStatus] = useState('loading')
    const [value, setValue] = useState(DEFAULTS)
    const [busy, setBusy] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [schemeTick, setSchemeTick] = useState(0)
    const [material, setMaterial] = useState(readMaterial)
    const [panel, setPanel] = useState(readPanelAlpha)
    const [inputDeep, setInputDeep] = useState(readInputDeep)
    const patchSeq = useRef(0)
    const fileRef = useRef(null)
    const sliderTimers = useRef(new Map())
    const writable = status === 'ready' && !busy

    const refresh = async () => {
      const next = await fetchConfig()
      setValue({ ...DEFAULTS, ...next })
      setStatus('ready')
      applyConfig(next)
    }

    useEffect(() => {
      let active = true
      fetchConfig()
        .then((next) => {
          if (!active) return
          setValue({ ...DEFAULTS, ...next })
          setStatus('ready')
          applyConfig(next)
        })
        .catch(() => { if (active) setStatus('unavailable') })
      // Re-render when the light/dark scheme flips so the pickers and the
      // background highlight follow the active scheme.
      const observer = new MutationObserver(() => setSchemeTick((t) => t + 1))
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme', 'data-columbina-title'] })
      return () => {
        active = false
        observer.disconnect()
        for (const timer of sliderTimers.current.values()) clearTimeout(timer)
        sliderTimers.current.clear()
      }
    }, [])

    const write = async (field, next) => {
      const seq = ++patchSeq.current
      setBusy(true)
      try {
        const response = await fetch(CONFIG_ENDPOINT, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ [field]: next }),
        })
        if (!response.ok) throw new Error(`settings write failed: ${response.status}`)
        const updated = await response.json()
        if (seq === patchSeq.current) {
          const merged = { ...DEFAULTS, ...updated }
          setValue(merged)
          setStatus('ready')
          applyConfig(updated)
        }
      } catch {
        if (seq === patchSeq.current) setStatus('unavailable')
      } finally {
        if (seq === patchSeq.current) setBusy(false)
      }
    }

    const writeSlider = (field, next) => {
      setValue((prev) => ({ ...prev, [field]: next }))
      patchSeq.current += 1
      const pending = sliderTimers.current.get(field)
      if (pending) clearTimeout(pending)
      const timer = setTimeout(() => {
        sliderTimers.current.delete(field)
        void write(field, next)
      }, 250)
      sliderTimers.current.set(field, timer)
    }

    const upload = async (file) => {
      if (!file) return
      setUploading(true)
      try {
        const response = await fetch(UPLOAD_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': file.type || 'application/octet-stream' },
          body: file,
        })
        if (!response.ok) throw new Error(`upload failed: ${response.status}`)
        const result = await response.json()
        if (result.url) {
          await refresh()
        }
      } catch {
        setStatus('unavailable')
      } finally {
        setUploading(false)
      }
    }

    const dark = document.body.hasAttribute('data-ds-dark-theme')
    const eff = (field, builtinLight, builtinDark) => {
      const resolved = schemeValue(field, value)
      return resolved || (dark ? builtinDark : builtinLight)
    }
    const effectiveFont = eff('fontColor', '#16233c', '#eaf1fc')
    const effectiveMask = eff('maskColor', '#ffffff', '#151517')
    const effectiveInput = eff('inputColor', '#ffffff', '#2c2c2e')
    const effectiveSidebar = eff('sidebarColor', '#f9fafb', '#1b1b1c')
    const maskPercent = Math.round((Number(value.maskOpacity) || 0) * 100)
    const isCustom = typeof value.background === 'string' && value.background.startsWith('custom:')
    const customExt = (value.customBackground || '').match(/custom-bg\.(png|jpg|webp|gif)$/)?.[1]
    const presets = Array.isArray(value.presets) && value.presets.length > 0
      ? value.presets.map(({ id, file, thumb }) => ({ id, file, thumb: thumb || null, label: id }))
      : PRESETS
    // The currently effective background (scheme default when unset) — the
    // grid highlights it; clicking it again clears the override (auto mode).
    const effectiveBg = value.background || SCHEME_DEFAULTS[dark ? 'dark' : 'light'].background

    /** One color row: label/hint + color input + 恢复默认 when customized. */
    const colorRow = (label, hint, field, effective) =>
      React.createElement(Field, { label, hint },
        React.createElement('span', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('input', {
            type: 'color', value: effective, disabled: !writable,
            onChange: (event) => void write(field, event.target.value),
          }),
          value[field]
            ? React.createElement('button', {
                type: 'button', style: { fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textDecoration: 'underline' },
                onClick: () => void write(field, ''),
              }, '恢复默认')
            : React.createElement('span', { style: { fontSize: 12, opacity: 0.6 } }, '默认'),
        ),
      )

    return React.createElement('li', { style: cardStyle, 'data-testid': 'dsh-columbina-theme-settings' },
      React.createElement('div', null,
        React.createElement('strong', { style: { fontSize: 16 } }, '哥伦比娅主题'),
        React.createElement('p', { style: { margin: '5px 0 0', opacity: 0.72 } }, '背景、蒙版与字体颜色——来自挪德卡莱的月光。'),
      ),
      status === 'unavailable'
        ? React.createElement('span', { role: 'status' }, '哥伦比娅主题设置尚未连接到 DSH Host。')
        : status === 'loading'
        ? React.createElement('span', null, '正在读取设置…')
        : React.createElement(React.Fragment, null,
          React.createElement(Field, { label: '背景预设', hint: `${value.background ? '已固定为该背景（再点一次可恢复自动）' : '自动：浅色 columbina-1 / 深色 columbina-2'}；也可上传自定义图片。` },
            React.createElement('div', { style: { display: 'grid', gap: 10, width: '100%' } },
              React.createElement('div', { style: gridStyle },
                ...presets.map((preset) =>
                  React.createElement('button', {
                    key: preset.id,
                    type: 'button',
                    title: preset.label,
                    disabled: !writable,
                    style: {
                      ...swatchStyle,
                      backgroundImage: `url("${preset.thumb || `${ASSET_BASE}${preset.file}`}")`,
                      ...(effectiveBg === preset.id ? swatchSelectedStyle : {}),
                    },
                    onClick: () => {
                      // Re-clicking the effective preset clears the override (auto mode).
                      if (effectiveBg === preset.id && value.background) void write('background', '')
                      else void write('background', preset.id)
                    },
                  },
                    React.createElement('span', { style: swatchLabelStyle }, preset.label),
                  ),
                ),
              ),
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                React.createElement('button', {
                  type: 'button', disabled: !writable || uploading,
                  style: { padding: '6px 12px', borderRadius: 8, cursor: 'pointer' },
                  onClick: () => fileRef.current?.click(),
                }, uploading ? '上传中…' : '上传自定义图片'),
                React.createElement('input', {
                  ref: fileRef, type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif',
                  style: { display: 'none' },
                  onChange: (event) => {
                    const file = event.target.files?.[0]
                    if (file) void upload(file)
                    event.target.value = ''
                  },
                }),
                isCustom
                  ? React.createElement('span', { style: { fontSize: 12, opacity: 0.7 } }, '已使用自定义图片')
                  : customExt
                  ? React.createElement('button', {
                      type: 'button', style: { fontSize: 12, opacity: 0.7, cursor: 'pointer', background: 'none', border: 'none', padding: 0 },
                      onClick: () => void write('background', `custom:${customExt}`),
                    }, '使用已上传的图片')
                  : null,
              ),
            ),
          ),
          React.createElement(Field, { label: '蒙版不透明度', hint: `${maskPercent}% —— 0% 为原图效果（面板通透度同步归零），越高越不透明，100% 完全覆盖为主题底色。` },
            React.createElement('input', {
              type: 'range', min: 0, max: 1, step: 0.05, value: Number(value.maskOpacity) || 0,
              disabled: status !== 'ready',
              onChange: (event) => void writeSlider('maskOpacity', Number(event.target.value)),
            }),
          ),
          React.createElement(Field, { label: '消息面板不透明度', hint: `${Math.round(panel * 100)}% —— 用户气泡和助手消息那层玻璃的浓度；0% 只留模糊、不留底色。` },
            React.createElement('input', {
              type: 'range', min: 0, max: 0.6, step: 0.02, value: panel,
              onChange: (event) => { const next = Number(event.target.value); setPanel(next); applyPanelAlpha(next) },
            }),
          ),
          React.createElement(Field, { label: '输入框玻璃浓度', hint: `${Math.round(inputDeep * 100)}% —— 输入框那层玻璃比页面多压的深度；0% 与页面同深（只剩模糊），越高越实。` },
            React.createElement('input', {
              type: 'range', min: 0, max: 1, step: 0.05, value: inputDeep,
              onChange: (event) => { const next = Number(event.target.value); setInputDeep(next); applyInputDeep(next) },
            }),
          ),
          React.createElement(Field, { label: '字体颜色', hint: '默认跟随明暗配色；选择后同时用于两种配色。' },
            React.createElement('span', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              React.createElement('input', {
                type: 'color', value: effectiveFont, disabled: !writable,
                onChange: (event) => void write('fontColor', event.target.value),
              }),
              value.fontColor
                ? React.createElement('button', {
                    type: 'button', style: { fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', padding: 0, textDecoration: 'underline' },
                    onClick: () => void write('fontColor', ''),
                  }, '恢复默认')
                : React.createElement('span', { style: { fontSize: 12, opacity: 0.6 } }, '默认'),
            ),
          ),
          colorRow('蒙版颜色', '留空 = 跟随明暗主题底色；选择后两种配色都用该颜色。', 'maskColor', effectiveMask),
          colorRow('输入框颜色', '输入框固定 80% 不透明；留空 = 跟随明暗主题默认色。', 'inputColor', effectiveInput),
          colorRow('侧边栏颜色', '侧边栏始终不透明；留空 = 跟随明暗主题默认色。', 'sidebarColor', effectiveSidebar),
          React.createElement(Field, { label: '选中会话标题特效', hint: '当前会话的标题使用蓝紫渐变与光晕。' },
            React.createElement('input', {
              type: 'checkbox', checked: value.activeTitle !== false, disabled: !writable,
              onChange: (event) => void write('activeTitle', event.target.checked),
            }),
          ),
          React.createElement(Field, { label: '聊天框效果', hint: '液态玻璃实时折射背景；高斯模糊为静态模糊，更省资源。' },
            React.createElement('span', { style: { display: 'flex', gap: 8 } },
              ...['liquid', 'gaussian'].map((key) =>
                React.createElement('button', {
                  key, type: 'button',
                  style: { padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    fontWeight: material === key ? 600 : 400,
                    opacity: material === key ? 1 : 0.55,
                    outline: material === key ? '2px solid var(--dsw-alias-border-l3, rgba(255,255,255,.35))' : 'none' },
                  onClick: () => { setMaterial(key); applyMaterial(key) },
                }, key === 'liquid' ? '液态玻璃' : '高斯模糊'),
              ),
            ),
          ),
          busy ? React.createElement('small', { role: 'status' }, '正在保存…') : null,
        ),
    )
  }

  // ---------- skin layer (local patch, 2026-10-19) ----------
  // 目标：设置入口搬到「设置 → 通用」；外壳无边框；左栏与底栏统一材质；
  // 深色下拉修复；聊天框材质可切换（液态玻璃 / 高斯模糊）。
  const SKIN_ATTR = 'data-columbina-skin'
  const MATERIAL_ATTR = 'data-columbina-material'
  const MATERIAL_KEY = 'dsh-columbina-theme.material.v1'
  const SKIN_STYLE_ATTR = 'data-columbina-skin-style'

  function readMaterial() {
    try {
      return window.localStorage.getItem(MATERIAL_KEY) === 'gaussian' ? 'gaussian' : 'liquid'
    } catch (error) {
      return 'liquid'
    }
  }

  function writeMaterial(value) {
    try {
      window.localStorage.setItem(MATERIAL_KEY, value)
    } catch (error) {
      /* 私密模式下只用当前会话 */
    }
  }

  // 消息面板（用户气泡 / 助手消息块）那层玻璃的浓度，独立于蒙版可调。
  // 走 localStorage 而不是服务端配置：改动即时生效，也不需要动服务端 schema/重启宿主。
  const PANEL_ALPHA_KEY = 'dsh-columbina-theme.panel.v1'
  const PANEL_ALPHA_PROP = '--columbina-panel-alpha'
  // 模糊和描边也跟着浓度走：0% 时模糊归零、描边消失，面板彻底不存在。
  // 否则「0% 只剩模糊」会留下一块糊掉的矩形（用户反馈：0% 还是很糊）。
  const PANEL_SCALE_PROP = '--columbina-panel-scale'
  const PANEL_ALPHA_DEFAULT = 0.12

  function panelScale(n) {
    return Math.min(3, n / PANEL_ALPHA_DEFAULT)
  }

  function readPanelAlpha() {
    try {
      const raw = window.localStorage.getItem(PANEL_ALPHA_KEY)
      if (raw === null) return PANEL_ALPHA_DEFAULT
      const n = Number(raw)
      return Number.isFinite(n) ? Math.min(0.6, Math.max(0, n)) : PANEL_ALPHA_DEFAULT
    } catch (error) {
      return PANEL_ALPHA_DEFAULT
    }
  }

  function applyPanelAlpha(value) {
    const n = Math.min(0.6, Math.max(0, Number(value) || 0))
    try {
      window.localStorage.setItem(PANEL_ALPHA_KEY, String(n))
    } catch (error) {
      /* 私密模式 */
    }
    if (document.body) {
      document.body.style.setProperty(PANEL_ALPHA_PROP, String(n))
      document.body.style.setProperty(PANEL_SCALE_PROP, String(panelScale(n)))
    }
  }

  // 输入框那层玻璃的"深度"：卡片里那张壁纸副本上再多压一层蒙版，越大越实。
  // 0 时与页面完全同深（只剩模糊），1 时接近实心。默认 0.5 = 比页面深一档。
  const INPUT_DEEP_KEY = 'dsh-columbina-theme.input-deep.v1'
  const INPUT_DEEP_PROP = '--columbina-input-deep'
  const INPUT_DEEP_DEFAULT = 0.5

  function readInputDeep() {
    try {
      const raw = window.localStorage.getItem(INPUT_DEEP_KEY)
      if (raw === null) return INPUT_DEEP_DEFAULT
      const n = Number(raw)
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : INPUT_DEEP_DEFAULT
    } catch (error) {
      return INPUT_DEEP_DEFAULT
    }
  }

  function applyInputDeep(value) {
    const n = Math.min(1, Math.max(0, Number(value) || 0))
    try {
      window.localStorage.setItem(INPUT_DEEP_KEY, String(n))
    } catch (error) {
      /* 私密模式 */
    }
    if (document.body) document.body.style.setProperty(INPUT_DEEP_PROP, String(n))
  }

  function role(name) {
    return `:is([class$="_${name}"],[class*="_${name} "])`
  }

  const SEAT = ':is([class*="_composerSeat"]):not(:is([class*="_composerHero"]))'
  const PANELS = `:is(${role('userRow')} ${role('bubble')},.v5IAXa_root,.kshsua_root)`

  function skinCss() {
    const skin = `body[${SKIN_ATTR}]`
    const mask = 'var(--columbina-mask-rgb)'
    const alpha = 'var(--columbina-mask-alpha)'
    const thin = `rgba(${mask},.06)`
    const veil = `rgba(${mask},${alpha})`
    const pad = `rgba(${mask},calc(${alpha} * .28))`
    const sidebar = ':is([class*="_sidebarCol"])'
    const shell = `${role('frame')}:has(> ${sidebar})`
    const canvas = `${role('centerCol')},${role('rightbarCol')}`
    // 每个区域底下都是同一张壁纸，只靠叠几层蒙版拉开层次。
    // background-attachment:fixed 让纹理相对视口定位、跨元素对齐，
    // 接缝处纹理连续，就不会出现「左边一块、右边一块」的硬分界。
    const wall = `linear-gradient(${veil},${veil}),linear-gradient(${veil},${veil}),var(--columbina-bg-image)`
    const pane = `linear-gradient(${thin},${thin}),${wall}`
    const fixed = 'background-size:cover;background-position:center;background-attachment:fixed'
    return [
      // 宿主的 body::before/::after 只在启动注入里，刷新会丢；这里统一接管。
      `${skin}::before,${skin}::after{display:none!important}`,
      // 壁纸 + 蒙版写在 body 背景上：蒙版叠两层，等效 1-(1-a)^2（0.35 → 约 0.58）。
      `${skin}{background-image:${wall};${fixed}}`,
      // 输入框底色写死在 buildTokens 里的 0.8 不透明深灰，与会话区不同源 → 上下分块。
      `${skin}{--dsw-specific-input-major:transparent!important}`,
      // 侧栏底色走的是这个 token（buildTokens 里写死 rgb(27,27,28) 不透明），
      // 选择器清不掉，只能盖 token。这里必须给透明而不是蒙版色：
      // 会话列表底部有个 24px 的渐变遮罩（._9lTDKa_fade，transparent → 本 token），
      // 原生用不透明侧栏色、与背景同色所以看不见；一旦把侧栏变透明、token 又给半透明，
      // 遮罩就成了一道 24px 暗带 + 硬下沿（用户说的那条横线，实测 CSS y≈741..765）。
      `${skin}{--dsw-specific-sidebar-fill:transparent!important}`,
      // 会话列（_root）、会话内容框（_frame）、右侧面板页（_pane）都各自铺一层
      // --dsw-alias-bg-base（暗色下 rgba(21,21,23,.25)），而侧栏是透明的。
      // 实测：侧栏与该列在 x=280 处相差 28 灰阶，就是那条竖线；内容框还叠了第二层，
      // 于是输入框上沿又多一条横台阶。壁纸主题下这一层统一归零，整窗才是同一块材质。
      // 弹层/菜单用的是 --dsw-alias-bg-layer-2 一类分层 token，不受影响。
      `${skin}{--dsw-alias-bg-base:transparent!important}`,
      `${skin} [data-slot="conversation.input.dock"],${skin} [data-slot="conversation.input.dock"] *{background:none!important;background-color:transparent!important;background-image:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important}`,
      // 底部状态栏自带不透明深底（实测灰度 22 vs 会话区 78），是"下半发黑"的最后一块。
      // 外壳无边框：透明，露出底下的壁纸；标题栏也是同一块材质。
      `${skin} ${shell}{background-color:transparent}`,
      `${skin} ${shell}::before{background:transparent}`,
      // 内容画布透明；侧栏与画布之间那条 1px 亮线来自原生边框/内阴影，
      // 统一抹掉，靠材质本身的深浅过渡区分区域。
      `${skin} ${canvas}{background:transparent;border:0!important}`,
      `${skin} ${sidebar}{border:0!important;box-shadow:none!important}`,
      // 左栏与底栏：同一块材质，只比内容区多一层很薄的蒙版，靠材质连续过渡分层次，
      // 而不是靠边界处的色差。注意：这里绝不能用 isolation / backdrop-filter /
      // transform —— 任何在侧栏上建立层叠上下文的写法都会把就地渲染的全屏弹层
      // （如远程工作区面板）锁到内容区下面，表现为「图层跑到下层、点不动」。
      // 薇斯纳主题就踩了这个坑。
      `${skin} ${sidebar}{background:transparent!important;border:0!important;box-shadow:none!important}`,
      `${skin} ${sidebar} ${role('root')}{background:transparent!important;border-right-color:transparent!important}`,
      `${skin} ${role('sidebar')}{background:transparent!important}`,
      `${skin} ${SEAT}{background:transparent}`,
      // 输入框上方那条横向过渡线：dock 与其容器的顶边描边 / 分隔阴影，浏览器里没有。
      // 输入框上方那条横向过渡线（dock 的顶边），浏览器里没有。
      `${skin} [data-slot="conversation.input.dock"]{border-top:0!important;border-top-color:transparent!important}`,
      `${skin} ${SEAT}{border-top:0!important;border-top-color:transparent!important}`,
      // 输入框那圈圆角描边：按 DSH 原生观感补回来（之前被通配清理连带清掉）。

      `${skin} :is([class*="_composerSeat"],[class*="_composerLayout"],[class*="_composerStack"])::before,${skin} :is([class*="_composerSeat"],[class*="_composerLayout"],[class*="_composerStack"])::after{display:none!important}`,

      // 输入框那圈圆角描边其实不是 border，是 composer 卡片自身 0.5px 的 box-shadow 环；
      // 之前 `*{box-shadow:none}` 把它一并清掉了。用 CDP 抓到：div.RlGAzG_card
      // 在 [data-slot="conversation.composer.bar"] 里，radius 28px。
      // 卡片**不能挂 backdrop-filter**：悬停发送/停止按钮会让卡片局部重绘，大半径模糊层
      // 每次都要重新合成，Windows/Electron 上整块会话区跟着闪（薇斯纳 PR #1 同一病灶）。
      // 但只给实底又跟消息面板不是一套材质，界面显得两块。所以改成"自己画玻璃"：
      // 卡片里铺一张**同一张固定壁纸的副本**（body 上那张，background-attachment:fixed），
      // 再对它 filter:blur() —— 纹理与整窗严格对齐，模糊只在卡片重绘时算一次，不经过
      // 背景重合成那条路，所以既有玻璃质感又不会闪。副本 -28px 外扩，再用 clip-path
      // 裁成卡片自己的 28px 圆角，模糊边缘就不会在四角露白；不用 overflow:hidden，
      // 免得把斜杠命令 / 模型下拉这类就地弹出的菜单一起剪掉。
      // 叠色与 body 同源（wall = 两层 veil + 壁纸），再多压一层 input-deep 倍蒙版（默认 0.5），卡片略深于页面。
      `${skin} [data-slot="conversation.composer.bar"] [class*="_card"]{border-radius:28px!important;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;position:relative!important;isolation:isolate;box-shadow:rgba(255,255,255,.12) 0 0 0 .5px,rgba(0,0,0,.30) 0 8px 24px!important}`,
      `${skin} [data-slot="conversation.composer.bar"] [class*="_card"]::before{content:'';position:absolute;inset:-28px;z-index:-1;pointer-events:none;clip-path:inset(28px round 28px);background-image:linear-gradient(rgba(${mask},calc(${alpha} * var(--columbina-input-deep,.5))),rgba(${mask},calc(${alpha} * var(--columbina-input-deep,.5)))),${wall};background-size:cover;background-position:center;background-attachment:fixed;filter:blur(calc(var(--cb-glass-blur) + 8px)) saturate(var(--cb-glass-sat))}`,
      // 深色主题下白底白字的下拉列表。
      // 输入框那一圈圆角描边是它"看起来像第三块"的直接原因：清掉背景后边框还在。
      `${skin} :is([class*="_composer"],[class*="_composerHero"],[class*="_composerBlock"],[class*="_composerStack"],[class*="_composerBar"],[class*="_composerLayout"]){background:none!important;background-image:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}`,
      `${skin} select,${skin} option{background-color:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}`,
      // 「聊天框效果」两档原来只差 0.05 白 + 同样的 3px 模糊，肉眼等同没有。
      // 现在两档真正不同：液态玻璃＝强模糊+高饱和，高斯＝弱模糊+原饱和。
      // 作用于消息面板与提问卡片（blur = (档位值 + 8px / 12px) × 面板浓度）；
      // 输入框卡片为躲闪烁不带模糊，用固定底色，不吃这两档。
      `${skin}{--cb-glass-blur:10px;--cb-glass-sat:130%}`,
      `${skin}[${MATERIAL_ATTR}="gaussian"]{--cb-glass-blur:4px;--cb-glass-sat:100%}`,
      // 消息面板：用户气泡和助手消息块套同一个玻璃容器（参数与输入框同源）。
      // 助手消息本来就有一层 .v5IAXa_root（AssistantMarkdown 的根），只是原生没铺底，
      // 压在壁纸上字会糊进背景。这里给它和用户气泡同一套材质，两边才对称。
      // 助手块用负外边距把内边距"长"到列宽之外，正文的左右对齐位置保持不动。
      `${skin} .v5IAXa_root{box-sizing:border-box;border-radius:20px;border:1px solid rgba(255,255,255,calc(.10 * var(--columbina-panel-scale)));background:rgba(${mask},var(--columbina-panel-alpha));backdrop-filter:blur(calc((var(--cb-glass-blur) + 8px) * var(--columbina-panel-scale)));-webkit-backdrop-filter:blur(calc((var(--cb-glass-blur) + 8px) * var(--columbina-panel-scale)));padding:16px 18px;margin:6px -18px;box-shadow:none!important}`,
      `${skin} ${role('userRow')} ${role('bubble')}{box-sizing:border-box;border-radius:20px;border:1px solid rgba(255,255,255,calc(.10 * var(--columbina-panel-scale)));background:rgba(${mask},var(--columbina-panel-alpha));backdrop-filter:blur(calc((var(--cb-glass-blur) + 8px) * var(--columbina-panel-scale)));-webkit-backdrop-filter:blur(calc((var(--cb-glass-blur) + 8px) * var(--columbina-panel-scale)));box-shadow:none!important}`,
      // 提问选择卡片（QuestionComposer.module.css 的 .mAtvLq_card）：它原生靠
      // --dsw-specific-input-major 铺底，那个 token 被本皮肤归平后卡片就裸了，
      // 问题与选项文字直接压在壁纸上，壁纸一花就读不清。
      // 这里给它和输入框同一套玻璃，但浓度写死（不跟「消息面板」滑条走）：
      // 这是要人读清楚再点的选择题，滑到 0% 又该糊成一片了。
      // 用 .mAtvLq_frame 包一层：卡片有可能落在 composer.bar 槽内，那条给输入框卡片
      // 的规则（[data-slot=...] [class*="_card"]）比单个类名更具体，会把它盖掉。
      `${skin} .mAtvLq_frame .mAtvLq_card{background:rgba(var(--columbina-mask-rgb),.34)!important;backdrop-filter:blur(calc(var(--cb-glass-blur) + 12px)) saturate(var(--cb-glass-sat))!important;-webkit-backdrop-filter:blur(calc(var(--cb-glass-blur) + 12px)) saturate(var(--cb-glass-sat))!important;box-shadow:rgba(255,255,255,.12) 0 0 0 .5px,rgba(0,0,0,.30) 0 8px 24px!important}`,
      // 审批卡片（.j_8BDW_ 这一族：root / headline / body / command / actionRow）同样是
      // --dsw-specific-input-major 铺底，token 归平后整张卡连字一起贴在壁纸上。
      // 它是"批准 / 拒绝"要人点的地方，必须一眼看清，所以浓度写死，不跟面板滑条走。
      `${skin} .j_8BDW_card{background:rgba(var(--columbina-mask-rgb),.34)!important;backdrop-filter:blur(calc(var(--cb-glass-blur) + 12px)) saturate(var(--cb-glass-sat))!important;-webkit-backdrop-filter:blur(calc(var(--cb-glass-blur) + 12px)) saturate(var(--cb-glass-sat))!important;box-shadow:rgba(255,255,255,.12) 0 0 0 .5px,rgba(0,0,0,.30) 0 8px 24px!important}`,
      // 旁问（@michengai/dsh-btw）的浮层：.btw-selection-dialog（提问框）、
      // .btw-selection-menu（选中文字后的浮条）、.btw-bubble（对话里的回答卡）
      // 底色都是 background:var(--dsw-alias-bg-layer-2)。这个 token 我们没动，
      // 但暗色下它落到半透明值时，浮层就直接透到壁纸上、字压花纹（薇斯纳下是实的，
      // 因为它不做整窗材质）。所以这里不依赖那个 token，直接给实底 + 细亮环。
      // 注意别包 .btw-dock / .btw-quote-dock：那是输入框下方的卡槽容器，铺底会变成一大块黑板。
      // 1.0.4（2026-10-22 升级）新增的浮层一并盖住：.btw-codex-popover（引用弹层，bg-layer-2 铺底）、
      // .btw-codex-comment-card（弹层里的条目卡，bg-base 已被归零=全透）、
      // .btw-selection-modal textarea（提问框输入行，同 bg-base）。
      `${skin} :is(.btw-selection-dialog,.btw-selection-menu,.btw-bubble,.btw-codex-popover,.btw-codex-comment-card,.btw-selection-modal textarea){background:rgba(var(--columbina-mask-rgb),.94)!important;color:var(--dsw-alias-label-primary)!important;box-shadow:rgba(255,255,255,.12) 0 0 0 .5px,rgba(0,0,0,.35) 0 12px 32px!important}`,
    ].join('\n')
  }

  function applyMaterial(value) {
    const next = value === 'gaussian' ? 'gaussian' : 'liquid'
    writeMaterial(next)
    if (document.body) document.body.setAttribute(MATERIAL_ATTR, next)
  }

  function applySkin() {
    if (typeof document === 'undefined' || !document.body) return
    document.body.setAttribute(SKIN_ATTR, currentScheme())
    document.body.setAttribute(MATERIAL_ATTR, readMaterial())
    // 每次都重建：插件热重载时旧样式表会留在 DOM 里，靠「已存在就跳过」
    // 会让改动一直不生效。
    for (const old of document.querySelectorAll(`style[${SKIN_STYLE_ATTR}]`)) old.remove()
    const el = document.createElement('style')
    el.setAttribute(SKIN_STYLE_ATTR, '1')
    el.textContent = skinCss()
    document.head.appendChild(el)
  }

  // ---------- plugin body ----------

  function apply(ctx) {
    themeService = ctx.theme || null
    lastScheme = currentScheme()
    // The host already baked the saved settings into the served <style>
    // (both schemes' backgrounds, masks, tokens, title attribute) — first
    // paint is correct without this half. Here we re-apply the live values
    // once the config fetch returns, and re-resolve the per-scheme values
    // when the user switches light/dark (the flip guard keeps our own
    // overrideTokens round-trips from recursing).
    const boot = () => {
      void fetchConfig()
        .then((next) => applyConfig(next))
        .catch(() => {})
    }
    if (typeof document !== 'undefined' && document.body) boot()
    else document.addEventListener('DOMContentLoaded', boot, { once: true })
    applySkin()
    const syncScheme = (scheme) => {
      const next = scheme === 'dark' || scheme === 'light' ? scheme : currentScheme()
      if (next === lastScheme) return
      lastScheme = next
      if (typeof latestConfig === 'object' && latestConfig !== null) applyConfig(latestConfig, next)
    }
    // The theme snapshot names the resolved scheme, so it is authoritative
    // even when this listener runs before the presenter flips the body
    // attribute. The observer covers hosts that do not deliver the event to
    // sibling plugin contexts; the scheme guard makes the pair idempotent.
    ctx.on('theme/change', (snapshot) => syncScheme(snapshot?.active?.colorScheme))
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.body) {
      const observer = new MutationObserver(() => syncScheme(currentScheme()))
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
      ctx.effect(() => () => observer.disconnect(), 'dsh-columbina-theme: scheme observer')
    }

    // The settings card's seats, one per host generation. `slots.inject`
    // waits for a declared slot, so a host that never declares one simply
    // never runs that registration — no version check is involved.
    const registerCard = (slot, options) => {
      ctx.slots.inject(slot, () => ctx.slots.register({ name: slot, ...options }, ColumbinaCard))
    }
    // 「设置 → 通用」里的独立卡片，与薇斯纳主题同一位置。
    registerCard('settings.general.item', {
      id: 'dsh-columbina-theme',
      order: 12,
      label: () => '哥伦比娅主题',
      inject: () => ({}),
    })
    // DSH 0.2: the bundle's own page in the plugin manager (the summary view
    // is the row one-liner, which the package description already carries).
    ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
      name: 'plugins.bundle.config',
      key: 'dsh-columbina-theme',
      inject: () => ({}),
    }, (ownerProps) => (ownerProps && ownerProps.view === 'summary'
      ? null
      : React.createElement(ColumbinaCard))))
    // DSH 0.1.x: the settings list card.
    registerCard('settings.plugin.item', {
      key: 'dsh-columbina-theme',
      order: 30,
      inject: () => ({}),
    })

    ctx.effect(() => () => {
      themeService = null
      if (typeof disposeThemeOverride === 'function') disposeThemeOverride()
      disposeThemeOverride = null
      // Remove from both roots: current builds write body, older ones wrote
      // html, and a reload may leave either behind.
      for (const layer of [document.documentElement, document.body]) {
        if (!layer) continue
        layer.style.removeProperty(BG_PROP)
        layer.style.removeProperty(MASK_PROP)
        layer.style.removeProperty('--columbina-mask-rgb')
      }
      document.body.removeAttribute(TITLE_ATTR)
      document.body.removeAttribute(SKIN_ATTR)
      document.body.removeAttribute(MATERIAL_ATTR)
      for (const el of document.querySelectorAll(`style[${SKIN_STYLE_ATTR}]`)) el.remove()
    }, 'dsh-columbina-theme: teardown')
  }

  module.exports = {
    name: 'dsh-columbina-theme-client',
    inject: ['slots', 'theme'],
    apply,
  }
  return module.exports
} })
