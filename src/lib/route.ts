import { useEffect, useState } from 'react'
import type { ISODate } from './types'

export type Route =
  | { tab: 'dag'; date?: ISODate }
  | { tab: 'kalender' }
  | { tab: 'overzicht' }
  | { tab: 'instellingen' }

function parse(hash: string): Route {
  const [, tab, arg] = hash.replace(/^#/, '').split('/')
  switch (tab) {
    case 'kalender':
    case 'overzicht':
    case 'instellingen':
      return { tab }
    default:
      return { tab: 'dag', date: arg && /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : undefined }
  }
}

export function navigate(path: string, replace = false) {
  const hash = `#${path}`
  if (replace) history.replaceState(null, '', hash)
  else history.pushState(null, '', hash)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export const dayPath = (date: ISODate) => `/dag/${date}`

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parse(location.hash))
    window.addEventListener('hashchange', onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      window.removeEventListener('hashchange', onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])
  return route
}
