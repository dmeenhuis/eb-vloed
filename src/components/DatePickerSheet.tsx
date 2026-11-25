import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, formatMonthYear } from '../lib/date'
import { useStore } from '../lib/store'
import type { ISODate } from '../lib/types'
import { MonthGrid, monthPrefix, useMonth } from './MonthCalendar'
import { Button, Modal } from './ui'

export function DatePickerSheet({ open, onClose, value, onSelect }: { open: boolean; onClose: () => void; value: ISODate; onSelect: (d: ISODate) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Kies een dag">
      <PickerContent value={value} onSelect={onSelect} />
    </Modal>
  )
}

function PickerContent({ value, onSelect }: { value: ISODate; onSelect: (d: ISODate) => void }) {
  const { today } = useStore()
  const { month, shift } = useMonth(value)
  const atCurrentMonth = monthPrefix(month) >= today.slice(0, 7)
  const navBtn = 'grid size-10 place-items-center rounded-full bg-sunken disabled:opacity-30'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-base font-semibold">{formatMonthYear(new Date(month.y, month.m, 1))}</span>
        <div className="flex gap-1.5">
          <button type="button" className={navBtn} onClick={() => shift(-1)} aria-label="Vorige maand">
            <ChevronLeft size={20} />
          </button>
          <button type="button" className={navBtn} onClick={() => shift(1)} disabled={atCurrentMonth} aria-label="Volgende maand">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <MonthGrid month={month} onShift={(n) => (n < 0 || !atCurrentMonth) && shift(n)} onSelect={onSelect} selected={value} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={() => onSelect(addDays(today, -1))}>Gisteren</Button>
        <Button variant="primary" onClick={() => onSelect(today)}>
          Vandaag
        </Button>
      </div>
    </div>
  )
}
