import './styles/tokens.css'
import './styles/shell.css'
import './styles/preview.css'
import './styles/present.css'
import 'katex/dist/katex.min.css'

import sampleMd from './sample.md?raw'
import { createEditor, type EditorApi } from './editor'
import { createLayout, bindSplitter } from './layout'
import { createMenu } from './menu'
import { updatePreview, exportHtmlDocument } from './preview'
import { createPresentMode, type PresentApi } from './present'
import {
  createInitialState,
  loadState,
  saveState,
  type AppState,
  type ThemeMode,
} from './storage'
import { initTheme, onThemeChange, setThemeMode, resolveTheme, getThemeMode } from './theme'

import hljsLightUrl from 'highlight.js/styles/github.min.css?url'
import hljsDarkUrl from 'highlight.js/styles/github-dark.min.css?url'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="app-shell" id="app-shell">
    <header class="topbar">
      <a class="brand" href="#/" aria-label="Markdown">
        <span class="brand-mark">Markdown</span>
      </a>
      <nav class="menubar" id="menubar" aria-label="主菜单"></nav>
      <div class="topbar-actions">
        <button type="button" class="chip-btn" id="btn-present" title="全屏演示">演示</button>
        <button type="button" class="chip-btn" id="btn-theme" title="切换主题">主题</button>
      </div>
    </header>
    <div class="mobile-tabs" role="tablist">
      <button type="button" class="chip-btn active" data-tab="editor">编辑</button>
      <button type="button" class="chip-btn" data-tab="preview">预览</button>
    </div>
    <main class="workspace layout-both" id="workspace">
      <section class="pane pane-editor" aria-label="编辑器">
        <div class="pane-label">
          <span>编辑</span>
          <button type="button" class="pane-hide-btn" id="hide-editor" title="完全隐藏编辑区">隐藏</button>
        </div>
        <div class="pane-body" id="editor-root"></div>
      </section>
      <div class="splitter" id="splitter" role="separator" aria-orientation="vertical" aria-label="拖动可调整；拖到边缘可完全隐藏一侧"></div>
      <section class="pane pane-preview" aria-label="预览">
        <div class="pane-label">
          <span>预览</span>
          <button type="button" class="pane-hide-btn" id="hide-preview" title="完全隐藏预览区">隐藏</button>
        </div>
        <div class="pane-body">
          <article class="markdown-body" id="preview"></article>
        </div>
      </section>
    </main>
  </div>
  <input type="file" id="file-input" accept=".md,.markdown,text/markdown,text/plain" hidden />
`

const shell = document.querySelector<HTMLElement>('#app-shell')!
const workspace = document.querySelector<HTMLElement>('#workspace')!
const editorRoot = document.querySelector<HTMLElement>('#editor-root')!
const previewEl = document.querySelector<HTMLElement>('#preview')!
const menubar = document.querySelector<HTMLElement>('#menubar')!
const splitter = document.querySelector<HTMLElement>('#splitter')!
const fileInput = document.querySelector<HTMLInputElement>('#file-input')!
const themeBtn = document.querySelector<HTMLButtonElement>('#btn-theme')!
const presentBtn = document.querySelector<HTMLButtonElement>('#btn-present')!
const hideEditorBtn = document.querySelector<HTMLButtonElement>('#hide-editor')!
const hidePreviewBtn = document.querySelector<HTMLButtonElement>('#hide-preview')!
const mobileTabs = document.querySelectorAll<HTMLButtonElement>('.mobile-tabs .chip-btn')

const hljsLink = document.createElement('link')
hljsLink.rel = 'stylesheet'
document.head.append(hljsLink)

function applyHljsTheme(theme: 'light' | 'dark'): void {
  hljsLink.href = theme === 'dark' ? hljsDarkUrl : hljsLightUrl
}

const saved = loadState()
const state: AppState = createInitialState(
  typeof saved?.content === 'string' ? saved.content : sampleMd,
  {
    theme: saved?.theme ?? 'system',
    layout: saved?.layout ?? 'both',
    splitRatio: typeof saved?.splitRatio === 'number' ? saved.splitRatio : 0.48,
  },
)

let resolved = initTheme(state.theme)
applyHljsTheme(resolved)

let persistTimer = 0
function persist(patch?: Partial<AppState>): void {
  Object.assign(state, patch, { updatedAt: Date.now() })
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => saveState(state), 180)
}

function persistNow(patch?: Partial<AppState>): void {
  Object.assign(state, patch, { updatedAt: Date.now() })
  saveState(state)
}

let renderTimer = 0
let present: PresentApi | null = null

async function schedulePreview(source: string): Promise<void> {
  window.clearTimeout(renderTimer)
  await new Promise<void>((resolve) => {
    renderTimer = window.setTimeout(async () => {
      await updatePreview(previewEl, source, resolveTheme())
      if (present?.isActive() || present?.isPreviewOutlineActive()) present.refreshOutline()
      resolve()
    }, 100)
  })
}

const layout = createLayout(workspace, state.layout, state.splitRatio, (mode, ratio) => {
  persistNow({ layout: mode, splitRatio: ratio })
  if (present) {
    if (mode === 'preview-only') {
      present.showPreviewOutline()
    } else {
      present.hidePreviewOutline()
    }
  }
})

bindSplitter(splitter, workspace, layout)

hideEditorBtn.addEventListener('click', () => layout.toggleEditor())
hidePreviewBtn.addEventListener('click', () => layout.togglePreview())

const editor: EditorApi = createEditor(editorRoot, state.content, resolved, (value) => {
  state.content = value
  persist({ content: value })
  void schedulePreview(value)
})

onThemeChange((theme) => {
  resolved = theme
  applyHljsTheme(theme)
  editor.setTheme(theme)
  void schedulePreview(editor.getValue())
})

function cycleTheme(): void {
  const order: ThemeMode[] = ['light', 'dark', 'system']
  const next = order[(order.indexOf(getThemeMode()) + 1) % order.length]
  setThemeMode(next)
  persistNow({ theme: next })
  themeBtn.textContent = themeLabel(next)
}

function themeLabel(mode: ThemeMode): string {
  return mode === 'light' ? '浅色' : mode === 'dark' ? '深色' : '系统'
}

themeBtn.textContent = themeLabel(state.theme)
themeBtn.addEventListener('click', cycleTheme)

present = createPresentMode(shell, {
  onThemeCycle: () => cycleTheme(),
  getPreviewRoot: () => previewEl,
  getPreviewScroller: () => previewEl.parentElement,
})
presentBtn.addEventListener('click', () => present?.enter())

if (layout.getLayout() === 'preview-only') {
  present?.showPreviewOutline()
}

function downloadText(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

createMenu(menubar, {
  editor,
  onNew: () => {
    if (!confirm('新建文档会清空当前内容，确定吗？')) return
    editor.setValue('# 新文档\n\n')
    persistNow({ content: editor.getValue() })
    void schedulePreview(editor.getValue())
  },
  onOpen: () => fileInput.click(),
  onDownload: () => downloadText('document.md', editor.getValue(), 'text/markdown;charset=utf-8'),
  onExportHtml: () => {
    downloadText(
      'document.html',
      exportHtmlDocument(previewEl.innerHTML),
      'text/html;charset=utf-8',
    )
  },
  onClear: () => {
    if (!confirm('确定清空全部内容？')) return
    editor.setValue('')
    persistNow({ content: '' })
    void schedulePreview('')
  },
  onToggleEditor: () => layout.toggleEditor(),
  onTogglePreview: () => layout.togglePreview(),
  onLayoutBoth: () => layout.setLayout('both'),
  onLayoutEditor: () => layout.setLayout('editor-only'),
  onLayoutPreview: () => layout.setLayout('preview-only'),
  onResetSplit: () => {
    layout.setLayout('both')
    layout.setSplitRatio(0.48)
  },
  onPresent: () => present?.enter(),
  onTheme: (mode) => {
    setThemeMode(mode)
    persistNow({ theme: mode })
    themeBtn.textContent = themeLabel(mode)
  },
})

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0]
  fileInput.value = ''
  if (!file) return
  const text = await file.text()
  editor.setValue(text)
  persistNow({ content: text })
  void schedulePreview(text)
})

mobileTabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab as 'editor' | 'preview'
    layout.setMobileTab(tab)
    mobileTabs.forEach((b) => b.classList.toggle('active', b === btn))
  })
})

window.addEventListener('keydown', (event) => {
  if (event.key === 'F11') {
    event.preventDefault()
    present?.toggle()
    return
  }
  const mod = event.metaKey || event.ctrlKey
  if (!mod) return
  if (event.key.toLowerCase() === 'b') {
    event.preventDefault()
    editor.insertAround('**', '**', '粗体')
  } else if (event.key.toLowerCase() === 'o') {
    event.preventDefault()
    fileInput.click()
  } else if (event.key.toLowerCase() === 'n') {
    event.preventDefault()
    if (confirm('新建文档会清空当前内容，确定吗？')) {
      editor.setValue('# 新文档\n\n')
      persistNow({ content: editor.getValue() })
      void schedulePreview(editor.getValue())
    }
  } else if (event.key === '\\') {
    event.preventDefault()
    if (event.shiftKey) layout.toggleEditor()
    else layout.togglePreview()
  }
})

const editorScroll = editorRoot.querySelector('.cm-scroller') as HTMLElement | null
const previewScroll = previewEl.parentElement
let syncing = false

function syncScroll(from: HTMLElement, to: HTMLElement): void {
  if (syncing) return
  const maxFrom = from.scrollHeight - from.clientHeight
  const maxTo = to.scrollHeight - to.clientHeight
  if (maxFrom <= 0 || maxTo <= 0) return
  syncing = true
  to.scrollTop = (from.scrollTop / maxFrom) * maxTo
  requestAnimationFrame(() => {
    syncing = false
  })
}

if (editorScroll && previewScroll) {
  editorScroll.addEventListener('scroll', () => syncScroll(editorScroll, previewScroll), {
    passive: true,
  })
  previewScroll.addEventListener('scroll', () => syncScroll(previewScroll, editorScroll), {
    passive: true,
  })
}

void schedulePreview(state.content)
