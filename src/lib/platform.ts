/** iPhone/iPad (iPadOS reports itself as a Mac with touch). */
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)

/** Running as an installed app (home screen) instead of in a browser tab. */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
