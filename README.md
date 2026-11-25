# Eb & Vloed

Mobile-first PWA for daily tracking of the menstrual cycle, hormone use and symptoms. Based on the Excel sheet
"Cyclus- en hormoondagboek". The UI is in Dutch.

All data stays on the device (IndexedDB). There is no backend.

## Development

Requires Node 24 (`nvm use`) and pnpm (version pinned in `package.json`; `corepack enable` picks it up automatically).

```sh
pnpm install
pnpm dev           # dev server, also reachable from a phone on the same network
pnpm test          # unit tests (cycle logic, medication schedule, Excel import)
pnpm build         # type check + production bundle in dist/
pnpm preview       # serve dist/ locally
pnpm run deploy    # upload dist/ via FTP (see .env.sample); `pnpm deploy` is a built-in pnpm command
```

The Excel import test runs against the original sheet when it is available at
`~/Downloads/cyclus_en_hormoondagboek juiste versie.xlsx` (or set `CYCLUS_XLSX`).

## Deploying

`pnpm build` and upload the contents of `dist/` to any static host (or use `pnpm run deploy`). The bundle uses relative paths, so it can
live in a subdirectory. It must be served over **HTTPS** for the PWA (install + offline) to work.

### iOS

Works in Safari (and on iOS 16.4+ also in Chrome/Edge). Differences from Android:

- There is no install prompt; the app shows "Deel → Zet op beginscherm" instructions instead (in the browser only).
- The installed home screen app has **its own storage, separate from Safari**. Install first, then start logging or
  import data. Safari tabs may lose their data after 7 days without use; the installed app is exempt.
- Backups and CSV exports use the share sheet ("Bewaar in Bestanden"), because downloads are unreliable in home screen apps.
- Inputs use a 16px font size, otherwise Safari zooms in on focus.

## How it works

- **Daily log** (`src/views/DayView.tsx`): every tap is saved immediately. Medication is prefilled from the schedule
  in the settings; the state of that day is snapshotted when the day is edited, so later schedule changes don't rewrite history.
- **Cycle and phase** (`src/lib/cycle.ts`): the cycle day counts from the last "Eerste dag menstruatie". The average
  cycle length comes from the last 6 completed cycles (or the default from the settings). Ovulation is estimated at
  `cycle length - luteal phase (14)`; for completed cycles the actual length is used.
- **Storage** (`src/lib/db.ts`): IndexedDB, with a request for persistent storage. Backups (JSON) and a CSV export
  are in the settings. The app reminds you to make a backup every 14 days.
