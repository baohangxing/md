import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import footnote from 'markdown-it-footnote'
import taskLists from 'markdown-it-task-lists'
import { full as emoji } from 'markdown-it-emoji'
import sub from 'markdown-it-sub'
import sup from 'markdown-it-sup'
import mark from 'markdown-it-mark'
import ins from 'markdown-it-ins'
import deflist from 'markdown-it-deflist'
import abbr from 'markdown-it-abbr'
import container from 'markdown-it-container'
import toc from 'markdown-it-toc-done-right'
import markdownItKatex from '@vscode/markdown-it-katex'
import hljs from 'highlight.js'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function createAdmonition(name: string, title: string) {
  return [
    container,
    name,
    {
      render(tokens: { nesting: number }[], idx: number) {
        if (tokens[idx].nesting === 1) {
          return `<div class="admonition ${name}"><p class="admonition-title">${title}</p>\n`
        }
        return '</div>\n'
      },
    },
  ] as const
}

export const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    if (lang === 'mermaid') {
      return `<pre class="mermaid">${escapeHtml(str.trim())}</pre>`
    }
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="language-${lang}">${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`
      } catch {
        /* fall through */
      }
    }
    return `<pre class="hljs"><code>${escapeHtml(str)}</code></pre>`
  },
})

md.use(anchor, {
  permalink: anchor.permalink.linkInsideHeader({
    symbol: '#',
    placement: 'before',
    class: 'header-anchor',
  }),
})
  .use(footnote)
  .use(taskLists, { enabled: true, label: true })
  .use(emoji)
  .use(sub)
  .use(sup)
  .use(mark)
  .use(ins)
  .use(deflist)
  .use(abbr)
  .use(toc, { containerClass: 'table-of-contents', listType: 'ul' })
  .use(markdownItKatex, { throwOnError: false })
  .use(...createAdmonition('tip', '提示'))
  .use(...createAdmonition('warning', '警告'))
  .use(...createAdmonition('info', '信息'))

export function renderMarkdown(source: string): string {
  return md.render(source)
}
