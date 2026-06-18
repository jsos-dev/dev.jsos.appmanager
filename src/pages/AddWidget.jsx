import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutDashboard, X, ArrowLeft } from 'lucide-react'
import { Button } from '@/ui/button'
import { useLocale } from '@/i18n'

function getAppColor(id) {
  const colors = ['#89b4fa', '#a6e3a1', '#f38ba8', '#f9e2af', '#cba6f7', '#94e2d5']
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function resolveLabel(value, fallback) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return value.en || Object.values(value)[0] || fallback
  return fallback
}

function widgetSizeLabel(widget) {
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
    cols = Math.round((widget.width || 320) / 104)
    rows = Math.round((widget.height || 208) / 104)
  }
  cols = Math.max(1, Math.round(cols))
  rows = Math.max(1, Math.round(rows))
  return `${cols} x ${rows}`
}

export default function AddWidgetPage() {
  const [searchParams] = useSearchParams()
  const anchorX = searchParams.get('x') ? Number(searchParams.get('x')) : undefined
  const anchorY = searchParams.get('y') ? Number(searchParams.get('y')) : undefined
  const [availableWidgets, setAvailableWidgets] = useState([])
  const [adding, setAdding] = useState(null)
  const { t } = useLocale()

  useEffect(() => {
    const load = async () => {
      const apps = await window.JSOS?.getApps?.()
      if (!apps) return
      const withWidgets = apps.filter(app => app.widgets && app.widgets.length > 0)
      setAvailableWidgets(withWidgets)
    }
    load()
  }, [])

  const handleSelect = async (appId, widget) => {
    if (adding) return
    setAdding(widget.id)
    try {
      const result = await window.JSOS?.addWidget?.(appId, widget.id, {
        x: anchorX,
        y: anchorY,
      })
      if (result?.success) {
        await window.JSOS?.toast?.({
          title: t('addWidget.success'),
          description: resolveLabel(widget.name, ''),
          type: 'success',
          timeout: 3000,
        })
        await window.JSOS?.closeApp?.('dev.jsos.appmanager')
      } else {
        await window.JSOS?.toast?.({
          title: t('addWidget.failed'),
          description: result?.error || 'Unknown error',
          type: 'error',
          timeout: 3000,
        })
      }
    } catch {
      await window.JSOS?.toast?.({
        title: t('addWidget.failed'),
        type: 'error',
        timeout: 3000,
      })
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{t('addWidget.title')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t('addWidget.hint')}</p>
        </div>
      </div>

      {availableWidgets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <LayoutDashboard className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('addWidget.empty')}</p>
          <p className="text-xs mt-1">{t('addWidget.emptyDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {availableWidgets.map(app => (
            app.widgets.map(widget => {
              const widgetKey = `${app.id}::${widget.id}`
              const isAdding = adding === widget.id
              return (
                <button
                  key={widgetKey}
                  onClick={() => handleSelect(app.id, widget)}
                  disabled={!!adding}
                  className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/30 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {app.icon ? (
                      <img src={app.icon} alt="" className="w-5 h-5 rounded" />
                    ) : (
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: getAppColor(app.id) }}
                      >
                        {(app.name || app.id).charAt(0)}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground truncate">{app.name}</span>
                  </div>
                  <div className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
                    {resolveLabel(widget.name, widget.id)}
                  </div>
                  {widget.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {resolveLabel(widget.description, '')}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/70">
                      {widgetSizeLabel(widget)}
                    </span>
                    {isAdding && (
                      <span className="text-[10px] text-primary">{t('addWidget.adding')}</span>
                    )}
                  </div>
                </button>
              )
            })
          ))}
        </div>
      )}
    </div>
  )
}
