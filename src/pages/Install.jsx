import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, UploadCloud, Check, AlertTriangle, FileArchive, GitBranch, Link, Download, Globe, Tag, Package } from 'lucide-react'
import { useLocale } from '@/i18n'
import { resolveLocalized } from '@/lib/localize'
import { Button } from '@/ui/button'
import { Tabs, TabsList, TabsTab, TabsPanel } from '@/ui/tabs'
import { Input } from '@/ui/input'

const ACTION_VARIANTS = {
  install: 'default',
  upgrade: 'default',
  downgrade: 'warning',
  overwrite: 'secondary',
}

// Convert GitHub URL to raw.githubusercontent.com URL to avoid 302 redirect
function toRawUrl(url) {
  if (!url) return url
  const match = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)$/)
  if (match) {
    return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}`
  }
  return url
}

export default function InstallPage() {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const fileRef = useRef(null)

  // Auto-fill GitHub URL from Store page
  const prefilledGithubUrl = location.state?.githubUrl || ''
  const prefilledTab = location.state?.tab || 'local'

  const [status, setStatus] = useState('idle') // idle | parsing | ready | installing
  const [parseResult, setParseResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [activeTab, setActiveTab] = useState(prefilledTab)

  // 远程 URL 安装相关状态
  const [remoteUrl, setRemoteUrl] = useState('')
  const [remoteStatus, setRemoteStatus] = useState('idle') // idle | fetching | parsing | ready | installing
  const [remoteParseResult, setRemoteParseResult] = useState(null)
  const [remoteInstalled, setRemoteInstalled] = useState(false)
  const [remoteFile, setRemoteFile] = useState(null)
  const [fetchProgress, setFetchProgress] = useState(0)

  // GitHub 安装相关状态
  const [githubUrl, setGithubUrl] = useState('')
  const [githubStatus, setGithubStatus] = useState('idle') // idle | fetching | selecting | downloading | parsing | ready | installing
  const [githubRepo, setGithubRepo] = useState(null) // { owner, repo }
  const [githubManifest, setGithubManifest] = useState(null)
  const [githubReleases, setGithubReleases] = useState([])
  const [githubSelectedRelease, setGithubSelectedRelease] = useState(null)
  const [githubParseResult, setGithubParseResult] = useState(null)
  const [githubInstalled, setGithubInstalled] = useState(false)
  const [githubFile, setGithubFile] = useState(null)
  const [githubDownloadProgress, setGithubDownloadProgress] = useState(0)

  // Auto-fill and auto-fetch GitHub URL from Store page
  const autoFetchRef = useRef(false)
  useEffect(() => {
    if (prefilledGithubUrl && !autoFetchRef.current) {
      autoFetchRef.current = true
      setGithubUrl(prefilledGithubUrl)
      // Trigger auto-fetch after state is set
      setTimeout(() => {
        fetchGithubInfoWithURL(prefilledGithubUrl)
      }, 0)
    }
  }, [prefilledGithubUrl])

  const parseFile = useCallback(async (file) => {
    setStatus('parsing')
    setParseResult(null)

    try {
      const result = await window.JSOS?.parseZip(file)
      if (result) {
        setParseResult(result)
        setStatus(result.valid ? 'ready' : 'idle')
        if (!result.valid) {
          await window.JSOS?.toast({
            title: t('install.parseFailed'),
            description: result.error,
            type: 'error',
          })
        }
      }
    } catch (e) {
      setStatus('idle')
      await window.JSOS?.toast({
        title: t('install.parseFailed'),
        description: e.message,
        type: 'error',
      })
    }
  }, [t])

  // 远程 URL 安装：获取并解析 ZIP 文件
  const fetchRemoteZip = useCallback(async () => {
    if (!remoteUrl.trim()) {
      await window.JSOS?.toast({
        title: t('install.remoteUrlRequired'),
        description: t('install.remoteUrlRequiredDesc'),
        type: 'error',
      })
      return
    }

    // 验证 URL 格式
    let normalizedUrl = remoteUrl.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    try {
      new URL(normalizedUrl)
    } catch {
      await window.JSOS?.toast({
        title: t('install.remoteUrlInvalid'),
        description: t('install.remoteUrlInvalidDesc'),
        type: 'error',
      })
      return
    }

    setRemoteStatus('fetching')
    setFetchProgress(0)
    setRemoteParseResult(null)
    setRemoteFile(null)

    try {
      // 获取代理配置
      const proxyConfig = await window.JSOS?.getProxyConfig()

      let fetchUrl = normalizedUrl
      const fetchOptions = {}

      // 如果配置了代理，构造代理URL
      if (proxyConfig?.url) {
        fetchUrl = `${proxyConfig.url}/${normalizedUrl}`
        if (proxyConfig.key) {
          fetchOptions.headers = { 'x-cors-proxy-key': proxyConfig.key }
        }
      }

      // 获取文件
      const response = await fetch(fetchUrl, fetchOptions)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // 获取文件大小
      const contentLength = response.headers.get('content-length')
      const totalSize = contentLength ? parseInt(contentLength, 10) : 0

      // 读取响应流
      const reader = response.body.getReader()
      const chunks = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        receivedLength += value.length

        // 更新进度
        if (totalSize > 0) {
          setFetchProgress(Math.round((receivedLength / totalSize) * 100))
        }
      }

      // 合并所有 chunks
      const allChunks = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        allChunks.set(chunk, position)
        position += chunk.length
      }

      // 创建 File 对象
      const fileName = normalizedUrl.split('/').pop() || 'app.zip'
      const file = new File([allChunks], fileName, { type: 'application/zip' })

      // 验证是否为 ZIP 文件
      if (!fileName.toLowerCase().endsWith('.zip')) {
        // 检查 magic number
        const magic = allChunks.slice(0, 4)
        const isZip = magic[0] === 0x50 && magic[1] === 0x4B && magic[2] === 0x03 && magic[3] === 0x04
        if (!isZip) {
          throw new Error(t('install.remoteNotZip'))
        }
      }

      setRemoteFile(file)
      setRemoteStatus('parsing')

      // 解析 ZIP 文件
      const result = await window.JSOS?.parseZip(file)
      if (result) {
        setRemoteParseResult(result)
        setRemoteStatus(result.valid ? 'ready' : 'idle')
        if (!result.valid) {
          await window.JSOS?.toast({
            title: t('install.parseFailed'),
            description: result.error,
            type: 'error',
          })
        }
      }
    } catch (e) {
      setRemoteStatus('idle')
      await window.JSOS?.toast({
        title: t('install.remoteFetchFailed'),
        description: e.message,
        type: 'error',
      })
    }
  }, [remoteUrl, t])

  // 远程 URL 安装：执行安装
  const handleRemoteInstall = useCallback(async () => {
    if (!remoteParseResult?.valid || !remoteFile) return
    setRemoteStatus('installing')

    try {
      let result
      if (remoteParseResult.installAction === 'upgrade') {
        // 升级：先卸载旧版本（保留数据），再安装新版本
        await window.JSOS?.uninstallApp(remoteParseResult.manifest.id, false)
        result = await window.JSOS?.installApp(remoteFile)
      } else {
        result = await window.JSOS?.installApp(remoteFile)
      }

      if (result?.success) {
        setRemoteInstalled(true)
        setRemoteStatus('ready')
        await window.JSOS?.toast({
          title: t('install.installComplete'),
          description: t('install.installCompleteDesc', {
            name: resolveLocalized(remoteParseResult.manifest.name, locale) || remoteParseResult.manifest.id,
            version: remoteParseResult.manifest.version,
          }),
          type: 'success',
        })
      } else {
        setRemoteStatus('ready')
        await window.JSOS?.toast({
          title: t('install.installFailed'),
          description: result?.error,
          type: 'error',
        })
      }
    } catch (e) {
      setRemoteStatus('ready')
      await window.JSOS?.toast({
        title: t('install.installFailed'),
        description: e.message,
        type: 'error',
      })
    }
  }, [remoteParseResult, remoteFile, t])

  // ==================== GitHub 安装 ====================

  // 验证 GitHub URL 格式
  const parseGithubUrl = useCallback((url) => {
    const trimmed = url.trim()
    // 支持格式：https://github.com/user/repo 或 github.com/user/repo
    const match = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\/|$)/i)
    if (!match) return null
    return { owner: match[1], repo: match[2] }
  }, [])

  // GitHub API 请求封装
  const githubApiFetch = useCallback(async (url) => {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    })
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(t('install.githubRepoNotFound'))
      }
      if (response.status === 403) {
        throw new Error(t('install.githubRateLimit'))
      }
      throw new Error(`GitHub API: ${response.status}`)
    }
    return response.json()
  }, [t])

  // 步骤1：获取仓库信息和 package.json
  const fetchGithubInfoInternal = useCallback(async (url) => {
    if (!url.trim()) {
      await window.JSOS?.toast({
        title: t('install.githubUrlRequired'),
        description: t('install.githubUrlRequiredDesc'),
        type: 'error',
      })
      return
    }

    const repoInfo = parseGithubUrl(url)
    if (!repoInfo) {
      await window.JSOS?.toast({
        title: t('install.githubUrlInvalid'),
        description: t('install.githubUrlInvalidDesc'),
        type: 'error',
      })
      return
    }

    setGithubStatus('fetching')
    setGithubRepo(repoInfo)
    setGithubManifest(null)
    setGithubReleases([])
    setGithubSelectedRelease(null)
    setGithubParseResult(null)
    setGithubInstalled(false)
    setGithubFile(null)

    try {
      // 获取 package.json
      const packageJson = await githubApiFetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/package.json`
      )

      // 解析 base64 内容（支持 UTF-8）
      const base64 = packageJson.content.replace(/\n/g, '')
      const content = new TextDecoder().decode(
        Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      )
      const pkg = JSON.parse(content)

      // 验证 jsos 配置
      if (!pkg.jsos || !pkg.jsos.id || !pkg.jsos.startCommand) {
        throw new Error(t('install.githubNoJsos'))
      }

      setGithubManifest({
        ...pkg.jsos,
        icon: toRawUrl(pkg.jsos.icon),
        version: pkg.version || '1.0.0',
        _repoInfo: repoInfo,
      })

      // 获取 releases
      try {
        const releases = await githubApiFetch(
          `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases`
        )
        setGithubReleases(releases)
      } catch {
        // releases 可能不存在，忽略错误
      }

      setGithubStatus('selecting')
    } catch (e) {
      setGithubStatus('idle')
      await window.JSOS?.toast({
        title: t('install.githubFetchFailed'),
        description: e.message,
        type: 'error',
      })
    }
  }, [githubApiFetch, parseGithubUrl, t])

  const fetchGithubInfo = useCallback(() => {
    return fetchGithubInfoInternal(githubUrl)
  }, [githubUrl, fetchGithubInfoInternal])

  const fetchGithubInfoWithURL = useCallback((url) => {
    return fetchGithubInfoInternal(url)
  }, [fetchGithubInfoInternal])

  // 步骤2：选择版本并下载
  const fetchGithubRelease = useCallback(async (release) => {
    if (!release || !githubManifest?._repoInfo) return

    setGithubSelectedRelease(release)
    setGithubStatus('downloading')
    setGithubDownloadProgress(0)

    const { owner, repo } = githubManifest._repoInfo
    const tagName = release.tag_name
    const version = githubManifest.version

    try {
      // 尝试多种可能的文件名格式
      const possibleNames = [
        `${githubManifest.id}-${version}.zip`,
        `${githubManifest.id}-${tagName}.zip`,
        `${repo}-${version}.zip`,
        `${repo}-${tagName}.zip`,
      ]

      let downloadUrl = null
      let zipAsset = null

      // 从 release assets 中查找
      if (release.assets && release.assets.length > 0) {
        for (const name of possibleNames) {
          zipAsset = release.assets.find(a => a.name === name)
          if (zipAsset) {
            downloadUrl = zipAsset.browser_download_url
            break
          }
        }
        // 如果没找到精确匹配，尝试找到任何 .zip 文件
        if (!downloadUrl) {
          zipAsset = release.assets.find(a => a.name.endsWith('.zip'))
          if (zipAsset) {
            downloadUrl = zipAsset.browser_download_url
          }
        }
      }

      // 如果没有 release assets，尝试直接下载
      if (!downloadUrl) {
        // 尝试常见路径
        downloadUrl = `https://github.com/${owner}/${repo}/archive/refs/tags/${tagName}.zip`
      }

      // 获取代理配置
      const proxyConfig = await window.JSOS?.getProxyConfig()

      let fetchUrl = downloadUrl
      const fetchOptions = {}

      // 如果配置了代理，构造代理URL
      if (proxyConfig?.url) {
        fetchUrl = `${proxyConfig.url}/${downloadUrl}`
        if (proxyConfig.key) {
          fetchOptions.headers = { 'x-cors-proxy-key': proxyConfig.key }
        }
      }

      // 下载文件
      const response = await fetch(fetchUrl, fetchOptions)
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }

      const contentLength = response.headers.get('content-length')
      const totalSize = contentLength ? parseInt(contentLength, 10) : 0

      const reader = response.body.getReader()
      const chunks = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        receivedLength += value.length
        if (totalSize > 0) {
          setGithubDownloadProgress(Math.round((receivedLength / totalSize) * 100))
        }
      }

      const allChunks = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        allChunks.set(chunk, position)
        position += chunk.length
      }

      // 创建 File 对象
      const fileName = zipAsset?.name || `${githubManifest.id}-${version}.zip`
      const file = new File([allChunks], fileName, { type: 'application/zip' })

      setGithubFile(file)
      setGithubStatus('parsing')

      // 解析 ZIP 文件
      const result = await window.JSOS?.parseZip(file)
      if (result) {
        setGithubParseResult(result)
        setGithubStatus(result.valid ? 'ready' : 'selecting')
        if (!result.valid) {
          await window.JSOS?.toast({
            title: t('install.parseFailed'),
            description: result.error,
            type: 'error',
          })
        }
      }
    } catch (e) {
      setGithubStatus('selecting')
      await window.JSOS?.toast({
        title: t('install.githubDownloadFailed'),
        description: e.message,
        type: 'error',
      })
    }
  }, [githubManifest, t])

  // GitHub 安装：执行安装
  const handleGithubInstall = useCallback(async () => {
    if (!githubParseResult?.valid || !githubFile) return
    setGithubStatus('installing')

    try {
      let result
      if (githubParseResult.installAction === 'upgrade') {
        await window.JSOS?.uninstallApp(githubParseResult.manifest.id, false)
        result = await window.JSOS?.installApp(githubFile)
      } else {
        result = await window.JSOS?.installApp(githubFile)
      }

      if (result?.success) {
        setGithubInstalled(true)
        setGithubStatus('ready')
        await window.JSOS?.toast({
          title: t('install.installComplete'),
          description: t('install.installCompleteDesc', {
            name: resolveLocalized(githubParseResult.manifest.name, locale) || githubParseResult.manifest.id,
            version: githubParseResult.manifest.version,
          }),
          type: 'success',
        })
      } else {
        setGithubStatus('ready')
        await window.JSOS?.toast({
          title: t('install.installFailed'),
          description: result?.error,
          type: 'error',
        })
      }
    } catch (e) {
      setGithubStatus('ready')
      await window.JSOS?.toast({
        title: t('install.installFailed'),
        description: e.message,
        type: 'error',
      })
    }
  }, [githubParseResult, githubFile, t])

  // 重置 GitHub 安装状态
  const resetGithub = useCallback(() => {
    setGithubUrl('')
    setGithubStatus('idle')
    setGithubRepo(null)
    setGithubManifest(null)
    setGithubReleases([])
    setGithubSelectedRelease(null)
    setGithubParseResult(null)
    setGithubInstalled(false)
    setGithubFile(null)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!parseResult?.valid) return
    setStatus('installing')

    try {
      let result
      if (parseResult.installAction === 'upgrade') {
        // 升级：先卸载旧版本（保留数据），再安装新版本
        await window.JSOS?.uninstallApp(parseResult.manifest.id, false)
        result = await window.JSOS?.installApp(fileRef.current)
      } else {
        result = await window.JSOS?.installApp(fileRef.current)
      }

      if (result?.success) {
        setInstalled(true)
        setStatus('ready')
        await window.JSOS?.toast({
          title: t('install.installComplete'),
          description: t('install.installCompleteDesc', {
            name: resolveLocalized(parseResult.manifest.name, locale) || parseResult.manifest.id,
            version: parseResult.manifest.version,
          }),
          type: 'success',
        })
      } else {
        setStatus('ready')
        await window.JSOS?.toast({
          title: t('install.installFailed'),
          description: result?.error,
          type: 'error',
        })
      }
    } catch (e) {
      setStatus('ready')
      await window.JSOS?.toast({
        title: t('install.installFailed'),
        description: e.message,
        type: 'error',
      })
    }
  }, [parseResult, t])

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!file.name?.toLowerCase().endsWith('.zip')) {
      window.JSOS?.toast({
        title: t('install.parseFailed'),
        description: t('install.installFailed'),
        type: 'error',
      })
      return
    }
    const input = fileInputRef.current
    if (input) {
      const dt = new DataTransfer()
      dt.items.add(file)
      input.files = dt.files
    }
    fileRef.current = file
    parseFile(file)
  }, [parseFile, t])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const actionLabel = (() => {
    if (!parseResult?.installAction) return t('install.actionInstall')
    const key = 'install.action' + parseResult.installAction.charAt(0).toUpperCase() + parseResult.installAction.slice(1)
    return t(key)
  })()

  const confirmText = (() => {
    switch (parseResult?.installAction) {
      case 'upgrade': return t('install.confirmUpgrade')
      case 'downgrade': return t('install.confirmDowngrade')
      case 'overwrite': return t('install.confirmOverwrite')
      default: return t('install.confirmInstall')
    }
  })()

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">{t('install.title')}</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTab value="local">{t('install.tabLocal')}</TabsTab>
          <TabsTab value="github">{t('install.tabGithub')}</TabsTab>
          <TabsTab value="remote">{t('install.tabRemote')}</TabsTab>
        </TabsList>

        <TabsPanel value="local">
          {status === 'parsing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="text-sm text-muted-foreground">{t('install.parsing')}</div>
            </div>
          )}

          {(status === 'idle' || (status === 'ready' && !parseResult?.valid)) && (
            <div
              className={`relative border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={40} className="text-muted-foreground" />
              <div className="text-sm font-medium text-muted-foreground">
                {dragOver ? t('install.dropActive') : t('install.dropHint')}
              </div>
              <div className="text-xs text-muted-foreground/60">{t('install.zipFormat')}</div>
              <Button variant="outline" size="sm" className="mt-2 pointer-events-none">
                {t('install.selectFile')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>
          )}

          {status === 'ready' && parseResult?.valid && (
            <div>
              <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                {parseResult.manifest.icon ? (
                  <img src={parseResult.manifest.icon} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary shrink-0">
                    <FileArchive size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{resolveLocalized(parseResult.manifest.name, locale) || parseResult.manifest.id}</h3>
                  <p className="text-sm text-muted-foreground">v{parseResult.manifest.version}</p>
                  {parseResult.manifest.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {resolveLocalized(parseResult.manifest.description, locale)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{t('install.fileCount', { count: parseResult.fileCount })}</span>
                    {parseResult.existingVersion && (
                      <span>{t('install.currentVersion', { version: parseResult.existingVersion })}</span>
                    )}
                  </div>
                  {parseResult.installAction === 'downgrade' && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-500">
                      <AlertTriangle size={12} />
                      {t('install.downgradeWarning')}
                    </div>
                  )}
                </div>
              </div>

              {!installed && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-4">{confirmText}</p>
                </div>
              )}
            </div>
          )}

          {status === 'installing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="text-sm text-muted-foreground">{t('install.installing')}</div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-6">
            <Button variant="ghost" onClick={() => navigate('/apps')}>
              {t('install.cancel')}
            </Button>
            {status === 'ready' && !installed && (
              <Button
                variant={ACTION_VARIANTS[parseResult?.installAction] || 'default'}
                onClick={handleInstall}
              >
                {actionLabel}
              </Button>
            )}
            {installed && (
              <Button onClick={() => {
                if (parseResult?.manifest?.id) {
                  window.JSOS?.openApp(parseResult.manifest.id)
                }
              }}>
                <Check size={14} />
                {t('install.open')}
              </Button>
            )}
          </div>
        </TabsPanel>

        <TabsPanel value="github">
          {/* URL 输入区域 */}
          {githubStatus === 'idle' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <GitBranch size={48} className="text-muted-foreground/30 mb-4" />
                <p className="text-sm">{t('install.githubHint')}</p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder={t('install.githubPlaceholder')}
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchGithubInfo()
                  }}
                  className="flex-1"
                />
                <Button onClick={fetchGithubInfo} disabled={!githubUrl.trim()}>
                  {t('install.githubFetch')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('install.githubHintDesc')}</p>
            </div>
          )}

          {/* 获取中 */}
          {githubStatus === 'fetching' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="text-sm text-muted-foreground">{t('install.githubFetching')}</div>
            </div>
          )}

          {/* 选择版本 */}
          {githubStatus === 'selecting' && githubManifest && (
            <div className="space-y-4">
              {/* 应用信息卡片 */}
              <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary shrink-0">
                  <Package size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">
                    {resolveLocalized(githubManifest.name, locale) || githubManifest.id}
                  </h3>
                  <p className="text-sm text-muted-foreground">v{githubManifest.version}</p>
                  {githubManifest.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {resolveLocalized(githubManifest.description, locale)}
                    </p>
                  )}
                </div>
              </div>

              {/* 版本选择 */}
              {githubReleases.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium mb-2">{t('install.githubSelectVersion')}</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {githubReleases.map((release) => (
                      <div
                        key={release.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          githubSelectedRelease?.id === release.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                        onClick={() => fetchGithubRelease(release)}
                      >
                        <div className="flex items-center gap-3">
                          <Tag size={16} className="text-muted-foreground" />
                          <div>
                            <span className="font-medium">{release.tag_name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Date(release.published_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          {t('install.githubDownload')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">{t('install.githubNoReleases')}</p>
                  <p className="text-xs mt-1">{t('install.githubNoReleasesDesc')}</p>
                </div>
              )}

              <Button variant="ghost" onClick={resetGithub}>
                {t('install.githubReset')}
              </Button>
            </div>
          )}

          {/* 下载中 */}
          {githubStatus === 'downloading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="text-sm text-muted-foreground">{t('install.githubDownloading')}</div>
              {githubDownloadProgress > 0 && (
                <div className="w-64">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${githubDownloadProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-center">{githubDownloadProgress}%</div>
                </div>
              )}
            </div>
          )}

          {/* 解析中 */}
          {githubStatus === 'parsing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="text-sm text-muted-foreground">{t('install.parsing')}</div>
            </div>
          )}

          {/* 解析完成，显示安装信息 */}
          {githubStatus === 'ready' && githubParseResult?.valid && (
            <div>
              <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                {githubParseResult.manifest.icon ? (
                  <img src={githubParseResult.manifest.icon} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary shrink-0">
                    <FileArchive size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{resolveLocalized(githubParseResult.manifest.name, locale) || githubParseResult.manifest.id}</h3>
                  <p className="text-sm text-muted-foreground">v{githubParseResult.manifest.version}</p>
                  {githubParseResult.manifest.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {resolveLocalized(githubParseResult.manifest.description, locale)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{t('install.fileCount', { count: githubParseResult.fileCount })}</span>
                    {githubParseResult.existingVersion && (
                      <span>{t('install.currentVersion', { version: githubParseResult.existingVersion })}</span>
                    )}
                  </div>
                  {githubParseResult.installAction === 'downgrade' && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-500">
                      <AlertTriangle size={12} />
                      {t('install.downgradeWarning')}
                    </div>
                  )}
                </div>
              </div>

              {!githubInstalled && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    {githubParseResult.installAction === 'upgrade'
                      ? t('install.confirmUpgrade')
                      : githubParseResult.installAction === 'downgrade'
                      ? t('install.confirmDowngrade')
                      : githubParseResult.installAction === 'overwrite'
                      ? t('install.confirmOverwrite')
                      : t('install.confirmInstall')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 安装中 */}
          {githubStatus === 'installing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="text-sm text-muted-foreground">{t('install.installing')}</div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 mt-6">
            <Button variant="ghost" onClick={() => navigate('/apps')}>
              {t('install.cancel')}
            </Button>
            {githubStatus === 'ready' && !githubInstalled && (
              <Button
                variant={ACTION_VARIANTS[githubParseResult?.installAction] || 'default'}
                onClick={handleGithubInstall}
              >
                {githubParseResult?.installAction === 'upgrade'
                  ? t('install.actionUpgrade')
                  : githubParseResult?.installAction === 'downgrade'
                  ? t('install.actionDowngrade')
                  : githubParseResult?.installAction === 'overwrite'
                  ? t('install.actionOverwrite')
                  : t('install.actionInstall')}
              </Button>
            )}
            {githubInstalled && (
              <Button onClick={() => {
                if (githubParseResult?.manifest?.id) {
                  window.JSOS?.openApp(githubParseResult.manifest.id)
                }
              }}>
                <Check size={14} />
                {t('install.open')}
              </Button>
            )}
          </div>
        </TabsPanel>

        <TabsPanel value="remote">
          {/* URL 输入区域 */}
          {remoteStatus === 'idle' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Globe size={48} className="text-muted-foreground/30 mb-4" />
                <p className="text-sm">{t('install.remoteHint')}</p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder={t('install.remotePlaceholder')}
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchRemoteZip()
                  }}
                  className="flex-1"
                />
                <Button onClick={fetchRemoteZip} disabled={!remoteUrl.trim()}>
                  {t('install.remoteFetch')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('install.remoteHintDesc')}</p>
            </div>
          )}

          {/* 下载中 */}
          {remoteStatus === 'fetching' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="text-sm text-muted-foreground">{t('install.remoteDownloading')}</div>
              {fetchProgress > 0 && (
                <div className="w-64">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${fetchProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-center">{fetchProgress}%</div>
                </div>
              )}
            </div>
          )}

          {/* 解析中 */}
          {remoteStatus === 'parsing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="text-sm text-muted-foreground">{t('install.parsing')}</div>
            </div>
          )}

          {/* 解析完成，显示应用信息 */}
          {remoteStatus === 'ready' && remoteParseResult?.valid && (
            <div>
              <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                {remoteParseResult.manifest.icon ? (
                  <img src={remoteParseResult.manifest.icon} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary shrink-0">
                    <FileArchive size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{resolveLocalized(remoteParseResult.manifest.name, locale) || remoteParseResult.manifest.id}</h3>
                  <p className="text-sm text-muted-foreground">v{remoteParseResult.manifest.version}</p>
                  {remoteParseResult.manifest.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {resolveLocalized(remoteParseResult.manifest.description, locale)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{t('install.fileCount', { count: remoteParseResult.fileCount })}</span>
                    {remoteParseResult.existingVersion && (
                      <span>{t('install.currentVersion', { version: remoteParseResult.existingVersion })}</span>
                    )}
                  </div>
                  {remoteParseResult.installAction === 'downgrade' && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-500">
                      <AlertTriangle size={12} />
                      {t('install.downgradeWarning')}
                    </div>
                  )}
                </div>
              </div>

              {!remoteInstalled && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    {remoteParseResult.installAction === 'upgrade'
                      ? t('install.confirmUpgrade')
                      : remoteParseResult.installAction === 'downgrade'
                      ? t('install.confirmDowngrade')
                      : remoteParseResult.installAction === 'overwrite'
                      ? t('install.confirmOverwrite')
                      : t('install.confirmInstall')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 安装中 */}
          {remoteStatus === 'installing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="text-sm text-muted-foreground">{t('install.installing')}</div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 mt-6">
            <Button variant="ghost" onClick={() => navigate('/apps')}>
              {t('install.cancel')}
            </Button>
            {remoteStatus === 'idle' && (
              <Button variant="outline" onClick={() => setRemoteStatus('idle')}>
                {t('install.remoteReset')}
              </Button>
            )}
            {remoteStatus === 'ready' && !remoteInstalled && (
              <Button
                variant={ACTION_VARIANTS[remoteParseResult?.installAction] || 'default'}
                onClick={handleRemoteInstall}
              >
                {remoteParseResult?.installAction === 'upgrade'
                  ? t('install.actionUpgrade')
                  : remoteParseResult?.installAction === 'downgrade'
                  ? t('install.actionDowngrade')
                  : remoteParseResult?.installAction === 'overwrite'
                  ? t('install.actionOverwrite')
                  : t('install.actionInstall')}
              </Button>
            )}
            {remoteInstalled && (
              <Button onClick={() => {
                if (remoteParseResult?.manifest?.id) {
                  window.JSOS?.openApp(remoteParseResult.manifest.id)
                }
              }}>
                <Check size={14} />
                {t('install.open')}
              </Button>
            )}
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  )
}
