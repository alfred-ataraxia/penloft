// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { installPenInput } from './penInput'
import { PerspectiveCamera, TOUCH } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { setPenPriority } from './orbitDragSwitch'

afterEach(() => { vi.useRealTimers(); document.body.replaceChildren() })

it('disables single-finger orbit during pen contact and restores it after release or cancel', () => {
  const canvas = document.createElement('canvas')
  const controls = new OrbitControls(new PerspectiveCamera(), canvas)
  setPenPriority(controls, true)
  expect(controls.touches.ONE).toBeNull()
  setPenPriority(controls, false)
  expect(controls.touches.ONE).toBe(TOUCH.ROTATE)
  controls.dispose()
})

it('rejects palm events before canvas handlers, including contacts held past the 300ms cooldown', () => {
  vi.useFakeTimers()
  const parent = document.createElement('div')
  const canvas = document.createElement('canvas')
  parent.append(canvas); document.body.append(parent)
  const seen: string[] = []
  const cancel = vi.fn()
  const cleanup = installPenInput(parent, canvas, cancel)
  for (const type of ['pointerdown', 'pointermove', 'pointerup']) {
    canvas.addEventListener(type, (e) => seen.push((e as PointerEvent).pointerType))
  }
  const send = (type: string, pointerType: string, pointerId: number) => {
    const ev = new Event(type, { bubbles: true, cancelable: true })
    Object.assign(ev, { pointerType, pointerId })
    canvas.dispatchEvent(ev)
  }
  send('pointerdown', 'pen', 1)
  send('pointerdown', 'touch', 2)
  send('pointermove', 'touch', 2)
  expect(seen).toEqual(['pen'])
  send('pointerup', 'pen', 1)
  vi.advanceTimersByTime(299)
  send('pointerdown', 'touch', 3)
  expect(seen).toEqual(['pen', 'pen'])
  vi.advanceTimersByTime(1)
  send('pointermove', 'touch', 2)
  send('pointerup', 'touch', 2)
  send('pointerdown', 'touch', 4)
  expect(seen).toEqual(['pen', 'pen', 'touch'])
  send('pointerdown', 'pen', 5)
  send('pointercancel', 'pen', 5)
  expect(cancel).toHaveBeenCalledOnce()
  vi.advanceTimersByTime(300)
  send('pointerdown', 'pen', 6)
  send('lostpointercapture', 'pen', 6)
  expect(cancel).toHaveBeenCalledTimes(2)
  cleanup()
  send('pointerdown', 'touch', 7)
  expect(seen.at(-1)).toBe('touch')
})
