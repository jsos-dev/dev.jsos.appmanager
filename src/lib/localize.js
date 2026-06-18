export function resolveLocalized(value, locale) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    return value[locale] || value['en'] || Object.values(value)[0] || ''
  }
  return String(value)
}
