import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Download, Star, ExternalLink, RefreshCw, Clock, Check, Puzzle, Plus } from 'lucide-react'
import { useLocale } from '@/i18n'
import { resolveLocalized } from '@/lib/localize'
import { fetchStore, filterApps } from '@/lib/storeApi'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Tabs, TabsList, TabsTab } from '@/ui/tabs'
import { Badge } from '@/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from '@/ui/select'
import { Tooltip, TooltipTrigger, TooltipPopup } from '@/ui/tooltip'

const CATEGORIES = [
  { id: 'all', labelEn: 'All', labelZh: '全部' },
  { id: 'cli', labelEn: 'CLI Tools', labelZh: '命令行工具' },
  { id: 'gui', labelEn: 'GUI Apps', labelZh: '图形界面' },
  { id: 'games', labelEn: 'Games', labelZh: '游戏' },
  { id: 'education', labelEn: 'Education', labelZh: '教育' },
  { id: 'productivity', labelEn: 'Productivity', labelZh: '效率' },
  { id: 'media', labelEn: 'Media', labelZh: '媒体' },
  { id: 'devtools', labelEn: 'Dev Tools', labelZh: '开发工具' },
  { id: 'utilities', labelEn: 'Utilities', labelZh: '实用工具' },
  { id: 'other', labelEn: 'Other', labelZh: '其他' },
]

const SORT_OPTIONS = [
  { id: 'stars', labelEn: 'Stars', labelZh: '星标' },
  { id: 'updated', labelEn: 'Updated', labelZh: '更新时间' },
  { id: 'name', labelEn: 'Name', labelZh: '名称' },
]

function compareVersions(a, b) {
  const normalize = v => v?.replace(/^v/, '') || '0.0.0'
  const pa = normalize(a).split('.').map(Number)
  const pb = normalize(b).split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

function AppCard({ app, locale, onInstall, t, installedMap }) {
  const name = resolveLocalized(app.name, locale) || app.id
  const desc = resolveLocalized(app.description, locale)
  const installed = installedMap.get(app.id)
  const isInstalled = !!installed
  const hasUpdate = isInstalled && compareVersions(app.version, installed.version) > 0

  const getButtonConfig = () => {
    if (!isInstalled) {
      return { text: t('install.actionInstall'), disabled: false, variant: 'default' }
    }
    if (hasUpdate) {
      return { text: t('store.update'), disabled: false, variant: 'default' }
    }
    return { text: t('store.installed'), disabled: true, variant: 'secondary' }
  }

  const { text, disabled, variant } = getButtonConfig()

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:border-muted-foreground/30 transition-colors">
      {app.icon ? (
        <img
          src={app.icon}
          alt=""
          className="w-12 h-12 rounded-xl object-cover shrink-0"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <ShoppingBag size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm truncate">{name}</h3>
          {app.version && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              {app.version}
            </span>
          )}
        </div>
        {desc && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{desc}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {app.author && (
            <span className="flex items-center gap-1">
              <img
                src={app.author.avatar}
                alt=""
                className="w-3.5 h-3.5 rounded-full"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              {app.author.name}
            </span>
          )}
          {app.stars != null && (
            <span className="flex items-center gap-1">
              <Star size={11} />
              {app.stars}
            </span>
          )}
          {app.updatedAt && (
            <span className="hidden sm:flex items-center gap-1">
              <Clock size={11} />
              {new Date(app.updatedAt).toLocaleDateString()}
            </span>
          )}
          {app.license && (
            <span className="hidden sm:flex items-center gap-1">
              {app.license}
            </span>
          )}
        </div>
        {app.tags && app.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {app.widgets && app.widgets.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <Puzzle size={9} className="mr-0.5" />
                {app.widgets.length}
              </Badge>
            )}
            {app.tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <Button
          size="sm"
          variant={variant}
          onClick={() => onInstall(app)}
          disabled={disabled}
        >
          {isInstalled && !hasUpdate ? (
            <Check size={12} />
          ) : (
            <Download size={12} />
          )}
          {text}
        </Button>
        {app.repository?.url && (
          <a
            href={app.repository.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink size={10} />
            Repo
          </a>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
      <div className="w-16 h-8 bg-muted rounded shrink-0" />
    </div>
  )
}

export default function StorePage() {
  const { t, locale } = useLocale()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [storeData, setStoreData] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('stars')
  const [installedMap, setInstalledMap] = useState(new Map())

  const loadStore = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchStore()
      setStoreData(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshStore = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchStore({ force: true })
      setStoreData(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStore()
  }, [loadStore])

  useEffect(() => {
    async function checkInstalled() {
      const apps = await window.JSOS?.getApps()
      if (apps) {
        const map = new Map(apps.map(a => [a.id, { version: a.version }]))
        setInstalledMap(map)
      }
    }
    checkInstalled()
    const id = setInterval(checkInstalled, 15000)
    return () => clearInterval(id)
  }, [])

  const filteredApps = useMemo(() => {
    if (!storeData?.apps) return []
    return filterApps(storeData.apps, { query, category, sort })
  }, [storeData, query, category, sort])

  const handleInstall = useCallback((app) => {
    const githubUrl = app.repository?.url
    if (githubUrl) {
      navigate('/install', { state: { githubUrl, tab: 'github' } })
    }
  }, [navigate])

  const getSortLabel = () => {
    const opt = SORT_OPTIONS.find(o => o.id === sort)
    if (!opt) return ''
    return locale === 'zh-CN' ? opt.labelZh : opt.labelEn
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">{t('store.title')}</h2>
        <div className="flex items-center gap-1">
          {storeData && (
            <span className="text-xs text-muted-foreground mr-1">
              {storeData.appCount} apps
            </span>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshStore}
                  disabled={loading}
                />
              }
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </TooltipTrigger>
            <TooltipPopup>{t('store.refresh')}</TooltipPopup>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
            render={
              <a
                href="https://github.com/jsos-dev/jsos-app-store/issues/new?template=register-app.yml"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <Plus size={14} />
            {t('store.submitApp')}
          </Button>
        </div>
      </div>

      {/* Search and sort */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder={t('store.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-32">
            <SelectValue>{getSortLabel()}</SelectValue>
          </SelectTrigger>
          <SelectPopup>
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={opt.id} value={opt.id}>
                {locale === 'zh-CN' ? opt.labelZh : opt.labelEn}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>

      {/* Category tabs */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map(cat => (
            <TabsTab key={cat.id} value={cat.id}>
              {locale === 'zh-CN' ? cat.labelZh : cat.labelEn}
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      <div className="mt-4">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm mb-3">{t('store.loadFailed')}</p>
            <Button variant="outline" size="sm" onClick={refreshStore}>
              <RefreshCw size={14} />
              {t('store.retry')}
            </Button>
          </div>
        )}

        {!loading && !error && filteredApps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShoppingBag size={48} className="text-muted-foreground/30 mb-4" />
            <p className="text-sm">{t('store.empty')}</p>
          </div>
        )}

        {!loading && !error && filteredApps.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-8">
            {filteredApps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                locale={locale}
                onInstall={handleInstall}
                t={t}
                installedMap={installedMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
