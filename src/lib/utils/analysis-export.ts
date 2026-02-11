/**
 * Client-side export utilities for analysis blocks.
 */

/**
 * Export table data as CSV and trigger browser download.
 */
export function exportTableAsCSV(
  columns: Array<{ key: string; label: string }>,
  rows: Record<string, any>[],
  filename = 'analysis-table.csv',
) {
  const header = columns.map((c) => escapeCSV(c.label)).join(',')
  const body = rows
    .map((row) => columns.map((c) => escapeCSV(String(row[c.key] ?? ''))).join(','))
    .join('\n')
  const csv = `${header}\n${body}`
  downloadFile(csv, filename, 'text/csv;charset=utf-8;')
}

/**
 * Export a DOM element as PNG using html-to-image.
 * Dynamic import to avoid bundling when not used.
 */
export async function exportElementAsPNG(
  element: HTMLElement,
  filename = 'analysis-chart.png',
  options?: {
    minWidth?: number
    minHeight?: number
    pixelRatio?: number
    useClone?: boolean
  },
) {
  const resolvedOptions = options ?? {}
  const { toPng } = await import('html-to-image')
  const {
    target,
    cleanup,
    width,
    height,
  } = resolvedOptions.useClone === false
    ? createExpandedTargetFromSource(element, resolvedOptions)
    : createExpandedCloneForExport(element, resolvedOptions)

  try {
    const dataUrl = await toPng(target, {
      backgroundColor: '#ffffff',
      pixelRatio: resolvedOptions.pixelRatio ?? 2,
      width,
      height,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true
        return node.dataset.exportIgnore !== 'true'
      },
    })
    downloadDataUrl(dataUrl, filename)
  } finally {
    cleanup()
  }
}

/**
 * Export full analysis response as PDF using jspdf.
 * Dynamic import to avoid bundling when not used.
 */
export async function exportResponseAsPDF(
  narrative: string,
  blocks: Array<{ type: string; title?: string }>,
  filename = 'analysis-response.pdf',
) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const margin = 15
  const pageWidth = doc.internal.pageSize.getWidth() - 2 * margin
  let y = margin

  // Title
  doc.setFontSize(16)
  doc.text('Analysis Report', margin, y)
  y += 10

  // Narrative
  if (narrative) {
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(narrative, pageWidth)
    for (const line of lines) {
      if (y > 270) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += 5
    }
    y += 5
  }

  // Block summaries
  if (blocks.length > 0) {
    doc.setFontSize(12)
    if (y > 260) {
      doc.addPage()
      y = margin
    }
    doc.text('Analysis Blocks', margin, y)
    y += 7

    doc.setFontSize(10)
    for (const block of blocks) {
      if (y > 270) {
        doc.addPage()
        y = margin
      }
      const label = block.title
        ? `${block.type}: ${block.title}`
        : `${block.type} block`
      doc.text(`• ${label}`, margin + 3, y)
      y += 5
    }
  }

  doc.save(filename)
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  downloadDataUrl(url, filename)
  URL.revokeObjectURL(url)
}

function downloadDataUrl(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function createExpandedCloneForExport(
  source: HTMLElement,
  options: {
    minWidth?: number
    minHeight?: number
  } = {},
): {
  target: HTMLElement
  cleanup: () => void
  width: number
  height: number
} {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))]
  const widest = sourceNodes.reduce(
    (max, node) => Math.max(max, Math.ceil(node.scrollWidth), Math.ceil(node.clientWidth)),
    0,
  )
  const tallest = sourceNodes.reduce(
    (max, node) => Math.max(max, Math.ceil(node.scrollHeight), Math.ceil(node.clientHeight)),
    0,
  )

  const width = Math.max(1, widest, options.minWidth ?? 0)
  const height = Math.max(1, tallest, options.minHeight ?? 0)

  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-100000px'
  host.style.top = '0'
  host.style.pointerEvents = 'none'
  host.style.opacity = '0'

  const clone = source.cloneNode(true) as HTMLElement
  clone.style.width = `${width}px`
  clone.style.maxWidth = 'none'
  clone.style.height = `${height}px`
  clone.style.overflow = 'visible'
  clone.style.transform = 'none'
  clone.style.maxHeight = 'none'

  host.appendChild(clone)
  document.body.appendChild(host)

  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]
  const pairCount = Math.min(sourceNodes.length, cloneNodes.length)
  for (let i = 0; i < pairCount; i++) {
    const original = sourceNodes[i]
    const cloned = cloneNodes[i]

    if (original.scrollWidth > original.clientWidth + 1) {
      cloned.style.width = `${Math.ceil(original.scrollWidth)}px`
      cloned.style.maxWidth = 'none'
      cloned.style.overflowX = 'visible'
    }

    if (original.scrollHeight > original.clientHeight + 1) {
      cloned.style.height = `${Math.ceil(original.scrollHeight)}px`
      cloned.style.overflowY = 'visible'
    }
  }

  syncCanvasBitmaps(source, clone)

  return {
    target: clone,
    width,
    height,
    cleanup: () => {
      if (host.parentNode) {
        host.parentNode.removeChild(host)
      }
    },
  }
}

function createExpandedTargetFromSource(
  source: HTMLElement,
  options: {
    minWidth?: number
    minHeight?: number
  } = {},
): {
  target: HTMLElement
  cleanup: () => void
  width: number
  height: number
} {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))]
  const width = Math.max(
    1,
    ...sourceNodes.map((node) => Math.ceil(Math.max(node.scrollWidth, node.clientWidth))),
    options.minWidth ?? 0,
  )
  const height = Math.max(
    1,
    ...sourceNodes.map((node) => Math.ceil(Math.max(node.scrollHeight, node.clientHeight))),
    options.minHeight ?? 0,
  )

  const originalInline = {
    width: source.style.width,
    maxWidth: source.style.maxWidth,
    height: source.style.height,
    maxHeight: source.style.maxHeight,
    overflow: source.style.overflow,
  }

  source.style.width = `${width}px`
  source.style.maxWidth = 'none'
  source.style.height = `${height}px`
  source.style.maxHeight = 'none'
  source.style.overflow = 'visible'

  return {
    target: source,
    width,
    height,
    cleanup: () => {
      source.style.width = originalInline.width
      source.style.maxWidth = originalInline.maxWidth
      source.style.height = originalInline.height
      source.style.maxHeight = originalInline.maxHeight
      source.style.overflow = originalInline.overflow
    },
  }
}

function syncCanvasBitmaps(source: HTMLElement, clone: HTMLElement) {
  const sourceCanvases = source.querySelectorAll('canvas')
  const cloneCanvases = clone.querySelectorAll('canvas')
  const count = Math.min(sourceCanvases.length, cloneCanvases.length)

  for (let i = 0; i < count; i++) {
    const original = sourceCanvases[i]
    const copied = cloneCanvases[i]
    const ctx = copied.getContext('2d')
    if (!ctx) continue

    copied.width = original.width
    copied.height = original.height
    ctx.drawImage(original, 0, 0)
  }
}
