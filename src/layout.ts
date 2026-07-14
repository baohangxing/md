import type { LayoutMode } from './storage'

export interface LayoutApi {
  setLayout: (mode: LayoutMode) => void
  getLayout: () => LayoutMode
  setSplitRatio: (ratio: number) => void
  getSplitRatio: () => number
  applyDragRatio: (ratio: number) => void
  finishDrag: (ratio: number) => void
  toggleEditor: () => LayoutMode
  togglePreview: () => LayoutMode
  setMobileTab: (tab: 'editor' | 'preview') => void
}

const EDGE = 0.06
const MIN_SPLIT = 0.18
const MAX_SPLIT = 0.82

export function createLayout(
  workspace: HTMLElement,
  initial: LayoutMode,
  initialRatio: number,
  onChange: (layout: LayoutMode, splitRatio: number) => void,
): LayoutApi {
  let layout = initial
  let splitRatio = clamp(initialRatio, MIN_SPLIT, MAX_SPLIT)
  let mobileTab: 'editor' | 'preview' = 'editor'
  let dragPreviewRatio: number | null = null

  const apply = (persist = true) => {
    workspace.classList.remove(
      'layout-both',
      'layout-editor-only',
      'layout-preview-only',
      'mobile-editor',
      'mobile-preview',
      'is-dragging',
    )
    workspace.classList.add(`layout-${layout}`)
    workspace.classList.add(mobileTab === 'editor' ? 'mobile-editor' : 'mobile-preview')

    if (layout === 'both') {
      const ratio = dragPreviewRatio ?? splitRatio
      workspace.style.setProperty('--split-left', `${ratio}fr`)
      workspace.style.setProperty('--split-right', `${1 - ratio}fr`)
      if (dragPreviewRatio != null) workspace.classList.add('is-dragging')
    } else {
      workspace.style.removeProperty('--split-left')
      workspace.style.removeProperty('--split-right')
    }

    if (persist && dragPreviewRatio == null) {
      onChange(layout, splitRatio)
    }
  }

  apply()

  return {
    setLayout(mode) {
      layout = mode
      dragPreviewRatio = null
      apply()
    },
    getLayout() {
      return layout
    },
    setSplitRatio(ratio) {
      splitRatio = clamp(ratio, MIN_SPLIT, MAX_SPLIT)
      layout = 'both'
      dragPreviewRatio = null
      apply()
    },
    getSplitRatio() {
      return splitRatio
    },
    applyDragRatio(ratio) {
      if (layout !== 'both' && layout !== 'editor-only' && layout !== 'preview-only') return
      if (layout !== 'both') {
        layout = 'both'
      }
      dragPreviewRatio = clamp(ratio, 0.02, 0.98)
      apply(false)
    },
    finishDrag(ratio) {
      if (ratio <= EDGE) {
        layout = 'preview-only'
        dragPreviewRatio = null
        apply()
        return
      }
      if (ratio >= 1 - EDGE) {
        layout = 'editor-only'
        dragPreviewRatio = null
        apply()
        return
      }
      splitRatio = clamp(ratio, MIN_SPLIT, MAX_SPLIT)
      layout = 'both'
      dragPreviewRatio = null
      apply()
    },
    toggleEditor() {
      layout = layout === 'preview-only' ? 'both' : 'preview-only'
      dragPreviewRatio = null
      apply()
      return layout
    },
    togglePreview() {
      layout = layout === 'editor-only' ? 'both' : 'editor-only'
      dragPreviewRatio = null
      apply()
      return layout
    },
    setMobileTab(tab) {
      mobileTab = tab
      apply(false)
    },
  }
}

export function bindSplitter(
  splitter: HTMLElement,
  workspace: HTMLElement,
  api: Pick<LayoutApi, 'getLayout' | 'applyDragRatio' | 'finishDrag' | 'setLayout'>,
): void {
  let dragging = false
  let lastRatio = 0.5

  const ratioFromEvent = (clientX: number) => {
    const rect = workspace.getBoundingClientRect()
    return (clientX - rect.left) / Math.max(rect.width, 1)
  }

  splitter.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    dragging = true
    splitter.classList.add('active')
    splitter.setPointerCapture(event.pointerId)
    if (api.getLayout() !== 'both') {
      api.setLayout('both')
    }
    lastRatio = ratioFromEvent(event.clientX)
    api.applyDragRatio(lastRatio)
  })

  splitter.addEventListener('pointermove', (event) => {
    if (!dragging) return
    lastRatio = ratioFromEvent(event.clientX)
    api.applyDragRatio(lastRatio)
  })

  const end = () => {
    if (!dragging) return
    dragging = false
    splitter.classList.remove('active')
    api.finishDrag(lastRatio)
  }

  splitter.addEventListener('pointerup', end)
  splitter.addEventListener('pointercancel', end)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
