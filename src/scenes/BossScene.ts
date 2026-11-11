import Phaser from 'phaser'
import { audio } from '../core/audio'
import { loadSave, recordLevelResult, recordRunFailure } from '../core/save'
import { reconcileProgress } from '../core/progress'
import { getLevelMeta, nextLevelId } from '../data/levels'
import { worldAt } from '../data/worlds'
import { GAME_HEIGHT, GAME_WIDTH, PLAYER, TUNING } from '../config'
import type { BossPattern, LevelResult, PlayMode, PlayerInput, ResultsData } from '../types'
import { powerMultipliers } from '../player/movement'
import { Player } from '../player/Player'
import { PipView } from '../player/PipView'
import { Backdrop } from '../world/Backdrop'
import { ensureBossTexture, ensureCoreTextures, ensurePipTextures } from '../world/textures'
import { Hud } from '../ui/Hud'
import { TouchControls, isTouchDevice } from '../ui/TouchControls'
import { panel, UiButton } from '../ui/common'

interface BossData {
  bossIndex?: number
  mode?: PlayMode
  rush?: boolean
  rushList?: number[]
  rushStep?: number
  rushStartedAt?: number
  rushScore?: number
  rushDeaths?: number
}

interface Keys {
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
  a: Phaser.Input.Keyboard.Key
  d: Phaser.Input.Keyboard.Key
  w: Phaser.Input.Keyboard.Key
  s: Phaser.Input.Keyboard.Key
  jet: Phaser.Input.Keyboard.Key
  escape: Phaser.Input.Keyboard.Key
  restart: Phaser.Input.Keyboard.Key
}

export class BossScene extends Phaser.Scene {
  private bossData: BossData = {}
  private bossIndex = 0
  private player!: Player
  private playerView!: PipView
  private boss!: Phaser.Physics.Arcade.Image
  private bossView!: Phaser.Physics.Arcade.Image
  private arenaGroup!: Phaser.Physics.Arcade.StaticGroup
  private weakPoint!: Phaser.Physics.Arcade.Image
  private hud!: Hud
  private touch!: TouchControls
  private keys!: Keys
  private attacks!: Phaser.Physics.Arcade.Group
  private energy!: Phaser.Physics.Arcade.Group
  private health = PLAYER.maxHealth
  private bossHp = 3
  private score = 0
  private hits = 0
  private failed = false
  private finished = false
  private paused = false
  private weakActive = false
  private weakUntil = 0
  private nextWeakAt = 0
  private attackAt = 0
  private patternIndex = 0
  private startedAt = performance.now()
  private rushStartedAt = 0
  private deaths = 0
  private damageTaken = false
  private pauseLayer?: Phaser.GameObjects.Container
  private bossBaseY = 218
  private charging = false
  private bossDefeated = false
  private orbitAngle = 0
  private lastShotAt = 0

  constructor() {
    super('Boss')
  }

  init(data: BossData): void {
    this.bossData = { ...data }
    this.bossIndex = Phaser.Math.Clamp(data.bossIndex ?? 0, 0, 19)
    this.rushStartedAt = data.rushStartedAt ?? performance.now()
    this.score = data.rushScore ?? 0
    this.health = PLAYER.maxHealth
    this.bossHp = 3
    this.hits = 0
    this.failed = false
    this.finished = false
    this.paused = false
    this.weakActive = false
    this.attackAt = 0
    this.patternIndex = 0
    this.startedAt = performance.now()
    this.deaths = data.rushDeaths ?? 0
    this.damageTaken = false
    this.bossDefeated = false
    this.charging = false
    this.orbitAngle = 0
    this.lastShotAt = 0
  }

  create(): void {
    ensureCoreTextures(this)
    ensurePipTextures(this)
    ensureBossTexture(this, this.bossIndex)
    const save = loadSave()
    const world = worldAt(this.bossIndex)
    audio.setMood('boss', world)
    audio.setIntensity(0.8)
    this.cameras.main.setBackgroundColor(world.palette.skyTop)
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT + 200)
    this.physics.world.gravity.y = TUNING.gravity
    this.cameras.main.setBackgroundColor(world.palette.skyTop)
    new Backdrop(this, this.bossIndex, save.settings.reducedMotion)

    this.arenaGroup = this.buildArena()
    this.player = new Player(this, GAME_WIDTH / 2, 790)
    this.player.setHealth(this.health)
    this.physics.add.collider(this.player.hitbox, this.arenaGroup)
    this.playerView = new PipView(this, save.cosmetics, 20)
    this.boss = this.physics.add.image(GAME_WIDTH / 2, this.bossBaseY, `boss-${this.bossIndex}`)
    this.boss.setDisplaySize(190, 190)
    const bossBody = this.boss.body as Phaser.Physics.Arcade.Body
    bossBody.setAllowGravity(false)
    bossBody.setImmovable(true)
    bossBody.setCircle(70, (this.boss.width - 140) / 2, (this.boss.height - 140) / 2)
    this.boss.setDepth(15)
    this.bossView = this.boss
    this.tweens.add({
      targets: this.boss,
      y: this.bossBaseY - 12,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.weakPoint = this.physics.add.image(GAME_WIDTH / 2, 354, 'power-orb')
    this.weakPoint.setDisplaySize(64, 64).setDepth(18).setVisible(false)
    this.weakPoint.setData('weak', true)
    const weakBody = this.weakPoint.body as Phaser.Physics.Arcade.Body
    weakBody.setAllowGravity(false)
    weakBody.setCircle(31)
    weakBody.enable = false

    this.attacks = this.physics.add.group({ allowGravity: false, immovable: true })
    this.energy = this.physics.add.group({ allowGravity: false, immovable: true })
    this.spawnEnergy(GAME_WIDTH / 2, 712)
    this.spawnEnergy(125, 617)

    this.hud = new Hud(this, () => this.togglePause(), save.settings.reducedFlash)
    this.touch = new TouchControls(this, save.settings)
    this.touch.setVisible(isTouchDevice())
    this.setupInput()
    this.setupCollisions()
    this.nextWeakAt = this.time.now + 1800
    this.attackAt = this.time.now + 2200
    this.cameras.main.fadeIn(save.settings.reducedMotion ? 0 : 300, 0, 0, 0)
    this.add.text(GAME_WIDTH / 2, 302, 'DODGE THE PATTERN · TOUCH THE EXPOSED RESONATOR', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '9px', fontStyle: 'bold',
      color: '#fff4dc', backgroundColor: 'rgba(10,7,22,0.7)', padding: { x: 9, y: 4 },
    }).setOrigin(0.5).setDepth(1001)
  }

  private buildArena(): Phaser.Physics.Arcade.StaticGroup {
    const world = worldAt(this.bossIndex)
    const accent = Phaser.Display.Color.HexStringToColor(world.palette.accent).color
    const platform = Phaser.Display.Color.HexStringToColor(world.palette.platform).color
    const groups: Phaser.GameObjects.Rectangle[] = []
    const addPlatform = (x: number, y: number, width: number): void => {
      const g = this.add.graphics().setDepth(5)
      g.fillStyle(0x080611, 0.35)
      g.fillRoundedRect(x - width / 2, y + 6, width, 30, 7)
      g.fillGradientStyle(accent, accent, platform, platform, 1, 1, 1, 1)
      g.fillRoundedRect(x - width / 2, y, width, 30, 7)
      g.lineStyle(1.5, accent, 0.5)
      g.strokeRoundedRect(x - width / 2, y, width, 30, 7)
      const rect = this.add.rectangle(x, y + 15, width, 30, 0xffffff, 0)
      this.physics.add.existing(rect, true)
      groups.push(rect)
    }
    addPlatform(GAME_WIDTH / 2, 820, GAME_WIDTH)
    addPlatform(132, 688, 222)
    addPlatform(408, 570, 222)
    const group = this.physics.add.staticGroup()
    groups.forEach((rect) => group.add(rect))
    const decor = this.add.graphics().setDepth(2)
    decor.lineStyle(2, accent, 0.12)
    decor.strokeCircle(GAME_WIDTH / 2, 240, 180)
    decor.strokeCircle(GAME_WIDTH / 2, 240, 210)
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2
      decor.fillStyle(accent, 0.08)
      decor.fillCircle(GAME_WIDTH / 2 + Math.cos(angle) * 180, 240 + Math.sin(angle) * 180, 4)
    }
    return group
  }

  private spawnEnergy(x: number, y: number): void {
    const cell = this.energy.create(x, y, 'energy-cell') as Phaser.Physics.Arcade.Image
    cell.setDisplaySize(20, 30).setDepth(8).setBlendMode(Phaser.BlendModes.ADD)
    const body = cell.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setSize(22, 32, true)
  }

  private setupInput(): void {
    this.keys = this.input.keyboard?.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      jet: Phaser.Input.Keyboard.KeyCodes.SPACE,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
    }) as unknown as Keys
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.SPACE, Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.D, Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.W,
    ])
  }

  private setupCollisions(): void {
    this.physics.add.overlap(this.player.hitbox, this.weakPoint, () => this.hitBoss())
    this.physics.add.overlap(this.player.hitbox, this.attacks, (_p, attack) => this.touchAttack(attack as Phaser.Physics.Arcade.Image))
    this.physics.add.overlap(this.player.hitbox, this.energy, (_p, cell) => this.collectEnergy(cell as Phaser.Physics.Arcade.Image))
    this.physics.add.overlap(this.player.hitbox, this.boss, () => {
      if (!this.charging) return
      this.damagePlayer(this.boss.x, this.boss.y)
    })
  }

  update(time: number, delta: number): void {
    if (this.finished) return
    if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      this.togglePause()
      return
    }
    if (this.paused) return
    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.scene.restart(this.bossData)
      return
    }
    const mods = powerMultipliers([])
    this.player.setMods(mods)
    this.player.update(this.readInput(), delta)
    if (this.player.body.bottom > GAME_HEIGHT + 80) this.damagePlayer(this.player.body.center.x, this.player.body.bottom)
    this.playerView.update({
      x: this.player.body.center.x,
      y: this.player.body.bottom - 30,
      velocityX: this.player.body.velocity.x,
      velocityY: this.player.body.velocity.y,
      onGround: this.player.onGround,
      jetting: this.player.jetting,
      ducking: this.player.ducking,
      sliding: this.player.sliding,
      facing: this.player.facing,
      invulnerable: this.player.invulnerable > 0,
      shield: false,
      energyRatio: this.player.energy / 100,
      reducedMotion: loadSave().settings.reducedMotion,
    }, delta)
    this.boss.body?.updateFromGameObject()
    this.updateWeakPoint(time)
    this.updateAttacks(time, delta)
    this.updateBossPatterns(time)
    this.energy.getChildren().forEach((child) => {
      const cell = child as Phaser.Physics.Arcade.Image
      cell.rotation = Math.sin(time * 0.002) * 0.2
      cell.y += Math.sin(time * 0.003 + cell.x) * 0.04
      cell.body?.updateFromGameObject()
    })
    this.hud.update({
      levelName: worldAt(this.bossIndex).boss.name,
      worldName: `BOSS ${String(this.bossIndex + 1).padStart(2, '0')} / 20`,
      health: this.health,
      maxHealth: 3,
      energy: this.player.energy,
      sparks: this.hits,
      required: 3,
      optional: 0,
      score: this.score,
      combo: 0,
      power: null,
      objective: this.weakActive ? 'RESONATOR EXPOSED · TOUCH IT NOW' : 'DODGE THE PATTERN · WAIT FOR THE OPENING',
      exitReady: false,
    }, delta)
  }

  private readInput(): PlayerInput {
    const pad = this.input.gamepad?.getPad(0)
    const axis = pad?.axes[0]?.getValue() ?? 0
    return this.touch.readInto({
      left: this.keys.left.isDown || this.keys.a.isDown || axis < -0.28 || Boolean(pad?.buttons[14]?.pressed),
      right: this.keys.right.isDown || this.keys.d.isDown || axis > 0.28 || Boolean(pad?.buttons[15]?.pressed),
      jet: this.keys.jet.isDown || this.keys.up.isDown || this.keys.w.isDown || Boolean(pad?.buttons[0]?.pressed),
      duck: this.keys.down.isDown || this.keys.s.isDown || Boolean(pad?.buttons[1]?.pressed),
      interact: Boolean(pad?.buttons[2]?.pressed),
      pause: false,
      restart: false,
    })
  }

  private updateWeakPoint(time: number): void {
    if (this.bossDefeated) return
    if (!this.weakActive && time >= this.nextWeakAt) {
      this.weakActive = true
      this.weakUntil = time + 2400
      this.weakPoint.setVisible(true).setAlpha(1)
      const body = this.weakPoint.body as Phaser.Physics.Arcade.Body
      body.enable = true
      this.hud.toast('RESONATOR EXPOSED · GET TO THE GLOW', 0xffe066)
      audio.sfx('switch')
    }
    if (this.weakActive) {
      this.weakPoint.setPosition(GAME_WIDTH / 2 + Math.sin(time * 0.0012) * 110, 362 + Math.sin(time * 0.0016) * 24)
      this.weakPoint.setScale(0.8 + Math.sin(time * 0.006) * 0.1)
      this.weakPoint.rotation += 0.02
      if (time > this.weakUntil) {
        this.weakActive = false
        this.weakPoint.setVisible(false)
        const body = this.weakPoint.body as Phaser.Physics.Arcade.Body
        body.enable = false
        this.nextWeakAt = time + 4200
      }
    }
  }

  private updateBossPatterns(time: number): void {
    if (this.bossDefeated) return
    if (time >= this.attackAt) {
      const patterns = worldAt(this.bossIndex).boss.patterns
      const pattern = patterns[this.patternIndex % patterns.length]
      this.patternIndex += 1
      this.firePattern(pattern)
      this.attackAt = time + Math.max(1450, 2450 - this.hits * 280)
    }
  }

  private firePattern(pattern: BossPattern): void {
    audio.sfx('laser')
    switch (pattern) {
      case 'shockwave':
        this.spawnWave(-1)
        this.spawnWave(1)
        break
      case 'laser':
        this.spawnLaser()
        break
      case 'rain':
        for (let index = 0; index < 5; index += 1) this.spawnFalling(GAME_WIDTH / 2 + (index - 2) * 72, -20)
        break
      case 'charge':
        this.chargeBoss()
        break
      case 'orbit':
        for (let index = 0; index < 8; index += 1) this.spawnRadial(index, 8, 175)
        break
      case 'pulse':
        for (let index = 0; index < 12; index += 1) this.spawnRadial(index, 12, 120)
        break
    }
  }

  private spawnWave(direction: -1 | 1): void {
    const wave = this.attacks.create(direction < 0 ? this.boss.x - 60 : this.boss.x + 60, 762, 'power-orb') as Phaser.Physics.Arcade.Image
    wave.setDisplaySize(32, 58).setTint(0xff7ec4).setDepth(12).setAngle(90)
    const body = wave.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setSize(24, 48, true)
    body.setVelocity(direction * 230, 0)
    wave.setData('life', 4200)
  }

  private spawnLaser(): void {
    const x = Phaser.Math.Clamp(this.player.body.center.x, 40, GAME_WIDTH - 40)
    const beam = this.attacks.create(x, 500, 'spark-4') as Phaser.Physics.Arcade.Image
    beam.setDisplaySize(24, 600).setTint(0xff6b7a).setAlpha(0.22).setDepth(12)
    const body = beam.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setSize(18, 600, true)
    body.enable = false
    beam.setData('life', 1500)
    this.tweens.add({ targets: beam, alpha: 0.95, duration: 220 })
    this.time.delayedCall(420, () => {
      if (!beam.active) return
      body.enable = true
      this.cameras.main.shake(120, 0.006)
    })
    this.time.delayedCall(920, () => {
      if (beam.active) body.enable = false
    })
  }

  private spawnFalling(x: number, y: number): void {
    const mine = this.attacks.create(x, y, 'spark-optional') as Phaser.Physics.Arcade.Image
    mine.setDisplaySize(24, 24).setTint(0xffa94d).setDepth(12)
    const body = mine.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setCircle(11)
    body.setVelocity(0, 185)
    mine.setData('life', 5000)
  }

  private spawnRadial(index: number, total: number, speed: number): void {
    const angle = (index / total) * Math.PI * 2
    const orb = this.attacks.create(this.boss.x, this.boss.y, 'power-orb') as Phaser.Physics.Arcade.Image
    orb.setDisplaySize(19, 19).setTint(Phaser.Display.Color.HexStringToColor(worldAt(this.bossIndex).boss.color).color).setDepth(12)
    const body = orb.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setCircle(9)
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
    orb.setData('life', 3200)
  }

  private chargeBoss(): void {
    if (this.charging || this.bossDefeated) return
    this.charging = true
    const originalX = this.boss.x
    const targetX = Phaser.Math.Clamp(this.player.body.center.x, 100, GAME_WIDTH - 100)
    this.tweens.add({
      targets: this.boss,
      x: targetX,
      y: 650,
      duration: 420,
      ease: 'Cubic.easeIn',
      yoyo: true,
      hold: 160,
      onComplete: () => {
        this.boss.x = originalX
        this.boss.y = this.bossBaseY
        this.charging = false
      },
    })
  }

  private updateAttacks(time: number, delta: number): void {
    this.attacks.getChildren().forEach((child) => {
      const attack = child as Phaser.Physics.Arcade.Image
      if (!attack.active) return
      const life = Number(attack.getData('life') ?? 0) - delta
      attack.setData('life', life)
      if (life <= 0 || attack.x < -100 || attack.x > GAME_WIDTH + 100 || attack.y > GAME_HEIGHT + 100) {
        attack.destroy()
        return
      }
      attack.rotation += 0.04
      attack.body?.updateFromGameObject()
    })
    this.orbitAngle = time * 0.001
  }

  private touchAttack(attack: Phaser.Physics.Arcade.Image): void {
    if (!attack.active) return
    attack.destroy()
    this.damagePlayer(attack.x, attack.y)
  }

  private collectEnergy(cell: Phaser.Physics.Arcade.Image): void {
    if (!cell.active) return
    cell.disableBody(true, true)
    this.player.addEnergy(45)
    audio.sfx('energy')
    this.hud.toast('JET CELL · +45 ENERGY', 0x5cf2d6)
    this.burst(cell.x, cell.y, 0x5cf2d6, 5, 45)
  }

  private hitBoss(): void {
    if (!this.weakActive || this.bossHp <= 0 || this.bossDefeated) return
    this.bossHp -= 1
    this.hits += 1
    this.score += 1200
    this.weakActive = false
    const body = this.weakPoint.body as Phaser.Physics.Arcade.Body
    body.enable = false
    this.weakPoint.setVisible(false)
    this.nextWeakAt = this.time.now + 4400
    audio.sfx('boss-hit')
    this.cameras.main.shake(300, 0.014)
    this.burst(this.weakPoint.x, this.weakPoint.y, 0xffe066, 20, 120)
    this.tweens.add({ targets: this.boss, angle: 8, duration: 90, yoyo: true, repeat: 2 })
    if (this.bossHp <= 0) this.defeatBoss()
    else this.hud.toast(`RESONATOR HIT · ${this.bossHp} PHASES LEFT`, 0xffe066)
  }

  private damagePlayer(sourceX: number, sourceY: number): void {
    if (this.finished || this.failed || this.player.invulnerable > 0) return
    this.health -= 1
    this.deaths += 1
    this.damageTaken = true
    this.player.setHealth(this.health)
    this.player.hurt(sourceX)
    audio.sfx('hurt')
    this.cameras.main.shake(220, 0.012)
    void sourceY
    if (this.health <= 0) {
      this.failed = true
      this.finished = true
      this.physics.pause()
      this.touch.setVisible(false)
      const result: LevelResult = {
        levelId: `w${this.bossIndex + 1}-50`, mode: this.bossData.rush ? 'bossrush' : 'campaign',
        score: this.score, stars: 0, timeMs: Math.round(performance.now() - this.startedAt),
        energy: this.player.energy, noDamage: false, optional: false, combo: 0,
        sparks: this.hits, optionalSparks: 0, deaths: this.deaths,
        airSparkRun: 0, powerups: [],
      }
      recordRunFailure(this.bossData.rush ? 'bossrush' : 'campaign', this.score, this.deaths)
      this.time.delayedCall(700, () => {
        this.scene.start('Results', {
          success: false, mode: this.bossData.rush ? 'bossrush' : 'campaign',
          levelId: this.parentLevelId(), levelName: worldAt(this.bossIndex).boss.name,
          worldIndex: this.bossIndex, result,
        } satisfies ResultsData)
      })
    }
  }

  private defeatBoss(): void {
    if (this.bossDefeated) return
    this.bossDefeated = true
    this.finished = true
    this.physics.pause()
    this.touch.setVisible(false)
    this.attacks.clear(true, true)
    audio.sfx('boss-defeat')
    this.burst(this.boss.x, this.boss.y, 0xffe066, 30, 170)
    this.tweens.add({
      targets: [this.boss, this.bossView], alpha: 0, scaleX: 1.4, scaleY: 1.4, angle: 160,
      duration: 900, ease: 'Cubic.easeIn',
    })
    this.cameras.main.flash(400, 255, 255, 255, false)
    this.time.delayedCall(1200, () => this.completeBoss())
  }

  private completeBoss(): void {
    const world = worldAt(this.bossIndex)
    const timeMs = Math.round(performance.now() - this.startedAt)
    const result: LevelResult = {
      levelId: `w${this.bossIndex + 1}-50`, mode: this.bossData.rush ? 'bossrush' : 'campaign',
      score: this.score + 2500, stars: this.damageTaken ? 2 : 3,
      timeMs: Math.round(performance.now() - this.startedAt), energy: this.player.energy,
      noDamage: !this.damageTaken, optional: true, combo: 0, sparks: 3,
      optionalSparks: 0, deaths: this.deaths, airSparkRun: 0, powerups: [],
    }
    if (this.bossData.rush) {
      const list = this.bossData.rushList ?? []
      const next = this.bossData.rushStep !== undefined ? this.bossData.rushStep + 1 : 1
      if (next < list.length) {
        this.scene.restart({
          bossIndex: list[next], mode: 'bossrush', rush: true, rushList: list,
          rushStep: next, rushStartedAt: this.rushStartedAt, rushScore: this.score,
          rushDeaths: this.deaths,
        })
        return
      }
      const rushResult: LevelResult = {
        ...result,
        mode: 'bossrush',
        score: this.score,
        timeMs: Math.round(performance.now() - this.rushStartedAt),
      }
      recordLevelResult(rushResult)
      const progress = reconcileProgress()
      this.scene.start('Results', {
        success: true, mode: 'bossrush', levelId: this.parentLevelId(), levelName: 'BOSS RUSH COMPLETE',
        worldIndex: this.bossIndex, result: rushResult, nextLevelId: null,
        newAchievements: progress.achievements, newOutfits: progress.outfits, newBoots: progress.boots,
        rushComplete: true,
      } satisfies ResultsData)
      return
    }
    recordLevelResult(result)
    const progress = reconcileProgress()
    const nextWorld = this.bossIndex < 19 ? this.bossIndex + 1 : null
    this.scene.start('Results', {
      success: true, mode: 'campaign', levelId: this.parentLevelId(), levelName: world.boss.name,
      worldIndex: this.bossIndex, result,
      nextLevelId: nextLevelId(this.parentLevelId()),
      nextWorldIndex: nextWorld,
      newAchievements: progress.achievements, newOutfits: progress.outfits, newBoots: progress.boots,
      boss: { name: world.boss.name, title: world.boss.title, worldIndex: this.bossIndex },
    } satisfies ResultsData)
    void timeMs
  }

  private parentLevelId(): string {
    return `w${this.bossIndex + 1}-50`
  }

  private togglePause(): void {
    if (this.finished) return
    if (this.paused) {
      this.paused = false
      this.physics.resume()
      this.pauseLayer?.destroy(true)
      this.pauseLayer = undefined
      this.touch.setVisible(isTouchDevice())
      this.hud.setPauseEnabled(true)
      return
    }
    this.paused = true
    this.physics.pause()
    this.touch.setVisible(false)
    this.hud.setPauseEnabled(false)
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(3000)
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x070510, 0.82).setInteractive()
    const card = panel(this, 40, 295, GAME_WIDTH - 80, 300, 0xff7ec4, 0.96, 3001)
    const title = this.add.text(GAME_WIDTH / 2, 334, 'PAUSED', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#fff4dc',
    }).setOrigin(0.5).setDepth(3002)
    const resume = new UiButton(this, {
      x: GAME_WIDTH / 2, y: 416, width: 320, height: 46, label: 'RESUME', color: 0x5cf2d6,
      onClick: () => this.togglePause(),
    })
    const restart = new UiButton(this, {
      x: GAME_WIDTH / 2, y: 475, width: 320, height: 42, label: 'RESTART BOSS', color: 0xffe066,
      onClick: () => this.scene.restart(this.bossData),
    })
    const menu = new UiButton(this, {
      x: GAME_WIDTH / 2, y: 530, width: 320, height: 40, label: 'ABANDON RUN', color: 0xff7ec4,
      onClick: () => { this.physics.resume(); this.scene.start('Menu') },
    })
    layer.add([shade, card, title, resume.container, restart.container, menu.container])
    this.pauseLayer = layer
  }

  private burst(x: number, y: number, color: number, count: number, spread = 70): void {
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + Math.random() * 0.3
      const image = this.add.image(x, y, index % 3 === 0 ? 'spark-4' : 'dust')
        .setTint(color).setDisplaySize(index % 3 === 0 ? 10 : 5, index % 3 === 0 ? 10 : 5)
        .setDepth(30).setBlendMode(Phaser.BlendModes.ADD)
      this.tweens.add({
        targets: image, x: x + Math.cos(angle) * spread * (0.5 + Math.random()), y: y + Math.sin(angle) * spread * (0.5 + Math.random()),
        alpha: 0, duration: 350 + Math.random() * 300, onComplete: () => image.destroy(),
      })
    }
  }

  testState(): Record<string, unknown> {
    return {
      bossIndex: this.bossIndex,
      bossName: worldAt(this.bossIndex).boss.name,
      bossHp: this.bossHp,
      hits: this.hits,
      weakActive: this.weakActive,
      health: this.health,
      score: this.score,
      finished: this.finished,
      failed: this.failed,
      paused: this.paused,
      rush: Boolean(this.bossData.rush),
      x: Math.round(this.player?.body.center.x ?? 0),
      y: Math.round(this.player?.body.center.y ?? 0),
      energy: Math.round(this.player?.energy ?? 0),
      touchVisible: this.touch?.visibleNow ?? false,
    }
  }

  debugHitBoss(): void {
    this.weakActive = true
    this.hitBoss()
  }

  debugDefeatBoss(): void {
    this.bossHp = 1
    this.weakActive = true
    this.hitBoss()
  }
}
