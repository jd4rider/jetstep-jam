import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, TUNING, VERSION } from './config'
import { audio } from './core/audio'
import { AchievementsScene } from './scenes/AchievementsScene'
import { BootScene } from './scenes/BootScene'
import { BossScene } from './scenes/BossScene'
import { CustomizeScene } from './scenes/CustomizeScene'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'
import { ModeScene } from './scenes/ModeScene'
import { ResultsScene } from './scenes/ResultsScene'
import { SettingsScene } from './scenes/SettingsScene'
import { UniverseScene } from './scenes/UniverseScene'
import { WorldScene } from './scenes/WorldScene'

declare global {
  interface Window {
    __JETSTEP__?: {
      game: Phaser.Game
      active: () => string | null
      state: () => unknown
      launch: (levelId: string, mode?: string) => void
      launchBoss: (bossIndex: number, rush?: boolean) => void
      collectRequired: () => void
      teleportToExit: () => void
      motionSample: () => Array<{ x: number; y: number; axis: string; style: string }>
      teleportToLift: () => boolean
      finish: () => void
      damage: () => void
      hitBoss: () => void
      defeatBoss: () => void
    }
  }
}

// Fill the width whenever covering it costs at most a sliver of height. Tall
// phones crop the outer margin; phones whose browser chrome makes the viewport
// slightly wider than 9:16 crop under 6% of height, which stays inside the UI
// inset. Tablets and desktop keep the whole stage with FIT.
const widthCoverCrop = (): number => {
  const canvasHeight = (window.innerWidth * GAME_HEIGHT) / GAME_WIDTH
  return (canvasHeight - window.innerHeight) / Math.max(1, window.innerHeight)
}
const scaleModeForViewport = (): Phaser.Scale.ScaleModeType =>
  widthCoverCrop() <= 0.06 ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT
const scaleMode = scaleModeForViewport()

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0718',
  scale: {
    mode: scaleMode,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  render: {
    antialias: true,
    roundPixels: false,
    pixelArt: false,
    powerPreference: 'high-performance',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: TUNING.gravity },
      debug: false,
      fps: 60,
      fixedStep: true,
    },
  },
  input: {
    activePointers: 5,
    gamepad: true,
  },
  fps: { target: 60, smoothStep: false },
  scene: [
    BootScene, MenuScene, UniverseScene, WorldScene, ModeScene, GameScene,
    BossScene, ResultsScene, CustomizeScene, AchievementsScene, SettingsScene,
  ],
}

const game = new Phaser.Game(config)

function activeScene(): Phaser.Scene | null {
  return game.scene.getScenes(true)[0] ?? null
}

function activeKey(): string | null {
  return activeScene()?.scene.key ?? null
}

function sceneState(): unknown {
  const scene = activeScene()
  if (!scene) return null
  if (scene instanceof GameScene || scene instanceof BossScene) return scene.testState()
  return { scene: scene.scene.key }
}

function launch(levelId: string, mode = 'campaign'): void {
  game.scene.getScenes(true).forEach((scene) => game.scene.stop(scene.scene.key))
  game.scene.start('Game', { levelId, mode })
}

function launchBoss(bossIndex: number, rush = false): void {
  game.scene.getScenes(true).forEach((scene) => game.scene.stop(scene.scene.key))
  game.scene.start('Boss', {
    bossIndex,
    mode: rush ? 'bossrush' : 'campaign',
    rush,
    rushList: [bossIndex],
    rushStep: 0,
    rushStartedAt: performance.now(),
  })
}

window.__JETSTEP__ = {
  game,
  active: activeKey,
  state: sceneState,
  launch,
  launchBoss,
  collectRequired: () => {
    const scene = activeScene()
    if (scene instanceof GameScene) scene.debugCollectRequired()
  },
  teleportToExit: () => {
    const scene = activeScene()
    if (scene instanceof GameScene) scene.debugTeleportToExit()
  },
  motionSample: () => {
    const scene = activeScene()
    return scene instanceof GameScene ? scene.debugMotionSample() : []
  },
  teleportToLift: () => {
    const scene = activeScene()
    return scene instanceof GameScene ? scene.debugTeleportToLift() : false
  },
  finish: () => {
    const scene = activeScene()
    if (scene instanceof GameScene) scene.debugFinish()
  },
  damage: () => {
    const scene = activeScene()
    if (scene instanceof GameScene) scene.debugDamage()
  },
  hitBoss: () => {
    const scene = activeScene()
    if (scene instanceof BossScene) scene.debugHitBoss()
  },
  defeatBoss: () => {
    const scene = activeScene()
    if (scene instanceof BossScene) scene.debugDefeatBoss()
  },
}

document.documentElement.dataset.game = 'jetstep-jam'
document.documentElement.dataset.version = VERSION
document.body.dataset.jetstep = 'ready'

document.addEventListener('pointerdown', () => audio.unlock(), { once: true, capture: true })
document.addEventListener('keydown', () => audio.unlock(), { once: true, capture: true })
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') audio.suspend()
  else audio.resume()
})

const preventCanvasScroll = (event: TouchEvent): void => {
  if (event.touches.length > 1) return
  const target = event.target as HTMLElement | null
  if (target?.tagName === 'CANVAS') event.preventDefault()
}
document.addEventListener('touchmove', preventCanvasScroll, { passive: false })

let activeScaleMode = scaleMode
window.addEventListener('resize', () => {
  const next = scaleModeForViewport()
  if (next !== activeScaleMode) {
    activeScaleMode = next
    game.scale.scaleMode = next
  }
  game.scale.refresh()
})
window.addEventListener('load', () => game.scale.refresh())
window.setTimeout(() => game.scale.refresh(), 120)

window.addEventListener('error', (event) => {
  if (!event.error) document.getElementById('boot-fail')?.classList.add('visible')
})
window.addEventListener('unhandledrejection', () => {
  document.getElementById('boot-fail')?.classList.add('visible')
})

void GAME_HEIGHT
