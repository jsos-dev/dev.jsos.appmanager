import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, BadgeCheck } from 'lucide-react'
import { useLocale } from '@/i18n'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'

export default function AppsPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const prevAppsRef = useRef('[]')
  const [search, setSearch] = useState('')
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  const loadApps = useCallback(async () => {
    if (!mountedRef.current) return
    try {
      const list = await window.JSOS?.getApps()
      if (!list || !mountedRef.current) return
      const json = JSON.stringify(list.map(a => ({ id: a.id, running: a.isRunning })))
      if (json !== prevAppsRef.current) {
        prevAppsRef.current = json
        setApps(list)
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    loadApps()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') loadApps()
    }, 15000)
    return () => clearInterval(id)
  }, [loadApps])

  const filtered = apps.filter(app => {
    if (!search) return true
    const query = search.toLowerCase()
    return (
      (app.name || '').toLowerCase().includes(query) ||
      (app.id || '').toLowerCase().includes(query)
    )
  })

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">{t('apps.title')}</h2>
        <Button onClick={() => navigate('/install')}>
          <Download size={14} />
          {t('nav.install')}
        </Button>
      </div>

      <div className="mb-4">
        <Input
          type="search"
          placeholder={t('apps.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <LayoutGrid size={32} className="text-muted-foreground/30" />
          <p className="mt-4 text-sm font-medium">{t('apps.empty')}</p>
          <p className="mt-1 text-xs">{t('apps.emptyDesc')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map(app => {
            const isRunning = app.isRunning
            return (
              <div
                key={app.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                onClick={() => navigate(`/app/${app.id}`)}
              >
                {app.icon ? (
                  <img src={app.icon} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {(app.name || app.id)?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{app.name}</span>
                    <span className="text-xs text-muted-foreground">v{app.version}</span>
                    {app.isSystem && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                        <BadgeCheck size={10} />
                        {t('apps.system')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-0.5 text-[10px] ${isRunning ? 'text-green-500' : 'text-muted-foreground'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                      {isRunning ? t('apps.running') : t('apps.stopped')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {app.type === 'cli' ? t('apps.cli') : t('apps.gui')}
                    </span>
                  </div>
                </div>
              </div>
              )
          })}
        </div>
      )}
    </div>
  )
}

function Download({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
