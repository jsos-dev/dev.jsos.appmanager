const STEP = 104

export function normalizeWidgetSize(widget) {
  let cols, rows

  if (widget.cols != null && widget.rows != null) {
    cols = widget.cols
    rows = widget.rows
  } else if (widget.size) {
    const match = widget.size.match(/^(\d+)\s*[x×]\s*(\d+)$/)
    if (match) {
      cols = parseInt(match[1])
      rows = parseInt(match[2])
    }
  }

  if (!cols || !rows) {
    cols = Math.round((widget.width || 320) / STEP)
    rows = Math.round((widget.height || 208) / STEP)
  }

  cols = Math.max(1, Math.round(cols))
  rows = Math.max(1, Math.round(rows))

  return { cols, rows, width: cols * STEP, height: rows * STEP }
}

export function widgetSizeLabel(widget) {
  const { cols, rows } = normalizeWidgetSize(widget)
  return `${cols} x ${rows}`
}
