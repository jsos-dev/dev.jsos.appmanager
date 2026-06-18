import { ShoppingBag } from 'lucide-react'
import { useLocale } from '@/i18n'

export default function StorePage() {
  const { t } = useLocale()

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">{t('store.title')}</h2>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShoppingBag size={48} className="text-muted-foreground/30 mb-4" />
        <p className="text-sm">{t('store.comingSoon')}</p>
      </div>
    </div>
  )
}
