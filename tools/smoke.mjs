#!/usr/bin/env node
/*
 * Real-browser acceptance test for the production build.
 *
 *   npm run build
 *   npm run preview -- --port 4320
 *   node tools/smoke.mjs http://127.0.0.1:4320/
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://127.0.0.1:4320/'
const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
assert(existsSync(chrome), `Chrome not found at ${chrome}; set CHROME_PATH`)

const browser = process.env.CDP_URL
  ? await chromium.connectOverCDP(process.env.CDP_URL)
  : await chromium.launch({ executablePath: chrome, headless: true })
const existingContext = process.env.CDP_URL ? browser.contexts()[0] : null
const context = existingContext ?? await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
})
const page = await context.newPage()
await page.setViewportSize({ width: 390, height: 844 })
await page.bringToFront()
page.setDefaultTimeout(15000)
const errors = []
const step = (message) => console.log(`[smoke] ${message}`)
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})

const state = () => page.evaluate(() => window.__JETSTEP__?.state())
const active = () => page.evaluate(() => window.__JETSTEP__?.active())
const waitScene = (key) => page.waitForFunction(
  (expected) => window.__JETSTEP__?.active() === expected, key, { timeout: 15000, polling: 100 },
)
const touch = (gameX, gameY, heldMs = 0, pointerId = 7) => page.evaluate(
  ({ gameX: x, gameY: y, heldMs: wait, pointerId: id }) => {
    const canvas = document.querySelector('#game canvas')
    if (!canvas) throw new Error('canvas missing')
    const box = canvas.getBoundingClientRect()
    const clientX = box.left + (x / 540) * box.width
    const clientY = box.top + (y / 960) * box.height
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      pointerId: id, pointerType: 'touch', clientX, clientY, bubbles: true, cancelable: true,
    }))
    if (wait <= 0) {
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, pointerType: 'touch', bubbles: true }))
      return
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, pointerType: 'touch', bubbles: true }))
        resolve()
      }, wait)
    })
  },
  { gameX, gameY, heldMs, pointerId },
)

try {
  step(`opening ${url}`)
  const target = url.includes('?') ? `${url}&touch=1` : `${url}?touch=1`
  await page.goto(target, { waitUntil: 'domcontentloaded' })
  await page.bringToFront()
  await page.waitForFunction(() => Boolean(document.querySelector('#game canvas')), null, { polling: 100 })
  await page.waitForFunction(() => Boolean(window.__JETSTEP__), null, { polling: 100 })
  await page.waitForTimeout(1100)
  assert.equal(await active(), 'Menu', 'game boots into the menu')
  step('menu ready')
  await page.screenshot({ path: '/tmp/jetstep-menu.png' })

  await page.evaluate(() => window.__JETSTEP__.launch('w1-1', 'campaign'))
  await waitScene('Game')
  await page.waitForTimeout(450)
  step('level 1 ready')
  let game = await state()
  assert.equal(game.touchVisible, true, 'touch controls are visible on a touch device')
  assert.equal(game.required > 0, true, 'level has required sparks')

  // The picture must fill the phone screen and sit dead centre.
  const fit = await page.evaluate(() => {
    const canvas = document.querySelector('#game canvas')
    const box = canvas.getBoundingClientRect()
    const host = document.querySelector('#game')
    return {
      left: box.left, right: box.right, top: box.top, bottom: box.bottom,
      width: box.width, height: box.height,
      viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
      hostDisplay: host ? getComputedStyle(host).display : 'missing',
    }
  })
  assert.equal(fit.hostDisplay, 'block', `no double-centring from the host (got ${fit.hostDisplay})`)
  assert(fit.width >= fit.viewportWidth - 1, `canvas covers the viewport width (${fit.width} vs ${fit.viewportWidth})`)
  assert(fit.height >= fit.viewportHeight - 1, `canvas covers the viewport height (${fit.height} vs ${fit.viewportHeight})`)
  assert(Math.abs((fit.left + fit.right) / 2 - fit.viewportWidth / 2) <= 1.5, `canvas centred horizontally (${fit.left}..${fit.right} in ${fit.viewportWidth})`)
  assert(Math.abs((fit.top + fit.bottom) / 2 - fit.viewportHeight / 2) <= 1.5, `canvas centred vertically (${fit.top}..${fit.bottom} in ${fit.viewportHeight})`)
  step(`canvas fills and centres: ${fit.width.toFixed(1)}x${fit.height.toFixed(1)} in ${fit.viewportWidth}x${fit.viewportHeight}`)

  // Lifts must creep between floors, not oscillate several times a second.
  const motion0 = await page.evaluate(() => window.__JETSTEP__.motionSample())
  assert(motion0.some((platform) => platform.style === 'lift'), 'level contains a lift')
  await page.waitForTimeout(700)
  const motion1 = await page.evaluate(() => window.__JETSTEP__.motionSample())
  const travel = motion0.map((platform, index) => Math.hypot(motion1[index].x - platform.x, motion1[index].y - platform.y))
  const maxTravel = Math.max(...travel)
  assert(maxTravel > 0.5, 'moving platforms actually move')
  assert(maxTravel < 130, `lift motion is readable, not frantic (${maxTravel.toFixed(1)} units in 700 ms)`)
  step(`lift motion sane: ${maxTravel.toFixed(1)} units / 700 ms`)

  // Stand on a lift and confirm Pip rides it instead of being flung off.
  assert.equal(await page.evaluate(() => window.__JETSTEP__.teleportToLift()), true, 'debug can place Pip on a lift')
  await page.waitForTimeout(500)
  const riding = await state()
  await page.waitForTimeout(600)
  const stillRiding = await state()
  assert.equal(stillRiding.onGround, true, 'Pip stands on a moving lift')
  assert.equal(stillRiding.health, riding.health, 'riding a lift costs no health')
  assert(Math.abs(stillRiding.y - riding.y) < 120, `Pip travels with the lift (${riding.y} -> ${stillRiding.y})`)
  step(`rode a lift ${riding.y} -> ${stillRiding.y}`)

  // Hold the real right touch control.
  const x0 = game.x
  await touch(205, 838, 420, 11)
  await page.waitForTimeout(120)
  game = await state()
  assert(game.x > x0 + 4, `touch movement changed x from ${x0} to ${game.x}`)
  step(`touch moved Pip ${x0} -> ${game.x}`)

  // Jump / jet using the actual JET touch button, then check energy burns.
  const energy0 = game.energy
  await touch(433, 814, 520, 12)
  await page.waitForTimeout(160)
  game = await state()
  assert(game.energy < energy0, `jet consumed energy (${energy0} -> ${game.energy})`)
  assert.equal(game.paused, false)
  step(`jet burned ${energy0} -> ${game.energy}`)

  // Pause and resume.
  await page.keyboard.press('Escape')
  await page.waitForTimeout(180)
  assert.equal((await state()).paused, true, 'pause overlay opens')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(180)
  assert.equal((await state()).paused, false, 'pause overlay closes')
  step('pause/resume OK')

  // Complete the real objective path through the debug test surface.
  await page.evaluate(() => window.__JETSTEP__.collectRequired())
  await page.waitForTimeout(350)
  game = await state()
  assert.equal(game.sparks, game.required, 'all required sparks collected')
  assert.equal(game.exitReady, true, 'exit portal is lit')
  await page.screenshot({ path: '/tmp/jetstep-game.png' })
  step(`collected ${game.sparks}/${game.required}; exit lit`)
  await page.evaluate(() => window.__JETSTEP__.teleportToExit())
  await waitScene('Results')
  await page.waitForTimeout(900)
  await page.screenshot({ path: '/tmp/jetstep-results.png' })
  step('level results shown')

  const saveAfterLevel = await page.evaluate(() => JSON.parse(localStorage.getItem('jetstep-jam-save-v1') ?? '{}'))
  assert.equal(saveAfterLevel.levels?.['w1-1']?.completed, true, 'campaign clear saved')
  assert(saveAfterLevel.levels['w1-1'].stars >= 1, 'campaign stars saved')
  assert(saveAfterLevel.stats?.sparksCollected > 0, 'spark statistics saved')

  // The next stage is a real, freshly constructed scene.
  await page.evaluate(() => window.__JETSTEP__.launch('w1-2', 'campaign'))
  await waitScene('Game')
  await page.waitForTimeout(450)
  assert.equal((await state()).levelId, 'w1-2')
  step('next level launched')

  // Complete a world boss and save the boss level.
  await page.evaluate(() => window.__JETSTEP__.launchBoss(0, false))
  await waitScene('Boss')
  await page.waitForTimeout(650)
  const boss = await state()
  assert.equal(boss.bossName, 'Cogsy, the Music Box Guardian')
  assert.equal(boss.bossHp, 3)
  await page.screenshot({ path: '/tmp/jetstep-boss.png' })
  step(`boss ready: ${boss.bossName}`)
  await page.evaluate(() => window.__JETSTEP__.defeatBoss())
  await waitScene('Results')
  await page.waitForTimeout(1100)
  await page.screenshot({ path: '/tmp/jetstep-boss-results.png' })
  step('boss results shown')

  const saveAfterBoss = await page.evaluate(() => JSON.parse(localStorage.getItem('jetstep-jam-save-v1') ?? '{}'))
  assert.equal(saveAfterBoss.levels?.['w1-50']?.completed, true, 'boss clear saved')
  assert(saveAfterBoss.stats?.bossesDefeated >= 1, 'boss statistic saved')

  assert.deepEqual(errors, [], `browser errors: ${errors.join('\n')}`)
  step('all assertions passed')
  console.log(JSON.stringify({
    ok: true,
    viewport: '390x844 touch',
    canvas: {
      width: Math.round(fit.width), height: Math.round(fit.height),
      viewport: `${fit.viewportWidth}x${fit.viewportHeight}`,
      maxLiftTravelPer700ms: Number(maxTravel.toFixed(1)),
      rodeLiftFromY: riding.y, rodeLiftToY: stillRiding.y,
    },
    level: {
      id: 'w1-1', required: game.required, stars: saveAfterLevel.levels['w1-1'].stars,
      energyAfterJet: game.energy, xMovedTo: game.x,
    },
    boss: {
      name: boss.bossName, hp: boss.bossHp, saved: saveAfterBoss.levels['w1-50'].completed,
      bossesDefeated: saveAfterBoss.stats.bossesDefeated,
    },
    screenshots: ['/tmp/jetstep-menu.png', '/tmp/jetstep-game.png', '/tmp/jetstep-results.png', '/tmp/jetstep-boss.png'],
    consoleErrors: errors,
  }, null, 2))
} catch (error) {
  console.error('[smoke] FAILED', error)
  console.error('[smoke] browser errors', errors)
  await page.screenshot({ path: '/tmp/jetstep-failure.png' }).catch(() => undefined)
  throw error
} finally {
  if (!process.env.CDP_URL) await browser.close()
}
