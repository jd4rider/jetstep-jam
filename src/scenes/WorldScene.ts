import Phaser from 'phaser'
import { audio } from '../core/audio'
import { loadSave } from '../core/save'
import {
  LEVELS_PER_WORLD,
  levelUnlocked,
  levelsForWorld,
  worldCompleted,
  worldStars,
} from '../data/levels'
import { worldAt } from '../data/worlds'
import { CSS, GAME_WIDTH } from '../config'
import { Backdrop } from '../world/Backdrop'
import { backButton, pageTitle, starsLabel, UiButton } from '../ui/common'

interface WorldData {
  worldIndex?: number
  timeAttack?: boolean
  returnTo?: string
  page?: number
}

export class WorldScene extends Phaser.Scene {
  private worldIndex = 0
  private timeAttack = false
  private page = 0
  private returnTo = 'Universe'
  private pageRoot?: Phaser.GameObjects.Container
  private pageText?: Phaser.GameObjects.Text
  private infoText?: Phaser.GameObjects.Text

  constructor() {
    super('World')
  }

  init(data: WorldData): void {
    this.worldIndex = Phaser.Math.Clamp(data.worldIndex ?? 0, 0, 19)
    this.timeAttack = Boolean(data.timeAttack)
    this.page = data.page ?? 0
    this.returnTo = data.returnTo ?? 'Universe'
  }

  create(): void {
    const save = loadSave()
    const world = worldAt(this.worldIndex)
    audio.setMood('menu', world)
    new Backdrop(this, this.worldIndex, save.settings.reducedMotion)
    pageTitle(
      this,
      `WORLD ${String(this.worldIndex + 1).padStart(2, '0')} / 20`,
      world.name,
      this.timeAttack ? 'TIME ATTACK · only unlocked levels can be raced' : world.tagline,
    )
    this.add.text(GAME_WIDTH / 2, 126, world.feature, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', color: CSS.muted,
    }).setOrigin(0.5)
    backButton(this, () => this.goBack(), 910)
    this.pageText = this.add.text(GAME_WIDTH / 2, 650, '', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '10px', fontStyle: 'bold', color: 'rgba(255,244,220,0.65)',
    }).setOrigin(0.5)
    this.infoText = this.add.text(GAME_WIDTH / 2, 688, '', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', color: CSS.cream,
      align: 'center', wordWrap: { width: 440 },
    }).setOrigin(0.5)
    new UiButton(this, {
      x: 144, y: 754, width: 132, height: 38, label: '‹ PREV', small: true,
      color: 0xb79cff, onClick: () => this.turnPage(-1), disabled: this.page === 0,
    })
    new UiButton(this, {
      x: GAME_WIDTH - 144, y: 754, width: 132, height: 38, label: 'NEXT ›', small: true,
      color: 0xb79cff, onClick: () => this.turnPage(1), disabled: this.page === 1,
    })
    this.drawPage()
    void save
  }

  private drawPage(): void {
    this.pageRoot?.destroy(true)
    const save = loadSave()
    const root = this.add.container(0, 0).setDepth(20)
    this.pageRoot = root
    const levels = levelsForWorld(this.worldIndex).slice(this.page * 25, this.page * 25 + 25)
    const points: { x: number; y: number }[] = []
    const path = this.add.graphics().setDepth(15)
    root.add(path)
    levels.forEach((level, index) => {
      const column = index % 5
      const row = Math.floor(index / 5)
      const x = 54 + column * 108
      const y = 180 + row * 88
      points.push({ x, y })
      const unlocked = levelUnlocked(save, level.id)
      const record = save.levels[level.id]
      const world = worldAt(this.worldIndex)
      const accent = Phaser.Display.Color.HexStringToColor(world.palette.accent).color
      const boss = level.boss
      const button = new UiButton(this, {
        x, y, width: 94, height: 70,
        label: boss ? 'BOSS' : String(level.levelNumber).padStart(2, '0'),
        sublabel: record?.completed ? starsLabel(record.stars) : unlocked ? 'READY' : 'LOCKED',
        glyph: boss ? '◆' : undefined,
        color: unlocked ? accent : 0x4f4168,
        small: true,
        disabled: !unlocked,
        onClick: () => this.startLevel(level.id),
      })
      button.setDepth(20)
      button.container.setAlpha(unlocked ? 1 : 0.36)
      root.add(button.container)
    })
    if (points.length > 1) {
      path.lineStyle(2, 0x5cf2d6, 0.26)
      path.beginPath()
      path.moveTo(points[0].x, points[0].y)
      for (let index = 1; index < points.length; index += 1) {
        const prev = points[index - 1]
        const current = points[index]
        path.lineTo(prev.x, prev.y + 35)
        path.lineTo(current.x, current.y - 35)
      }
      path.strokePath()
    }
    const world = worldAt(this.worldIndex)
    this.pageText?.setText(`PAGE ${this.page + 1} / 2 · LEVELS ${this.page * 25 + 1}–${this.page * 25 + 25}`)
    this.infoText?.setText(
      this.page === 1
        ? `Level 50: ${world.boss.name}\n${world.boss.title}`
        : `${worldCompleted(save, this.worldIndex)}/50 cleared · ${worldStars(save, this.worldIndex)}/150 stars\nCollect every required spark, then find the portal.`,
    )
    void LEVELS_PER_WORLD
  }

  private turnPage(direction: number): void {
    const next = Phaser.Math.Clamp(this.page + direction, 0, 1)
    if (next === this.page) return
    audio.sfx(direction < 0 ? 'back' : 'click')
    this.page = next
    this.drawPage()
  }

  private startLevel(levelId: string): void {
    audio.sfx('click')
    this.scene.start('Game', {
      levelId,
      mode: this.timeAttack ? 'time' : 'campaign',
    })
  }

  private goBack(): void {
    audio.sfx('back')
    this.scene.start('Universe', { page: Math.floor(this.worldIndex / 5), timeAttack: this.timeAttack, returnTo: this.returnTo })
  }
}
