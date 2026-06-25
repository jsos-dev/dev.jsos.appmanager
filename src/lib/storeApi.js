const STORE_RAW_URL = 'https://raw.githubusercontent.com/jsos-dev/jsos-app-store/main/store.json'

let cache = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

export async function fetchStore({ force = false } = {}) {
  const now = Date.now()
  if (!force && cache && now - cacheTime < CACHE_TTL) {
    return cache
  }

  const resp = await fetch(STORE_RAW_URL, { cache: 'no-store' })
  if (!resp.ok) {
    throw new Error(`Failed to fetch store data: ${resp.status}`)
  }

  cache = await resp.json()
  cacheTime = now
  return cache
}

export function filterApps(apps, { query = '', category = '', sort = 'stars' } = {}) {
  let filtered = [...apps]

  if (query) {
    const q = query.toLowerCase()
    filtered = filtered.filter(app => {
      const name = typeof app.name === 'object' ? (app.name.en || '') : app.name
      const desc = typeof app.description === 'object' ? (app.description.en || '') : app.description
      const tags = (app.tags || []).join(' ').toLowerCase()
      return (
        name.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        tags.includes(q)
      )
    })
  }

  if (category && category !== 'all') {
    filtered = filtered.filter(app => app.category === category)
  }

  switch (sort) {
    case 'stars':
      filtered.sort((a, b) => (b.stars || 0) - (a.stars || 0))
      break
    case 'updated':
      filtered.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      break
    case 'name':
      filtered.sort((a, b) => {
        const na = typeof a.name === 'object' ? (a.name.en || '') : a.name
        const nb = typeof b.name === 'object' ? (b.name.en || '') : b.name
        return na.localeCompare(nb)
      })
      break
  }

  return filtered
}
