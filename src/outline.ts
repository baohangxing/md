export interface OutlineItem {
  id: string
  level: number
  text: string
}

export function collectOutline(root: HTMLElement): OutlineItem[] {
  const items: OutlineItem[] = []
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((node, index) => {
    if (!(node instanceof HTMLElement)) return
    const level = Number(node.tagName.slice(1))
    const text = (node.textContent ?? '').replace(/^#\s*/, '').trim()
    if (!text) return
    if (!node.id) {
      node.id = `heading-${index}-${slugify(text)}`
    }
    items.push({ id: node.id, level, text })
  })
  return items
}

export function renderOutline(
  container: HTMLElement,
  items: OutlineItem[],
  onNavigate: (id: string) => void,
): void {
  container.innerHTML = ''
  const title = document.createElement('div')
  title.className = 'outline-title'
  title.textContent = '目录'
  container.append(title)

  if (!items.length) {
    const empty = document.createElement('p')
    empty.className = 'outline-empty'
    empty.textContent = '暂无标题'
    container.append(empty)
    return
  }

  const list = document.createElement('nav')
  list.className = 'outline-list'
  list.setAttribute('aria-label', '文档目录')

  for (const item of items) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `outline-item level-${item.level}`
    btn.dataset.headingId = item.id
    btn.textContent = item.text
    btn.title = item.text
    btn.addEventListener('click', () => onNavigate(item.id))
    list.append(btn)
  }
  container.append(list)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'section'
}
