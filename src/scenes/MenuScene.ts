import Phaser from 'phaser'
import { audio } from '../core/audio'
import { reconcileProgress } from '../core/progress'
import { loadSave } from '../core/save'
import { completedLevels, firstIncompleteLevel, getLevelMeta, totalStars } from '../data/levels'
import { GAME_HEIGHT, GAME_WIDTH, VERSION } from '../config'
import { PipView } from '../player/PipView'
import { Backdrop } from '../world/Backdrop'
import { addStars, iconButton, UiButton } from '../ui/common'

export class MenuScene extends Phaser.Scene {
  private pip!: PipView
  private clock = 0
  private helpOpen = false
  private helpLayer?: Phaser.GameObjects.Container

  constructor() {
    super('Menu')
  }

  create(): void {
    reconcileProgress()
    audio.setMood('menu')
    new Backdrop(this, 0, loadSave().settings.reducedMotion)
    const save = loadSave()
    const completed = completedLevels(save)
    const next = completed >= 1000 ? 'w1-1' : firstIncompleteLevel(save)
    const nextMeta = getLevelMeta(next)?.name ?? next

    this.add
      .text(GAME_WIDTH / 2, 62, 'LITTLE JOY ARCADE', {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#5cf2d6',
        letterSpacing: 5,
      })
      .setOrigin(0.5)
    const title = this.add
      .text(GAME_WIDTH / 2, 100, 'JETSTEP', {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#fff4dc',
        stroke: '#160f2d',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
    this.add
      .text(GAME_WIDTH / 2, 153, 'JAM!', {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
        fontSize: '63px',
        fontStyle: 'bold',
        color: '#ffe066',
        stroke: '#160f2d',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
    this.add
      .text(GAME_WIDTH / 2, 194, 'Light the boots. Restore the Harmony Engine.', {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
        fontSize: '12px',
        color: 'rgba(255,244,220,0.72)',
      })
      .setOrigin(0.5)

    this.tweens.add({ targets: title, y: 97, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    this.pip = new PipView(this, save.cosmetics, 20)
    this.pip.update({
      x: GAME_WIDTH / 2,
      y: 340,
      velocityX: 0,
      velocityY: 0,
      onGround: false,
      jetting: true,
      ducking: false,
      sliding: false,
      facing: 1,
      invulnerable: false,
      shield: false,
      energyRatio: 0.72,
      reducedMotion: save.settings.reducedMotion,
    }, 16)
    this.add
      .text(GAME_WIDTH / 2, 401, 'PIP // JET-BOOT INVENTOR', {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: 'rgba(255,244,220,0.45)',
        letterSpacing: 2,
      })
      .setOrigin(0.5)

    this.spawnMenuSparks(save.settings.reducedMotion)

    new UiButton(this, {
      x: GAME_WIDTH / 2, y: 486, width: 420, height: 58,
      label: completed >= 1000 ? 'REPLAY THE JOURNEY' : 'CONTINUE JOURNEY',
      sublabel: completed >= 1000 ? 'All 1,000 levels cleared' : `${next.toUpperCase()} · ${nextMeta}`,
      glyph: '▶', color: 0x5cf2d6, align: 'left',
      onClick: () => this.startGame(next),
    }).setDepth(30)
    new UiButton(this, {
      x: GAME_WIDTH / 2, y: 554, width: 420, height: 52,
      label: 'UNIVERSE MAP', sublabel: `${completed}/1,000 levels · ${totalStars(save)} stars`,
      glyph: '✺', color: 0xb79cff, align: 'left',
      onClick: () => this.open('Universe'),
    }).setDepth(30)
    new UiButton(this, {
      x: GAME_WIDTH / 2, y: 614, width: 420, height: 52,
      label: 'ARCADE MODES', sublabel: 'Endless · Classic · Daily · Time · Boss Rush · Zen',
      glyph: '◈', color: 0xff7ec4, align: 'left',
      onClick: () => this.open('Modes'),
    }).setDepth(30)
    new UiButton(this, {
      x: 150, y: 694, width: 180, height: 54, label: 'CUSTOMIZE', small: true,
      glyph: '♢', color: 0xffe066,
      onClick: () => this.open('Customize'),
    }).setDepth(30)
    new UiButton(this, {
      x: 390, y: 694, width: 180, height: 54, label: 'TROPHIES', small: true,
      glyph: '♛', color: 0xffa94d,
      onClick: () => this.open('Achievements'),
    }).setDepth(30)
    new UiButton(this, {
      x: GAME_WIDTH / 2, y: 762, width: 420, height: 44, label: 'SETTINGS', small: true,
      glyph: '⚙', color: 0x9beeff,
      onClick: () => this.open('Settings'),
    }).setDepth(30)

    iconButton(this, 80, 34, '?', () => this.showHelp(), 'How to play').setDepth(40)
    iconButton(this, GAME_WIDTH - 80, 34, '⚙', () => this.open('Settings'), 'Settings').setDepth(40)

    const stars = addStars(this, GAME_WIDTH / 2, 822, Math.min(3, Math.floor(totalStars(save) / 120)), 15, 19)
    stars.setDepth(30)
    this.add
      .text(GAME_WIDTH / 2, 850, `${totalStars(save)} / 3,000 STARS`, {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
        fontSize: '9px', fontStyle: 'bold', color: 'rgba(255,244,220,0.5)', letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(30)
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, `A LITTLE JOY ARCADE GAME  ·  v${VERSION}`, {
        fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
        fontSize: '9px', color: 'rgba(255,244,220,0.38)', letterSpacing: 1.5,
      })
      .setOrigin(0.5)
      .setDepth(30)

    this.input.keyboard?.on('keydown-ENTER', () => this.startGame(next))
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame(next))
    this.input.keyboard?.on('keydown-H', () => this.showHelp())
  }

  private spawnMenuSparks(reduced: boolean): void {
    for (let index = 0; index < 12; index += 1) {
      const spark = this.add
        .image(40 + ((index * 97) % 460), 440 + ((index * 67) % 330), `spark-${index % 5}`)
        .setDisplaySize(14 + (index % 3) * 4, 14 + (index % 3) * 4)
        .setAlpha(0.34)
        .setDepth(5)
      if (!reduced) {
        this.tweens.add({
          targets: spark,
          y: spark.y - 24 - (index % 3) * 9,
          alpha: 0.6,
          duration: 1800 + index * 170,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: index * 110,
        })
      }
    }
  }

  private startGame(levelId: string): void {
    if (this.helpOpen) return
    audio.unlock()
    audio.sfx('click')
    this.scene.start('Game', { levelId, mode: 'campaign' })
  }

  private open(key: string): void {
    if (this.helpOpen) return
    audio.unlock()
    audio.sfx('click')
    this.scene.start(key)
  }

  private showHelp(): void {
    if (this.helpOpen) return
    this.helpOpen = true
    audio.sfx('click')
    const layer = this.add.container(0, 0).setDepth(5000)
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x080611, 0.83).setInteractive()
    const panel = this.add.graphics()
    panel.fillStyle(0x1a1232, 1)
    panel.fillRoundedRect(58, 170, GAME_WIDTH - 116, 570, 22)
    panel.lineStyle(1.5, 0x5cf2d6, 0.55)
    panel.strokeRoundedRect(58, 170, GAME_WIDTH - 116, 570, 22)
    const title = this.add.text(GAME_WIDTH / 2, 206, 'HOW TO JETSTEP', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '21px', fontStyle: 'bold', color: '#fff4dc',
    }).setOrigin(0.5)
    const lines = [
      ['MOVE', 'A / D or ← / →  ·  left and right touch buttons'],
      ['JET / JUMP', 'SPACE, ↑ or JET  ·  tap to jump, hold to thrust'],
      ['DUCK / SLIDE', 'S, ↓ or DUCK  ·  tap while running to slide'],
      ['INTERACT', 'E  ·  switches trigger on contact'],
      ['PAUSE / RESTART', 'ESC pauses  ·  R restarts the expedition'],
      ['OBJECTIVE', 'Collect every required Sound Spark, then reach the exit portal.'],
      ['ENERGY', 'Thrust drains the boots. Land, find cells, or use charging pads.'],
      ['SECRETS', 'Optional resonance fragments sit above the route. Look up.'],
    ]
    layer.add([shade, panel, title])
    lines.forEach(([label, copy], index) => {
      const y = 252 + index * 57
      layer.add(
        this.add.text(84, y, label, {
          fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#5cf2d6',
        }),
      )
      layer.add(
        this.add.text(84, y + 16, copy, {
          fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', color: 'rgba(255,244,220,0.72)',
          wordWrap: { width: 355 },
        }),
      )
    })
    const close = new UiButton(this, {
      x: GAME_WIDTH / 2, y: 702, width: 210, height: 44, label: 'GOT IT', small: true,
      color: 0x5cf2d6, onClick: () => this.hideHelp(),
    })
    layer.add(close.container)
    shade.on('pointerdown', () => this.hideHelp())
    this.helpLayer = layer
  }

  private hideHelp(): void {
    this.helpOpen = false
    this.helpLayer?.destroy(true)
    this.helpLayer = undefined
  }

  update(_time: number, delta: number): void {
    this.clock += delta
    const save = loadSave()
    this.pip.update({
      x: GAME_WIDTH / 2 + Math.sin(this.clock * 0.0008) * 18,
      y: 336 + Math.sin(this.clock * 0.0021) * 7,
      velocityX: Math.sin(this.clock * 0.0012) * 22,
      velocityY: 0,
      onGround: false,
      jetting: true,
      ducking: false,
      sliding: false,
      facing: 1,
      invulnerable: false,
      shield: false,
      energyRatio: 0.72,
      reducedMotion: save.settings.reducedMotion,
    }, delta)
  }
}

