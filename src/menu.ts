import type { ThemeMode } from './storage'
import type { EditorApi } from './editor'

export interface MenuHandlers {
  onNew: () => void
  onOpen: () => void
  onDownload: () => void
  onExportHtml: () => void
  onClear: () => void
  onToggleEditor: () => void
  onTogglePreview: () => void
  onLayoutBoth: () => void
  onLayoutEditor: () => void
  onLayoutPreview: () => void
  onResetSplit: () => void
  onPresent: () => void
  onTheme: (mode: ThemeMode) => void
  editor: EditorApi
}

type MenuDef = {
  id: string
  label: string
  items: Array<
    | { type: 'action'; label: string; hint?: string; run: () => void }
    | { type: 'sep' }
  >
}

export function createMenu(root: HTMLElement, handlers: MenuHandlers): () => void {
  const menus: MenuDef[] = [
    {
      id: 'file',
      label: '文件',
      items: [
        { type: 'action', label: '新建', hint: 'Ctrl+N', run: handlers.onNew },
        { type: 'action', label: '打开本地文件…', hint: 'Ctrl+O', run: handlers.onOpen },
        { type: 'action', label: '下载 Markdown', run: handlers.onDownload },
        { type: 'action', label: '导出 HTML', run: handlers.onExportHtml },
        { type: 'sep' },
        { type: 'action', label: '清空内容', run: handlers.onClear },
      ],
    },
    {
      id: 'view',
      label: '查看',
      items: [
        { type: 'action', label: '显示/隐藏编辑区', run: handlers.onToggleEditor },
        { type: 'action', label: '显示/隐藏预览区', run: handlers.onTogglePreview },
        { type: 'sep' },
        { type: 'action', label: '编辑 + 预览', run: handlers.onLayoutBoth },
        { type: 'action', label: '仅编辑', run: handlers.onLayoutEditor },
        { type: 'action', label: '仅预览', run: handlers.onLayoutPreview },
        { type: 'sep' },
        { type: 'action', label: '重置分栏宽度', run: handlers.onResetSplit },
        { type: 'sep' },
        {
          type: 'action',
          label: '全屏演示预览',
          hint: 'F11',
          run: handlers.onPresent,
        },
      ],
    },
    {
      id: 'insert',
      label: '插入',
      items: [
        {
          type: 'action',
          label: '标题',
          run: () => handlers.editor.insertBlock('## 标题'),
        },
        {
          type: 'action',
          label: '粗体',
          hint: 'Ctrl+B',
          run: () => handlers.editor.insertAround('**', '**', '粗体'),
        },
        {
          type: 'action',
          label: '斜体',
          run: () => handlers.editor.insertAround('*', '*', '斜体'),
        },
        {
          type: 'action',
          label: '代码块',
          run: () => handlers.editor.insertBlock('```ts\n\n```'),
        },
        {
          type: 'action',
          label: '链接',
          run: () => handlers.editor.insertAround('[', '](https://)', '链接文字'),
        },
        {
          type: 'action',
          label: '图片',
          run: () => handlers.editor.insertAround('![', '](https://)', '描述'),
        },
        {
          type: 'action',
          label: '表格',
          run: () =>
            handlers.editor.insertBlock('| 列1 | 列2 |\n| --- | --- |\n| A | B |'),
        },
        {
          type: 'action',
          label: '任务列表',
          run: () => handlers.editor.insertBlock('- [ ] 待办事项'),
        },
        {
          type: 'action',
          label: 'Mermaid 流程图',
          run: () =>
            handlers.editor.insertBlock(
              '```mermaid\nflowchart LR\n  A[开始] --> B[结束]\n```',
            ),
        },
        {
          type: 'action',
          label: '数学公式',
          run: () => handlers.editor.insertBlock('$$\nE = mc^2\n$$'),
        },
      ],
    }
  ]

  root.innerHTML = ''
  const items: HTMLElement[] = []

  for (const menu of menus) {
    const wrap = document.createElement('div')
    wrap.className = 'menu-item'
    wrap.dataset.menu = menu.id

    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'menu-trigger'
    trigger.textContent = menu.label

    const dropdown = document.createElement('div')
    dropdown.className = 'menu-dropdown'
    dropdown.setAttribute('role', 'menu')

    for (const item of menu.items) {
      if (item.type === 'sep') {
        const sep = document.createElement('div')
        sep.className = 'menu-sep'
        dropdown.append(sep)
        continue
      }
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'menu-action'
      btn.innerHTML = `<span>${item.label}</span>${item.hint ? `<span class="hint">${item.hint}</span>` : ''}`
      btn.addEventListener('click', () => {
        closeAll()
        item.run()
      })
      dropdown.append(btn)
    }

    trigger.addEventListener('click', (event) => {
      event.stopPropagation()
      const open = wrap.classList.contains('open')
      closeAll()
      if (!open) wrap.classList.add('open')
    })

    wrap.append(trigger, dropdown)
    root.append(wrap)
    items.push(wrap)
  }

  const closeAll = () => {
    items.forEach((el) => el.classList.remove('open'))
  }

  const onDocClick = () => closeAll()
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeAll()
  }
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)

  return () => {
    document.removeEventListener('click', onDocClick)
    document.removeEventListener('keydown', onKey)
  }
}
