// Werbe-Schnittstelle. Aktuell Platzhalter: das Banner zeigt "Anzeige", das Video ist
// ein Countdown. Später hier AdSense (Web) bzw. AdMob (App) anbinden – die Screens
// rufen nur diese Funktionen auf und müssen dann nicht geändert werden.

export const BANNER_ENABLED = true

type Request = { label: string; resolve: (watched: boolean) => void }
let listener: ((r: Request) => void) | null = null

/** Wird von <AdHost> registriert, das das Video-Overlay anzeigt. */
export function onRewardedAdRequest(fn: ((r: Request) => void) | null) {
  listener = fn
}

/** Zeigt ein Werbevideo. Liefert true, wenn es bis zum Ende angesehen wurde. */
export function showRewardedAd(label: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) return resolve(false)
    listener({ label, resolve })
  })
}
