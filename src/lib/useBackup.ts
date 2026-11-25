import { useCallback } from 'react'
import { createBackup, saveFile } from './backup'
import { today } from './date'
import { useStore } from './store'

export const BACKUP_REMINDER_DAYS = 14

export function useBackup() {
  const { entries, settings, updateSettings } = useStore()

  const makeBackup = useCallback(async () => {
    const saved = await saveFile(createBackup(entries, settings), `eb-en-vloed-backup-${today()}.json`)
    if (saved) updateSettings((s) => ({ ...s, lastBackupAt: Date.now() }))
  }, [entries, settings, updateSettings])

  const daysSinceBackup = settings.lastBackupAt ? Math.floor((Date.now() - settings.lastBackupAt) / 86_400_000) : undefined
  const backupDue = entries.size >= 7 && (daysSinceBackup === undefined || daysSinceBackup >= BACKUP_REMINDER_DAYS)

  return { makeBackup, daysSinceBackup, backupDue }
}
