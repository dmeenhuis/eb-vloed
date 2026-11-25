import { CalendarDays, ChartLine, NotebookPen, Settings as SettingsIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx, FeedbackProvider, useToast } from './components/ui'
import { DayView } from './views/DayView'
import { CalendarView } from './views/CalendarView'
import { OverviewView } from './views/OverviewView'
import { SettingsView } from './views/SettingsView'
import { StoreProvider, useStore } from './lib/store'
import { navigate, useRoute, type Route } from './lib/route'

export default function App() {
  return (
    <FeedbackProvider>
      <WithStore />
    </FeedbackProvider>
  )
}

function WithStore() {
  const toast = useToast()
  return (
    <StoreProvider onError={toast}>
      <Shell />
    </StoreProvider>
  )
}

function Shell() {
  const { loaded, error } = useStore()
  const route = useRoute()

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {error ? (
        <div className="mt-20 rounded-3xl bg-card p-6 text-center">
          <p className="font-semibold">Opslag niet beschikbaar</p>
          <p className="mt-2 text-sm text-muted">
            De browser staat het opslaan van gegevens niet toe (bijvoorbeeld in een incognitovenster). Details: {error}
          </p>
        </div>
      ) : !loaded ? null : (
        <Screen route={route} />
      )}
      <BottomNav route={route} />
    </div>
  )
}

function Screen({ route }: { route: Route }) {
  switch (route.tab) {
    case 'kalender':
      return <CalendarView />
    case 'overzicht':
      return <OverviewView />
    case 'instellingen':
      return <SettingsView />
    default:
      return <DayView date={route.date} />
  }
}

const TABS: { tab: Route['tab']; label: string; icon: ReactNode; path: string }[] = [
  { tab: 'dag', label: 'Dagboek', icon: <NotebookPen size={22} />, path: '/' },
  { tab: 'kalender', label: 'Kalender', icon: <CalendarDays size={22} />, path: '/kalender' },
  { tab: 'overzicht', label: 'Overzicht', icon: <ChartLine size={22} />, path: '/overzicht' },
  { tab: 'instellingen', label: 'Instellingen', icon: <SettingsIcon size={22} />, path: '/instellingen' },
]

function BottomNav({ route }: { route: Route }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((t) => {
          const active = route.tab === t.tab
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => {
                navigate(t.path)
                window.scrollTo({ top: 0 })
              }}
              className={cx('flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition-colors', active ? 'text-rose-500' : 'text-muted')}
              aria-current={active ? 'page' : undefined}
            >
              <span className={cx('grid h-8 w-14 place-items-center rounded-full transition-colors', active && 'bg-rose-500/12')}>{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
