import { useState } from 'react'

export function Keypad({ value, onKey }: { value: string; onKey: (key: string) => void }) {
  const [open, setOpen] = useState(false)
  const buttonStyle = { minWidth: 52, minHeight: 52, padding: 8, border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface-input)', color: 'var(--text-primary)', font: 'inherit', cursor: 'pointer' } as const
  return <section aria-label="Measurement keypad" style={{ position: 'absolute', right: 16, bottom: 16, zIndex: 30, maxWidth: 'calc(100% - 32px)' }}>
    <button type="button" aria-label="Measurements" aria-expanded={open} onClick={() => setOpen(!open)} style={{ ...buttonStyle, width: '100%', fontVariantNumeric: 'tabular-nums' }}>{value || 'Measurements'}</button>
    {open && <div role="group" aria-label="Numeric keys" style={{ marginTop: 8, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(52px, 1fr))', gap: 8, background: 'var(--surface-panel)', border: '1px solid var(--border-hairline)', borderRadius: 12 }}>
      {['7', '8', '9', 'Backspace', '4', '5', '6', 'm', '1', '2', '3', 'mm', '0', '.', '×', 'Enter', 'Cancel'].map(key => <button type="button" key={key} aria-label={key} style={buttonStyle} onClick={() => {
        if (key === 'Cancel') { onKey('Escape'); setOpen(false) }
        else for (const k of key === 'mm' ? ['m', 'm'] : [key === '×' ? ',' : key]) onKey(k)
      }}>{key === 'Backspace' ? '⌫' : key}</button>)}
    </div>}
  </section>
}
