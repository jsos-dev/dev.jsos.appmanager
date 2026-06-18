import { useState, useEffect, useCallback, createContext, useContext } from 'react'

const LocaleContext = createContext(null)

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState('zh-CN')
  const [messages, setMessages] = useState({})

  useEffect(() => {
    async function init() {
      try {
        const lang = await window.JSOS?.getLocale()
        if (lang) setLocaleState(lang)
      } catch (e) {}
    }
    init()
    const unsub = window.JSOS?.onLocaleChange?.(lang => {
      if (lang) setLocaleState(lang)
    })
    return () => unsub?.()
  }, [])

  useEffect(() => {
    switch (locale) {
      case 'en':
        import('./en.js').then(m => {
          setMessages(m.default ? m.default.en || m.en : m.en || {})
        })
        break
      default:
        import('./zh-CN.js').then(m => {
          setMessages(m.default ? m.default.zhCN || m.zhCN : m.zhCN || {})
        })
        break
    }
  }, [locale])

  const setLocale = useCallback(async (lang) => {
    setLocaleState(lang)
    try { await window.JSOS?.setLocale(lang) } catch (e) {}
  }, [])

  const t = useCallback((key, params = {}) => {
    let text = messages[key] || key
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v)
    }
    return text
  }, [messages])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
