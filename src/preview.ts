import DOMPurify from 'dompurify'
import { renderMarkdown } from './markdown'
import { enhancePreview } from './previewEnhance'
import type { ResolvedTheme } from './theme'

let mermaidReady = false
let currentTheme: ResolvedTheme = 'light'
let mermaidModule: typeof import('mermaid') | null = null

async function getMermaid() {
  if (!mermaidModule) {
    mermaidModule = await import('mermaid')
  }
  return mermaidModule.default
}

export async function initMermaid(theme: ResolvedTheme): Promise<void> {
  currentTheme = theme
  const mermaid = await getMermaid()
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: theme === 'dark' ? 'dark' : 'default',
    fontFamily: 'Sora, system-ui, sans-serif',
  })
  mermaidReady = true
}

async function renderMermaidBlocks(root: HTMLElement): Promise<void> {
  if (!mermaidReady) await initMermaid(currentTheme)
  const mermaid = await getMermaid()
  const nodes = root.querySelectorAll<HTMLElement>('pre.mermaid')
  if (!nodes.length) return
  try {
    await mermaid.run({ nodes })
  } catch (error) {
    console.warn('Mermaid render failed', error)
  }
}

export async function updatePreview(
  container: HTMLElement,
  source: string,
  theme: ResolvedTheme,
): Promise<void> {
  if (theme !== currentTheme || !mermaidReady) {
    await initMermaid(theme)
  }

  const dirty = renderMarkdown(source)
  const clean = DOMPurify.sanitize(dirty, {
    ADD_ATTR: ['target', 'rel', 'checked', 'disabled', 'class', 'id', 'start'],
  })

  container.innerHTML = clean
  await renderMermaidBlocks(container)
  enhancePreview(container)
}

export function exportHtmlDocument(bodyHtml: string, title = 'Markdown export'): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body>
${bodyHtml}
</body>
</html>`
}
