/** Interactive enhancers for preview code blocks & Mermaid diagrams */

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.append(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
  return Promise.resolve()
}

function openOverlay(title: string, content: HTMLElement, options?: { panZoom?: boolean }): void {
  const existing = document.querySelector('.ink-overlay')
  existing?.remove()

  const overlay = document.createElement('div')
  overlay.className = 'ink-overlay'
  overlay.innerHTML = `
    <div class="ink-overlay-backdrop" data-close></div>
    <div class="ink-overlay-panel" role="dialog" aria-modal="true">
      <header class="ink-overlay-bar">
        <span class="ink-overlay-title">${title}</span>
        <div class="ink-overlay-actions"></div>
      </header>
      <div class="ink-overlay-body"></div>
    </div>
  `

  const actions = overlay.querySelector('.ink-overlay-actions')!
  const body = overlay.querySelector('.ink-overlay-body') as HTMLElement

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'ink-tool-btn'
  closeBtn.textContent = '关闭'
  closeBtn.addEventListener('click', () => overlay.remove())

  actions.append(closeBtn)
  document.body.append(overlay)

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      overlay.remove()
      document.removeEventListener('keydown', onKey)
    }
  }
  document.addEventListener('keydown', onKey)
  overlay.querySelector('[data-close]')?.addEventListener('click', () => {
    overlay.remove()
    document.removeEventListener('keydown', onKey)
  })

  if (options?.panZoom) {
    const stage = document.createElement('div')
    stage.className = 'ink-panzoom-stage'
    const inner = document.createElement('div')
    inner.className = 'ink-panzoom-inner'
    inner.append(content)
    stage.append(inner)
    body.append(stage)
    bindPanZoom(stage, inner, actions)
  } else {
    body.append(content)
  }
}

function bindPanZoom(viewport: HTMLElement, stage: HTMLElement, toolbar: Element): void {
  let scale = 1
  let x = 0
  let y = 0
  let dragging = false
  let lastX = 0
  let lastY = 0

  const apply = () => {
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
  }

  const zoom = (delta: number) => {
    scale = Math.min(5, Math.max(0.3, scale + delta))
    apply()
  }

  const mk = (label: string, onClick: () => void) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ink-tool-btn'
    btn.textContent = label
    btn.addEventListener('click', onClick)
    toolbar.insertBefore(btn, toolbar.firstChild)
  }

  mk('重置', () => {
    scale = 1
    x = 0
    y = 0
    apply()
  })
  mk('缩小', () => zoom(-0.15))
  mk('放大', () => zoom(0.15))

  viewport.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      zoom(event.deltaY > 0 ? -0.1 : 0.1)
    },
    { passive: false },
  )

  viewport.addEventListener('pointerdown', (event) => {
    if ((event.target as HTMLElement).closest('button')) return
    dragging = true
    lastX = event.clientX
    lastY = event.clientY
    viewport.setPointerCapture(event.pointerId)
    viewport.classList.add('dragging')
  })
  viewport.addEventListener('pointermove', (event) => {
    if (!dragging) return
    x += event.clientX - lastX
    y += event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY
    apply()
  })
  const end = () => {
    dragging = false
    viewport.classList.remove('dragging')
  }
  viewport.addEventListener('pointerup', end)
  viewport.addEventListener('pointercancel', end)
}

function enhanceCodeBlock(pre: HTMLElement): void {
  if (pre.closest('.code-frame') || pre.classList.contains('mermaid')) return

  const frame = document.createElement('div')
  frame.className = 'code-frame'
  pre.parentNode?.insertBefore(frame, pre)

  const toolbar = document.createElement('div')
  toolbar.className = 'block-toolbar'
  const lang = pre.querySelector('code')?.className.match(/language-([\w+-]+)/)?.[1] ?? 'code'
  toolbar.innerHTML = `<span class="block-lang">${lang}</span>`

  const copyBtn = document.createElement('button')
  copyBtn.type = 'button'
  copyBtn.className = 'ink-tool-btn'
  copyBtn.textContent = '复制'
  copyBtn.addEventListener('click', async () => {
    const text = pre.innerText
    await copyText(text)
    copyBtn.textContent = '已复制'
    window.setTimeout(() => {
      copyBtn.textContent = '复制'
    }, 1200)
  })

  const fullBtn = document.createElement('button')
  fullBtn.type = 'button'
  fullBtn.className = 'ink-tool-btn'
  fullBtn.textContent = '全屏'
  fullBtn.addEventListener('click', () => {
    const clone = pre.cloneNode(true) as HTMLElement
    openOverlay(`代码 · ${lang}`, clone)
  })

  toolbar.append(copyBtn, fullBtn)
  frame.append(toolbar, pre)
}

function enhanceMermaidBlock(host: HTMLElement): void {
  if (host.closest('.mermaid-frame')) return

  const frame = document.createElement('div')
  frame.className = 'mermaid-frame'
  host.parentNode?.insertBefore(frame, host)

  const toolbar = document.createElement('div')
  toolbar.className = 'block-toolbar'
  toolbar.innerHTML = `<span class="block-lang">mermaid</span>`

  const viewport = document.createElement('div')
  viewport.className = 'mermaid-viewport'
  const stage = document.createElement('div')
  stage.className = 'mermaid-stage'
  frame.append(toolbar, viewport)
  viewport.append(stage)
  stage.append(host)

  let scale = 1
  let x = 0
  let y = 0
  let dragging = false
  let lastX = 0
  let lastY = 0

  const apply = () => {
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
  }

  const addBtn = (label: string, onClick: () => void) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ink-tool-btn'
    btn.textContent = label
    btn.addEventListener('click', onClick)
    toolbar.append(btn)
  }

  addBtn('放大', () => {
    scale = Math.min(4, scale + 0.15)
    apply()
  })
  addBtn('缩小', () => {
    scale = Math.max(0.35, scale - 0.15)
    apply()
  })
  addBtn('重置', () => {
    scale = 1
    x = 0
    y = 0
    apply()
  })
  addBtn('全屏', () => {
    const clone = host.cloneNode(true) as HTMLElement
    openOverlay('Mermaid', clone, { panZoom: true })
  })

  viewport.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      scale = Math.min(4, Math.max(0.35, scale + (event.deltaY > 0 ? -0.1 : 0.1)))
      apply()
    },
    { passive: false },
  )

  viewport.addEventListener('pointerdown', (event) => {
    if ((event.target as HTMLElement).closest('button')) return
    dragging = true
    lastX = event.clientX
    lastY = event.clientY
    viewport.setPointerCapture(event.pointerId)
    viewport.classList.add('dragging')
  })
  viewport.addEventListener('pointermove', (event) => {
    if (!dragging) return
    x += event.clientX - lastX
    y += event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY
    apply()
  })
  const end = () => {
    dragging = false
    viewport.classList.remove('dragging')
  }
  viewport.addEventListener('pointerup', end)
  viewport.addEventListener('pointercancel', end)
}

import { enhanceTables } from './tables'

export function enhancePreview(root: HTMLElement): void {
  enhanceTables(root)

  root.querySelectorAll('pre.hljs, pre:has(> code)').forEach((el) => {
    if (!(el instanceof HTMLElement)) return
    if (el.classList.contains('mermaid')) return
    enhanceCodeBlock(el)
  })

  root.querySelectorAll('.mermaid').forEach((el) => {
    if (!(el instanceof HTMLElement)) return
    enhanceMermaidBlock(el)
  })
}
