import { useEffect, useState } from 'react'
import { defaultHomepage, type HomepageSettings } from '../../models/homepage'
import { getHomepageRepository } from '../../repositories/homepageRepository'
export function useHomepage() {
  const [settings, setSettings] = useState<HomepageSettings>(defaultHomepage)
  useEffect(() => {
    if ((import.meta.env.VITE_PUBLIC_DATA_SOURCE || 'local') !== 'firebase') return
    try {
      return getHomepageRepository().subscribe(setSettings, () => {
        // Missing/unavailable settings retain a readable homepage.
      })
    } catch { /* The built-in homepage remains available. */ }
  }, [])
  return settings
}
