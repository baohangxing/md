const TABLE_WIDTHS_KEY = 'md-editor:table-widths:v1'

type WidthMap = Record<string, number[]>

function loadWidths(): WidthMap {
  try {
    const raw = localStorage.getItem(TABLE_WIDTHS_KEY)
    return raw ? (JSON.parse(raw) as WidthMap) : {}
  } catch {
    return {}
  }
}

function saveWidths(map: WidthMap): void {
  localStorage.setItem(TABLE_WIDTHS_KEY, JSON.stringify(map))
}

function cellText(cell: Element): string {
  return (cell.textContent ?? '').replace(/\u00a0/g, ' ').trim()
}

/** Drop columns that are empty across every row (common trailing-pipe artifact). */
export function stripEmptyTableColumns(table: HTMLTableElement): void {
  const rows = Array.from(table.rows)
  if (!rows.length) return

  const colCount = Math.max(...rows.map((row) => row.cells.length))
  if (colCount <= 1) return

  const emptyCols: number[] = []
  for (let c = colCount - 1; c >= 0; c--) {
    const allEmpty = rows.every((row) => {
      const cell = row.cells[c]
      return !cell || cellText(cell) === ''
    })
    if (allEmpty) emptyCols.push(c)
  }

  for (const c of emptyCols) {
    for (const row of rows) {
      if (row.cells[c]) row.deleteCell(c)
    }
  }
}

function tableKey(table: HTMLTableElement): string {
  const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th, tr:first-child td'))
  const label = headers.map((h) => cellText(h)).join('|') || table.innerText.slice(0, 80)
  return label
}

function ensureColGroup(table: HTMLTableElement, count: number): HTMLTableColElement[] {
  let colgroup = table.querySelector('colgroup')
  if (!colgroup) {
    colgroup = document.createElement('colgroup')
    table.prepend(colgroup)
  }
  colgroup.innerHTML = ''
  const cols: HTMLTableColElement[] = []
  for (let i = 0; i < count; i++) {
    const col = document.createElement('col')
    colgroup.append(col)
    cols.push(col)
  }
  return cols
}

function readColWidth(col: HTMLTableColElement): number {
  const fromStyle = parseFloat(col.style.width)
  if (Number.isFinite(fromStyle) && fromStyle > 0 && !col.style.width.includes('%')) {
    return fromStyle
  }
  return col.getBoundingClientRect().width || 100
}

function applyPixelTableWidths(table: HTMLTableElement, cols: HTMLTableColElement[]): void {
  const total = cols.reduce((sum, col) => sum + readColWidth(col), 0)
  table.style.width = `${total}px`
  table.style.minWidth = `${total}px`
  table.style.maxWidth = 'none'
  table.dataset.tableSized = 'px'
}

/** Default layout: stretch to container width with equal columns. */
function applyFillTableWidths(table: HTMLTableElement, cols: HTMLTableColElement[]): void {
  table.style.width = '100%'
  table.style.minWidth = '100%'
  table.style.maxWidth = '100%'
  table.dataset.tableSized = 'fill'
  const pct = `${(100 / Math.max(cols.length, 1)).toFixed(4)}%`
  cols.forEach((col) => {
    col.style.width = pct
    col.style.minWidth = '100px'
  })
}

function snapshotColumnsToPixels(table: HTMLTableElement, cols: HTMLTableColElement[]): void {
  const widths = cols.map((col) => Math.max(100, col.getBoundingClientRect().width || 100))
  widths.forEach((w, i) => {
    cols[i].style.width = `${w}px`
    cols[i].style.minWidth = '100px'
  })
  applyPixelTableWidths(table, cols)
}

function bindColumnResize(table: HTMLTableElement, cols: HTMLTableColElement[], key: string): void {
  const headCells = table.querySelectorAll('thead th, tr:first-child th')
  const cells = headCells.length
    ? Array.from(headCells)
    : Array.from(table.rows[0]?.cells ?? [])

  cells.forEach((cell, index) => {
    if (!(cell instanceof HTMLElement)) return
    if (cell.querySelector('.col-resizer')) return
    cell.classList.add('table-col-head')
    cell.style.position = 'relative'

    const handle = document.createElement('span')
    handle.className = 'col-resizer'
    handle.title = '拖动调整列宽'
    cell.append(handle)

    let startX = 0
    let startW = 0

    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      event.stopPropagation()

      // Leave fill mode: lock current visual widths to px so narrow/wide both work
      if (table.dataset.tableSized !== 'px') {
        snapshotColumnsToPixels(table, cols)
      }

      startX = event.clientX
      startW = readColWidth(cols[index])
      handle.setPointerCapture(event.pointerId)
      document.body.classList.add('col-resizing')

      const onMove = (ev: PointerEvent) => {
        const next = Math.max(100, startW + (ev.clientX - startX))
        cols[index].style.width = `${next}px`
        applyPixelTableWidths(table, cols)
      }
      const onUp = () => {
        handle.releasePointerCapture(event.pointerId)
        document.body.classList.remove('col-resizing')
        handle.removeEventListener('pointermove', onMove)
        handle.removeEventListener('pointerup', onUp)
        applyPixelTableWidths(table, cols)
        const map = loadWidths()
        map[key] = cols.map((col) => readColWidth(col))
        saveWidths(map)
      }
      handle.addEventListener('pointermove', onMove)
      handle.addEventListener('pointerup', onUp)
    })
  })
}

export function enhanceTables(root: HTMLElement): void {
  const widthMap = loadWidths()

  root.querySelectorAll('table').forEach((node) => {
    if (!(node instanceof HTMLTableElement)) return
    if (node.closest('.table-scroll')) return

    stripEmptyTableColumns(node)

    const wrap = document.createElement('div')
    wrap.className = 'table-scroll'
    node.parentNode?.insertBefore(wrap, node)
    wrap.append(node)

    const colCount = Math.max(0, ...Array.from(node.rows).map((r) => r.cells.length))
    if (!colCount) return

    const key = tableKey(node)
    const cols = ensureColGroup(node, colCount)
    const saved = widthMap[key]
    const hasSaved = Array.isArray(saved) && saved.length === colCount

    node.style.tableLayout = 'fixed'

    if (hasSaved) {
      cols.forEach((col, i) => {
        const w = Math.max(100, saved[i] ?? 100)
        col.style.width = `${w}px`
        col.style.minWidth = '100px'
      })
      applyPixelTableWidths(node, cols)
    } else {
      applyFillTableWidths(node, cols)
    }

    bindColumnResize(node, cols, key)
  })
}
