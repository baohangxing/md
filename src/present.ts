import { collectOutline, renderOutline } from './outline'

export interface PresentApi {
  enter: () => void
  exit: () => void
  toggle: () => void
  isActive: () => boolean
  refreshOutline: () => void
  showPreviewOutline: () => void
  hidePreviewOutline: () => void
  isPreviewOutlineActive: () => boolean
}

const HIDE_MS = 3000
const BOTTOM_ZONE = 72

export function createPresentMode(
  shell: HTMLElement,
  handlers: {
    onExit?: () => void
    onThemeCycle?: () => void
    getPreviewRoot?: () => HTMLElement | null
    getPreviewScroller?: () => HTMLElement | null
  } = {},
): PresentApi {
  let active = false
  let previewOutlineActive = false
  let scrollListenerAdded = false
  let hideTimer = 0

  const outline = document.createElement('aside')
  outline.className = 'present-outline'
  outline.innerHTML = `<div class="present-outline-body"></div>`
  document.body.append(outline)

  const dock = document.createElement('div')
  dock.className = 'present-dock'
  dock.setAttribute('role', 'toolbar')
  dock.setAttribute('aria-label', '演示模式菜单')
  dock.innerHTML = `
    <div class="present-dock-inner">
      <span class="present-dock-label">演示模式</span>
      <button type="button" class="ink-tool-btn" data-act="theme">主题</button>
      <button type="button" class="ink-tool-btn" data-act="exit">退出 · Esc</button>
    </div>
  `
  document.body.append(dock)

  const outlineBody = outline.querySelector('.present-outline-body') as HTMLElement

  const ensureScrollListener = () => {
    if (scrollListenerAdded) return
    const scroller = handlers.getPreviewScroller?.()
    scroller?.addEventListener('scroll', onScroll, { passive: true })
    scrollListenerAdded = true
  }

  const removeScrollListener = () => {
    if (!scrollListenerAdded) return
    const scroller = handlers.getPreviewScroller?.()
    scroller?.removeEventListener('scroll', onScroll)
    scrollListenerAdded = false
  }

  const hideDock = () => {
    dock.classList.remove('is-visible')
  }

  const showDockTemporarily = () => {
    dock.classList.add('is-visible')
    window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(hideDock, HIDE_MS)
  }

  const refreshOutline = () => {
    const root = handlers.getPreviewRoot?.() ?? document.querySelector('#preview')
    if (!(root instanceof HTMLElement)) return
    const items = collectOutline(root)
    renderOutline(outlineBody, items, (id) => {
      const target = root.querySelector(`#${CSS.escape(id)}`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    syncActiveOutline()
  }

  const syncActiveOutline = () => {
    const root = handlers.getPreviewRoot?.() ?? document.querySelector('#preview')
    const scroller = handlers.getPreviewScroller?.() ?? root?.closest('.pane-body')
    if (!(root instanceof HTMLElement) || !(scroller instanceof HTMLElement)) return

    const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    const marker = scroller.scrollTop + 48
    let currentId = ''
    for (const heading of headings) {
      if (!(heading instanceof HTMLElement) || !heading.id) continue
      if (heading.offsetTop <= marker) currentId = heading.id
    }

    const buttons = Array.from(outlineBody.querySelectorAll<HTMLElement>('.outline-item'))
    for (const btn of buttons) {
      const on = btn.dataset.headingId === currentId
      btn.classList.toggle('is-active', on)
      if (on) btn.scrollIntoView({ block: 'nearest' })
    }
  }

  dock.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-act]')
    if (!target) return
    if (target.dataset.act === 'exit') api.exit()
    if (target.dataset.act === 'theme') handlers.onThemeCycle?.()
    showDockTemporarily()
  })

  // Keep visible while hovering the dock itself
  dock.addEventListener('pointerenter', () => {
    window.clearTimeout(hideTimer)
    dock.classList.add('is-visible')
  })
  dock.addEventListener('pointerleave', () => {
    showDockTemporarily()
  })

  const onMove = (event: MouseEvent) => {
    if (!active) return
    // Only reveal when cursor approaches the bottom edge — not on every move
    if (window.innerHeight - event.clientY <= BOTTOM_ZONE) {
      showDockTemporarily()
    }
  }

  const onScroll = () => {
    if (!active && !previewOutlineActive) return
    syncActiveOutline()
  }

  const onKey = (event: KeyboardEvent) => {
    if (!active) return
    if (event.key === 'Escape') {
      event.preventDefault()
      api.exit()
    }
  }

  const api: PresentApi = {
    enter() {
      if (active) return
      active = true
      document.body.classList.add('present-mode')
      shell.classList.add('present-active')
      outline.classList.add('is-visible')
      document.addEventListener('keydown', onKey)
      document.addEventListener('mousemove', onMove)
      ensureScrollListener()
      refreshOutline()
      showDockTemporarily()
      requestAnimationFrame(() => {
        const preview = document.querySelector<HTMLElement>('#preview')
        preview?.scrollTo({ top: 0 })
        syncActiveOutline()
      })
    },
    exit() {
      if (!active) return
      active = false
      document.body.classList.remove('present-mode')
      shell.classList.remove('present-active')
      if (!previewOutlineActive) {
        outline.classList.remove('is-visible')
        removeScrollListener()
      }
      dock.classList.remove('is-visible')
      window.clearTimeout(hideTimer)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousemove', onMove)
      document.querySelector('.ink-overlay')?.remove()
      handlers.onExit?.()
    },
    toggle() {
      if (active) api.exit()
      else api.enter()
    },
    isActive() {
      return active
    },
    refreshOutline,
    showPreviewOutline() {
      if (previewOutlineActive) return
      previewOutlineActive = true
      outline.classList.add('is-visible')
      ensureScrollListener()
      refreshOutline()
    },
    hidePreviewOutline() {
      if (!previewOutlineActive) return
      previewOutlineActive = false
      if (!active) {
        outline.classList.remove('is-visible')
        removeScrollListener()
      }
    },
    isPreviewOutlineActive() {
      return previewOutlineActive
    },
  }

  return api
}
