import { Share, Smartphone, SquarePlus } from 'lucide-react'
import { useInstallPrompt } from '../lib/install'
import { isIOS, isStandalone } from '../lib/platform'
import { Button, Card } from './ui'

/** Android/Chrome: install button via the browser prompt. */
export function InstallCard() {
  const install = useInstallPrompt()
  if (isStandalone()) return null
  if (isIOS()) return <IOSInstallCard />
  if (!install) return null
  return (
    <Card>
      <div className="flex items-center gap-3">
        <Smartphone size={22} className="shrink-0 text-rose-500" />
        <p className="flex-1 text-sm">Installeer de app op je startscherm, dan open je hem met één tik en blijven je gegevens beter bewaard.</p>
        <Button variant="primary" onClick={install}>
          Installeer
        </Button>
      </div>
    </Card>
  )
}

/** iOS has no install prompt: explain "Zet op beginscherm". Only shown in the browser, never in the installed app. */
export function IOSInstallCard() {
  if (!isIOS() || isStandalone()) return null
  return (
    <Card className="ring-2 ring-rose-500/30">
      <div className="flex items-start gap-3">
        <Smartphone size={22} className="mt-0.5 shrink-0 text-rose-500" />
        <div className="text-sm leading-relaxed">
          <p className="font-semibold">Zet de app op je beginscherm</p>
          <ol className="mt-1.5 space-y-1 text-muted">
            <li className="flex items-center gap-1.5">
              1. Tik op <Share size={16} className="inline text-ink" aria-label="Deel" /> <b className="text-ink">Deel</b>
            </li>
            <li className="flex items-center gap-1.5">
              2. Kies <SquarePlus size={16} className="inline text-ink" aria-hidden /> <b className="text-ink">Zet op beginscherm</b>
            </li>
            <li>3. Open de app voortaan via het icoon</li>
          </ol>
          <p className="mt-2 text-xs text-muted">
            Doe dit vóórdat je gaat invullen: op iPhone heeft de app op je beginscherm een eigen opslag, los van Safari. Gegevens in Safari zelf kunnen na een
            week zonder gebruik worden gewist.
          </p>
        </div>
      </div>
    </Card>
  )
}
