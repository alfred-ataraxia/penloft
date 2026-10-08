export function installPenInput(parent: HTMLElement, canvas: HTMLCanvasElement, cancel: () => void, priority: (active: boolean) => void = () => {}): () => void {
  const pens = new Set<number>()
  const rejected = new Set<number>()
  let blockedUntil = 0
  function capture(ev: PointerEvent): void {
    if (ev.target !== canvas) return
    if (ev.pointerType === 'pen') {
      if (ev.type === 'pointerdown') { pens.add(ev.pointerId); priority(true) }
      if (ev.type === 'pointerup' || ev.type === 'pointercancel' || ev.type === 'lostpointercapture') {
        if (pens.delete(ev.pointerId)) {
          // ponytail: fixed 300ms cooldown; tune on real tablets before making it configurable.
          blockedUntil = Date.now() + 300
          priority(pens.size > 0)
          if (ev.type !== 'pointerup') cancel()
        }
      }
    }
    if (ev.pointerType === 'touch' && (pens.size > 0 || Date.now() < blockedUntil || rejected.has(ev.pointerId))) {
      rejected.add(ev.pointerId)
      ev.preventDefault()
      ev.stopImmediatePropagation()
      if (ev.type === 'pointerup' || ev.type === 'pointercancel') rejected.delete(ev.pointerId)
    }
  }
  function blur(): void {
    if (pens.size === 0) return
    pens.clear()
    priority(false)
    blockedUntil = Date.now() + 300
    cancel()
  }
  const events = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture'] as const
  for (const event of events) parent.addEventListener(event, capture, { capture: true, passive: false })
  window.addEventListener('blur', blur)
  return () => {
    for (const event of events) parent.removeEventListener(event, capture, true)
    window.removeEventListener('blur', blur)
  }
}
