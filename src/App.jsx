import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { LayoutGrid, Download, ShoppingBag, PanelLeftClose, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale, LocaleProvider } from '@/i18n'
import { Button } from '@/ui/button'
import { ScrollArea } from '@/ui/scroll-area'
import AppsPage from '@/pages/Apps'
import AppDetailPage from '@/pages/AppDetail'
import InstallPage from '@/pages/Install'
import StorePage from '@/pages/Store'
import AddWidgetPage from '@/pages/AddWidget'

function AppContent() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const hideNav = searchParams.has('hideNav')
  const [collapsed, setCollapsed] = useState(true)
  const [appCount, setAppCount] = useState(0)

  useEffect(() => {
    function apply(effective) {
      document.documentElement.classList.toggle('dark', effective === 'dark')
    }

    window.JSOS?.getTheme().then(mode => {
      if (mode === 'system') {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        apply(mq.matches ? 'dark' : 'light')
      } else {
        apply(mode)
      }
    })

    const unsub = window.JSOS?.onThemeChange(apply)
    return () => unsub?.()
  }, [])

  useEffect(() => {
    const loadCount = async () => {
      if (document.visibilityState !== 'visible') return
      const apps = await window.JSOS?.getApps()
      if (apps) setAppCount(apps.length)
    }
    loadCount()
    const id = setInterval(loadCount, 30000)
    return () => clearInterval(id)
  }, [])

  const navItems = [
    { id: 'apps', label: t('nav.apps'), icon: LayoutGrid },
    { id: 'install', label: t('nav.install'), icon: Download },
    { id: 'store', label: t('nav.store'), icon: ShoppingBag },
  ]

  const isActive = (id) => {
    const pathname = location.pathname
    if (id === 'apps') return pathname === '/apps' || pathname === '/' || pathname.startsWith('/app/')
    if (id === 'install') return pathname === '/install'
    if (id === 'store') return pathname === '/store'
    return false
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {!hideNav && (
        <aside className={cn(
          'shrink-0 border-r border-border bg-muted/30 flex flex-col transition-all duration-200',
          collapsed ? 'w-14' : 'w-56'
        )}>
          <div className={cn(
            'border-b border-border flex items-center',
            collapsed ? 'justify-center p-2' : 'justify-between p-2 pl-4'
          )}>
            {!collapsed && (
              <h1 className="font-semibold text-base truncate">{t('app.name')}</h1>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            >
              {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/${item.id}`)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer',
                  collapsed ? 'justify-center px-2' : '',
                  isActive(item.id)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                title={collapsed ? t(`nav.${item.id}`) : undefined}
              >
                <item.icon className="size-4.5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{t(`nav.${item.id}`)}</span>
                    {item.id === 'apps' && appCount > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full leading-none font-medium">
                        {appCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>
        </aside>
      )}

      <main className="flex-1 min-w-0 overflow-hidden">
        <ScrollArea className="h-full">
          <Routes>
            <Route path="/apps" element={<AppsPage />} />
            <Route path="/app/:appId" element={<AppDetailPage />} />
            <Route path="/install" element={<InstallPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/add-widget" element={<AddWidgetPage />} />
            <Route path="*" element={<Navigate to="/apps" replace />} />
          </Routes>
        </ScrollArea>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <LocaleProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </LocaleProvider>
  )
}
