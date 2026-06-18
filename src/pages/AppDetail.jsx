import { useState, useEffect, useCallback, useId } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Monitor, Terminal, Hash, Circle, Clock, BadgeCheck, Trash2, ExternalLink } from 'lucide-react'
import { useLocale } from '@/i18n'
import { Button } from '@/ui/button'
import { Checkbox } from '@/ui/checkbox'
import { Label } from '@/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/ui/dialog'

function formatDate(ts) {
  if (!ts) return '--'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function resolveUrl(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value.url || null
  return null
}

function resolveName(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') return value.name || null
  return null
}

export default function AppDetailPage() {
  const { t } = useLocale()
  const { appId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [info, setInfo] = useState(null)
  const deleteDataId = useId()
  const [showUninstall, setShowUninstall] = useState(false)
  const [deleteData, setDeleteData] = useState(false)
  const [uninstalling, setUninstalling] = useState(false)

  const loadInfo = useCallback(async () => {
    if (!appId) return
    try {
      const data = await window.JSOS?.getAppInfo(appId)
      if (data) setInfo(data)
    } catch (e) {}
  }, [appId])

  useEffect(() => { loadInfo() }, [loadInfo])

  useEffect(() => {
    if (searchParams.get('action') === 'uninstall') {
      setShowUninstall(true)
    }
  }, [searchParams])

  const handleUninstall = useCallback(async () => {
    setUninstalling(true)
    try {
      await window.JSOS?.uninstallApp(appId, deleteData)
      await window.JSOS?.toast({
        title: t('detail.uninstallSuccess'),
        description: t('detail.uninstallSuccessDesc', { name: info.name }),
        type: 'success',
      })
      navigate('/apps', { replace: true })
    } catch (e) {
      await window.JSOS?.toast({
        title: t('detail.uninstallFailed'),
        description: e.message,
        type: 'error',
      })
    }
    setUninstalling(false)
    setShowUninstall(false)
  }, [appId, deleteData, t, navigate])

  if (!info) return null

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-start gap-4 mb-6">
        {info.icon ? (
          <img src={info.icon} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary shrink-0">
            {(info.name || info.id)?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">{info.name}</h2>
            {info.isSystem && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                <BadgeCheck size={10} />
                {t('apps.system')}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">v{info.version}</p>
        </div>
      </div>

      {info.description && (
        <p className="text-sm text-muted-foreground mb-6">{info.description}</p>
      )}

      <div className="border border-border rounded-lg mb-6">
        <InfoRow
          icon={info.type === 'cli' ? Terminal : Monitor}
          label={t('detail.type')}
          value={info.type === 'cli' ? t('apps.cli') : t('apps.gui')}
        />
        <InfoRow icon={Hash} label={t('detail.version')} value={info.version} />
        {info.port != null && (
          <InfoRow icon={Hash} label={t('detail.port')} value={info.port} />
        )}
        <InfoRow
          icon={Circle}
          label={t('detail.status')}
          value={
            <span className={`inline-flex items-center gap-1.5 ${info.isRunning ? 'text-green-500' : 'text-muted-foreground'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${info.isRunning ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
              {info.isRunning ? t('apps.running') : t('apps.stopped')}
            </span>
          }
        />
        {info.installedAt && (
          <InfoRow icon={Clock} label={t('detail.installedAt')} value={formatDate(info.installedAt)} />
        )}
        {resolveName(info.author) && (
          <InfoRow icon={Hash} label={t('detail.author')} value={resolveName(info.author)} />
        )}
        {Array.isArray(info.contributors) && info.contributors.length > 0 && (
          <InfoRow
            icon={Hash}
            label={t('detail.contributors')}
            value={info.contributors.map(c => resolveName(c) || c).join(', ')}
          />
        )}
        {resolveUrl(info.repository) && (
          <InfoRow
            icon={Hash}
            label={t('detail.repository')}
            value={
              <a
                href={resolveUrl(info.repository)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {resolveUrl(info.repository)}
                <ExternalLink size={12} />
              </a>
            }
          />
        )}
        {resolveUrl(info.bugs) && (
          <InfoRow
            icon={Hash}
            label={t('detail.bugs')}
            value={
              <a
                href={resolveUrl(info.bugs)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {resolveUrl(info.bugs)}
                <ExternalLink size={12} />
              </a>
            }
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        {!info.isSystem && (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowUninstall(true)}
          >
            <Trash2 size={14} />
            {t('detail.uninstall')}
          </Button>
        )}
      </div>

      <Dialog open={showUninstall} onOpenChange={setShowUninstall}>
        <DialogContent showCloseButton={false} className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t('detail.uninstall')}</DialogTitle>
            <DialogDescription>
              {t('detail.uninstallDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 px-6">
            <Checkbox
              id={deleteDataId}
              checked={deleteData}
              onCheckedChange={setDeleteData}
            />
            <Label htmlFor={deleteDataId} className="text-sm cursor-pointer">
              {t('detail.deleteData')}
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUninstall(false)}>
              {t('detail.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleUninstall}
              disabled={uninstalling}
            >
              {uninstalling ? t('detail.uninstalling') : t('detail.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0">
      {Icon ? (
        <Icon size={14} className="shrink-0 text-muted-foreground" />
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-sm flex-1">{value || '--'}</span>
    </div>
  )
}
