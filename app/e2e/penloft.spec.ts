import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { settleFrame } from './helpers/render'

declare global { interface Window { __hew_test?: import('../src/test/harness').HewTestHarness } }
const shots = process.env.PENLOFT_SHOTS ?? '/home/sefa/Masaüstü/kaizen/raporlar/kalem-cad/shots-app'

async function point(page: Page, world: [number, number, number]) {
  const local = await page.evaluate(w => window.__hew_test!.worldToScreen(w), world)
  const canvas = (await page.locator('canvas').first().boundingBox())!
  return { x: canvas.x + local.x, y: canvas.y + local.y }
}
async function pen(page: Page, type: 'mousePressed' | 'mouseMoved' | 'mouseReleased', p: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchMouseEvent', { type, ...p, pointerType: 'pen', button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 })
  await cdp.detach()
}
async function keys(page: Page, sequence: string[]) {
  if (await page.getByRole('button', { name: 'Measurements', exact: true }).getAttribute('aria-expanded') !== 'true')
    await page.getByRole('button', { name: 'Measurements', exact: true }).tap()
  for (const key of sequence) await page.getByRole('button', { name: key, exact: true }).tap()
}

test('pen rectangle, unit keypad, push/pull, touch navigation, history and STL', async ({ page }, info) => {
  test.setTimeout(90_000)
  mkdirSync(shots, { recursive: true })
  // Exercise Android's real anchor-download path, not a desktop native save dialog.
  await page.addInitScript(() => { delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker })
  await page.goto('/?touch=1')
  await page.waitForFunction(() => window.__hew_test?.isReady(), null, { timeout: 20_000 })
  await page.evaluate(() => window.__hew_test!.setCamera({ position: [8, 6, 8], target: [1, 1.5, 0], up: [0, 0, 1], fovDeg: 45 }))
  await settleFrame(page)
  await page.screenshot({ path: `${shots}/01-empty-tablet.png` })
  const started = Date.now()
  await page.getByRole('button', { name: 'Rectangle', exact: true }).tap()
  const a = await point(page, [0, 0, 0]), b = await point(page, [2, 3, 0])
  await pen(page, 'mousePressed', a)
  await pen(page, 'mouseMoved', b)
  await pen(page, 'mouseReleased', b)
  // A pen drag must complete the rectangle, not leave its preview armed.
  expect(await page.evaluate(() => window.__hew_test!.getSketchIds().length)).toBe(1)
  await keys(page, ['2', 'm', '×', '3', '0', '0', '0', 'mm', 'Enter'])
  const profile = await page.evaluate(() => {
    const h = window.__hew_test!, ids = h.getSketchIds()
    return { count: ids.length, regions: h.getSketchRegionCount(ids[0]), lines: h.getSketchLines(ids[0]) }
  })
  expect(profile.count).toBe(1)
  expect(profile.regions).toBe(1)
  await page.screenshot({ path: `${shots}/02-rectangle-keypad.png` })
  await page.getByRole('button', { name: 'Measurements', exact: true }).tap()
  const rectangleMs = Date.now() - started
  expect(rectangleMs).toBeLessThan(30_000)
  const extrudeStarted = Date.now()
  await page.getByRole('button', { name: 'Push/Pull', exact: true }).tap()
  const center = await point(page, [1, 1.5, 0])
  await pen(page, 'mouseMoved', center)
  await pen(page, 'mousePressed', center)
  await pen(page, 'mouseReleased', center)
  await keys(page, ['2', '.', '7', 'm', 'Enter'])
  const solid = await page.evaluate(() => {
    const h = window.__hew_test!, ids = h.getObjectIds()
    return { count: ids.length, bounds: h.getObjectBounds(ids[0]), hash: h.getStateHash() }
  })
  expect(solid.count).toBe(1)
  const extrusionMs = Date.now() - extrudeStarted
  expect(extrusionMs).toBeLessThan(20_000)
  await page.screenshot({ path: `${shots}/03-solid-keypad.png` })
  await page.getByRole('button', { name: 'Measurements', exact: true }).tap()
  await page.getByRole('button', { name: 'Undo', exact: true }).tap()
  expect(await page.evaluate(() => window.__hew_test!.getObjectCount())).toBe(0)
  await page.getByRole('button', { name: 'Redo', exact: true }).tap()
  expect(await page.evaluate(() => window.__hew_test!.getStateHash())).toBe(solid.hash)
  const exportStarted = Date.now()
  const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
  await page.getByRole('button', { name: 'Export STL', exact: true }).tap()
  const download = await downloadPromise
  await download.saveAs(`${shots}/penloft-2x3x2.7.stl`)
  const stl = readFileSync(`${shots}/penloft-2x3x2.7.stl`)
  const triangleCount = stl.readUInt32LE(80)
  expect(triangleCount).toBeGreaterThan(0)
  expect(stl.length).toBe(84 + 50 * triangleCount)
  const edges = new Map<string, number>()
  const mins = [Infinity, Infinity, Infinity], maxs = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < triangleCount; i++) {
    const vertices: string[] = []
    for (let v = 0; v < 3; v++) {
      const xyz = [0, 1, 2].map(axis => stl.readFloatLE(84 + i * 50 + 12 + v * 12 + axis * 4) / 1000)
      xyz.forEach((x, axis) => { mins[axis] = Math.min(mins[axis], x); maxs[axis] = Math.max(maxs[axis], x) })
      vertices.push(xyz.map(x => x.toFixed(6)).join(','))
    }
    for (let v = 0; v < 3; v++) {
      const key = [vertices[v], vertices[(v + 1) % 3]].sort().join('|')
      edges.set(key, (edges.get(key) ?? 0) + 1)
    }
  }
  expect([...edges.values()].every(n => n === 2)).toBe(true)
  const dimensions = maxs.map((x, axis) => x - mins[axis])
  const expectedDimensions = [2, 3, 2.7]
  dimensions.forEach((x, axis) => expect(Math.abs(x - expectedDimensions[axis])).toBeLessThanOrEqual(0.01))
  const solidChecks = await page.evaluate(() => {
    const h = window.__hew_test!
    return h.getObjectIds().map(id => h.isObjectSolid(id))
  })
  expect(solidChecks).toEqual([true])
  await page.screenshot({ path: `${shots}/05-export.png` })
  const reopened = await page.evaluate(bytes => window.__hew_test!.importStl(bytes, 0.001), [...stl])
  expect(reopened.objects_created).toBe(1)
  expect(reopened.watertight).toBe(1)
  expect(reopened.leaky).toBe(0)
  const exportMs = Date.now() - exportStarted
  expect(exportMs).toBeLessThan(30_000)
  const camBefore = await page.evaluate(() => window.__hew_test!.getCamera())
  const hashBefore = await page.evaluate(() => window.__hew_test!.getStateHash())
  await page.waitForTimeout(310)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 500, y: 420, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 580, y: 460, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await settleFrame(page)
  expect(await page.evaluate(() => window.__hew_test!.getCamera())).not.toEqual(camBefore)
  expect(await page.evaluate(() => window.__hew_test!.getStateHash())).toBe(hashBefore)
  await page.waitForTimeout(500)
  const navigation: Record<string, unknown> = {}
  const beforeTwist = await page.evaluate(() => window.__hew_test!.getCamera())
  const gestureStarted = Date.now()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 450, y: 420, id: 2 }, { x: 650, y: 420, id: 3 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 463.39746, y: 370, id: 2 }, { x: 636.60254, y: 470, id: 3 }] })
  navigation.twistStartMs = Date.now() - gestureStarted
  expect(navigation.twistStartMs as number).toBeLessThan(1000)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(500)
  const afterTwist = await page.evaluate(() => window.__hew_test!.getCamera())
  const heading = (c: typeof beforeTwist) => Math.atan2(c.position[1] - c.target[1], c.position[0] - c.target[0])
  const twistAngle = Math.atan2(Math.sin(heading(afterTwist) - heading(beforeTwist)), Math.cos(heading(afterTwist) - heading(beforeTwist))) * 180 / Math.PI
  navigation.twistDegrees = twistAngle
  expect(Math.abs(Math.abs(twistAngle) - 30)).toBeLessThanOrEqual(5)
  const distance = (c: typeof beforeTwist) => Math.hypot(...c.position.map((x, i) => x - c.target[i]))
  const pinchStarted = Date.now()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 450, y: 420, id: 4 }, { x: 650, y: 420, id: 5 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 400, y: 420, id: 4 }, { x: 700, y: 420, id: 5 }] })
  navigation.pinchStartMs = Date.now() - pinchStarted
  expect(navigation.pinchStartMs as number).toBeLessThan(1000)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(500)
  const afterPinch = await page.evaluate(() => window.__hew_test!.getCamera())
  expect(distance(afterPinch)).toBeLessThan(distance(afterTwist))
  navigation.pinchDistanceRatio = distance(afterPinch) / distance(afterTwist)
  const panStarted = Date.now()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 450, y: 420, id: 6 }, { x: 650, y: 420, id: 7 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 490, y: 450, id: 6 }, { x: 690, y: 450, id: 7 }] })
  navigation.panStartMs = Date.now() - panStarted
  expect(navigation.panStartMs as number).toBeLessThan(1000)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  await page.waitForTimeout(500)
  const afterPan = await page.evaluate(() => window.__hew_test!.getCamera())
  expect(afterPan.target).not.toEqual(afterPinch.target)
  navigation.panTarget = afterPan.target
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 500, y: 420, id: 8 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 520, y: 420, id: 8 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await settleFrame(page)
  expect(await page.evaluate(() => window.__hew_test!.getCamera())).not.toEqual(afterPan)
  expect(await page.evaluate(() => window.__hew_test!.getStateHash())).toBe(hashBefore)
  await cdp.detach()
  await page.screenshot({ path: `${shots}/04-touch-orbit.png` })
  writeFileSync(`${shots}/acceptance.json`, JSON.stringify({ viewport: { width: 1194, height: 834 }, timings: { rectangleMs, extrusionMs, exportMs }, profile, solid, dimensions, triangleCount, manifoldEdges: edges.size, reopened, partialHistory: 'Undo and redo before orbit passed. After orbit, touch tap emits no click; acceptance 7 not passed.', navigation }, null, 2))
  writeFileSync(`${shots}/acceptance-${info.repeatEachIndex}.json`, readFileSync(`${shots}/acceptance.json`))
  await info.attach('acceptance', { path: `${shots}/acceptance.json`, contentType: 'application/json' })
})

// Acceptance 7 failed three diagnostic runs: pointerup reached the Undo button but no click followed.
// Preserve the reproducer; do not count this fixme as a passed acceptance test.
test.fixme('acceptance 7: Undo after native touch orbit', async ({ page }) => {
  await page.goto('/?touch=1')
  await page.waitForFunction(() => window.__hew_test?.isReady())
  await page.evaluate(() => window.__hew_test!.drawBox([0, 0, 0], [2, 3, 0], 2.7))
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 500, y: 420, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 580, y: 460, id: 1 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  await page.getByRole('button', { name: 'Undo', exact: true }).tap()
  await expect.poll(() => page.evaluate(() => window.__hew_test!.getObjectCount())).toBe(0)
})
