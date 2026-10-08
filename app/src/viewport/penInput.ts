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

export function installTouchTwist(parent: HTMLElement, canvas: HTMLCanvasElement, twist: (radians: number) => void): () => void {
  const points = new Map<number, { x: number; y: number }>()
  let previous: number | null = null
  function capture(ev: PointerEvent): void {
    if (ev.target !== canvas || ev.pointerType !== 'touch') return
    if (ev.type === 'pointerup' || ev.type === 'pointercancel') points.delete(ev.pointerId)
    else if (ev.type === 'pointerdown' || points.has(ev.pointerId)) points.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
    if (points.size !== 2) { previous = null; return }
    const [a, b] = [...points.values()]
    const angle = Math.atan2(b.y - a.y, b.x - a.x)
    if (previous !== null && ev.type === 'pointermove') twist(Math.atan2(Math.sin(angle - previous), Math.cos(angle - previous)))
    previous = angle
  }
  function reset(): void { points.clear(); previous = null }
  const events = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const
  for (const event of events) parent.addEventListener(event, capture, true)
  window.addEventListener('blur', reset)
  return () => {
    for (const event of events) parent.removeEventListener(event, capture, true)
    window.removeEventListener('blur', reset)
  }
}
