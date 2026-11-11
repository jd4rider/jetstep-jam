import Phaser from 'phaser'
import { audio } from '../core/audio'
import { hashString } from '../core/rng'
import { loadSave, recordLevelResult, recordRunFailure } from '../core/save'
import { reconcileProgress } from '../core/progress'
import { ALL_LEVELS, dailyDate, dailyMeta, getLevelMeta, nextLevelId } from '../data/levels'
import { generateLevel } from '../generator/level'
import { BOOT_BY_ID } from '../data/cosmetics'
import { POWER_BY_ID } from '../data/powerups'
import { worldAt } from '../data/worlds'
import {
  CAMERA, GAME_HEIGHT, GAME_WIDTH, PLAYER, TUNING,
} from '../config'
import type {
  LevelData, LevelResult, PlayMode, PlayerInput, PowerModifiers, PowerUpDefinition, ResultsData,
} from '../types'
import { powerMultipliers, scoreForSpark, starsFor } from '../player/movement'
import { Player } from '../player/Player'
import { PipView } from '../player/PipView'
import { Backdrop } from '../world/Backdrop'
import { LevelView } from '../world/LevelView'
import { HazardSystem } from '../world/Hazards'
import { EnemySystem } from '../world/Enemies'
import { Hud } from '../ui/Hud'
import { TouchControls, isTouchDevice } from '../ui/TouchControls'
import { formatScore, panel, UiButton } from '../ui/common'

interface GameData {
  levelId?: string
  mode?: PlayMode
  stage?: number
  runScore?: number
  runHealth?: number
  runStage?: number
  runDeaths?: number
  dailyDate?: string
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
  duck: Phaser.Input.Keyboard.Key
  interact: Phaser.Input.Keyboard.Key
  escape: Phaser.Input.Keyboard.Key
  restart: Phaser.Input.Keyboard.Key
}

interface ActivePower {
  def: PowerUpDefinition
  endsAt: number
}

export class GameScene extends Phaser.Scene {
  private sceneData: GameData = {}
  private level!: LevelData
  private mode: PlayMode = 'campaign'
  private worldIndex = 0
  private levelId = 'w1-1'
  private displayName = ''
  private player!: Player
  private playerView!: PipView
  private levelView!: LevelView
  private hazards!: HazardSystem
  private enemies!: EnemySystem
  private backdrop!: Backdrop
  private hud!: Hud
  private touch!: TouchControls
  private keys!: Keys
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private stage = 0
  private runStage = 0
  private runScore = 0
  private score = 0
  private health: number = PLAYER.maxHealth
  private deaths = 0
  private maxHealth: number = PLAYER.maxHealth
  private sparksCollected = 0
  private optionalCollected = 0
  private requiredTotal = 0
  private optionalTotal = 0
  private combo = 0
  private bestCombo = 0
  private lastFeet = 0
  private comboTimer = 0
  private airRun = 0
  private bestAirRun = 0
  private exitReady = false
  private portalReady = false
  private paused = false
  private finishing = false
  private knockedOut = false
  private damageTaken = false
  private checkpoint = { x: 0, y: 0 }
  private startedAt = 0
  private activePowers: ActivePower[] = []
  private powerHistory: string[] = []
  private modsNow!: PowerModifiers
  private pauseLayer?: Phaser.GameObjects.Container
  private jetPuffAt = 0
  private padPauseDown = false
  private dailyDate = ''
  private lastSafe = { x: 0, y: 0 }
  private runHealth = 3
  private runDeaths = 0

  constructor() {
    super('Game')
  }

  init(data: GameData): void {
    this.sceneData = { ...data }
    this.mode = data.mode ?? 'campaign'
    this.levelId = data.levelId ?? 'w1-1'
    this.stage = data.stage ?? 0
    this.runStage = data.runStage ?? 0
    this.runScore = data.runScore ?? 0
    this.runHealth = data.runHealth ?? 3
    this.runDeaths = data.runDeaths ?? 0
    this.dailyDate = data.dailyDate ?? dailyDate()
  }

  create(): void {
    const meta = getLevelMeta(this.levelId)
    if (!meta) {
      this.scene.start('Menu')
      return
    }
    this.worldIndex = meta.worldIndex
    if (meta.boss && this.mode === 'campaign') {
      this.scene.start('Boss', { bossIndex: meta.worldIndex, mode: 'campaign' })
      return
    }
    const save = loadSave()
    const world = worldAt(meta.worldIndex)
    this.displayName = this.mode === 'endless' ? `Descent ${this.stage + 1}` : meta.name
    this.level = generateLevel(meta, {
      mode: this.mode,
      zen: this.mode === 'zen',
      stage: this.mode === 'endless' ? this.stage : undefined,
      seedSalt: this.mode === 'daily' ? hashString(this.dailyDate) : this.stage ? hashString(`${this.levelId}:${this.stage}`) : undefined,
    })
    if (this.mode === 'endless') this.level.name = this.displayName
    this.requiredTotal = this.mode === 'time' || this.mode === 'endless' ? 0 : this.level.requiredSparks
    this.optionalTotal = this.level.optionalSparks.length
    this.portalReady = this.mode === 'time' || this.mode === 'endless'
    this.exitReady = this.portalReady
    this.score = this.runScore
    this.health = this.mode === 'classic' || this.mode === 'endless' ? Phaser.Math.Clamp(this.runHealth, 1, 3) : PLAYER.maxHealth
    this.deaths = this.runDeaths
    this.damageTaken = false
    this.sparksCollected = 0
    this.optionalCollected = 0
    this.combo = 0
    this.bestCombo = 0
    this.airRun = 0
    this.bestAirRun = 0
    this.finishing = false
    this.knockedOut = false
    this.paused = false
    this.activePowers = []
    this.powerHistory = []
    this.startedAt = performance.now()

    this.cameras.main.setBackgroundColor(world.palette.skyTop)
    this.physics.world.setBounds(0, 0, this.level.width, this.level.height + 220)
    this.physics.world.gravity.y = TUNING.gravity * this.level.gravityScale
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height)
    this.cameras.main.fadeIn(save.settings.reducedMotion ? 0 : 260, 0, 0, 0)

    this.backdrop = new Backdrop(this, this.worldIndex, save.settings.reducedMotion)
    this.levelView = new LevelView(this, this.level, save.settings)
    this.player = new Player(this, this.level.start.x, this.level.start.y)
    this.player.setHealth(this.health)
    this.lastFeet = this.player.body.bottom
    this.playerView = new PipView(this, save.cosmetics, 20)
    this.hazards = new HazardSystem(this, this.level)
    this.enemies = new EnemySystem(this, this.level)
    this.checkpoint = { x: this.level.start.x, y: this.level.start.y }
    this.lastSafe = { ...this.checkpoint }
    this.levelView.setExitReady(this.exitReady)

    this.hud = new Hud(this, () => this.togglePause(), save.settings.reducedFlash)
    this.touch = new TouchControls(this, save.settings)
    this.touch.setVisible(isTouchDevice())
    this.setupInput(save)
    this.setupCollisions()
    this.updateCamera(16, true)
    this.levelView.setExitReady(this.exitReady)
    this.player.setMods(powerMultipliers([]))
    this.modsNow = powerMultipliers([])
    audio.setMood('level', world)
    audio.setIntensity(0.2)
    this.cameras.main.flash(120, 0, 0, 0, false)
    document.body.dataset.jetstepLevel = this.levelId
  }

  private setupInput(save: ReturnType<typeof loadSave>): void {
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
      duck: Phaser.Input.Keyboard.KeyCodes.DOWN,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
    }) as unknown as Keys
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
    ])
    audio.setSettings(save.settings)
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player.hitbox, this.levelView.solids)
    this.physics.add.collider(this.player.hitbox, this.levelView.movingGroup)
    this.physics.add.collider(this.player.hitbox, this.levelView.oneWays, undefined, (_playerObject, platform) => {
      const body = this.player.body
      const platformBody = (platform as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody
      // Compare where the feet were before this step. A fast fall can already
      // be more than 10 units into the platform when the check runs, and a
      // current-position test then drops the player straight through.
      const previousFeet = body.prev.y + body.height
      return body.velocity.y >= 0 && previousFeet <= platformBody.top + 2
    })
    this.physics.add.overlap(this.player.hitbox, this.levelView.sparks, (_p, spark) => this.collectSpark(spark as Phaser.Physics.Arcade.Image, false))
    this.physics.add.overlap(this.player.hitbox, this.levelView.optionalSparks, (_p, spark) => this.collectSpark(spark as Phaser.Physics.Arcade.Image, true))
    this.physics.add.overlap(this.player.hitbox, this.levelView.energy, (_p, cell) => this.collectEnergy(cell as Phaser.Physics.Arcade.Image))
    this.physics.add.overlap(this.player.hitbox, this.levelView.powerups, (_p, orb) => this.collectPower(orb as Phaser.Physics.Arcade.Image))
    this.physics.add.overlap(this.player.hitbox, this.levelView.switches, (_p, zone) => this.touchSwitch(zone as Phaser.GameObjects.GameObject))
    this.physics.add.overlap(this.player.hitbox, this.levelView.checkpoints, (_p, zone) => this.touchCheckpoint(zone as Phaser.GameObjects.GameObject))
    this.physics.add.overlap(this.player.hitbox, this.levelView.exitZone, () => this.touchExit())
    this.physics.add.overlap(this.player.hitbox, this.hazards.group, (_p, zone) => this.touchHazard(zone as Phaser.GameObjects.Rectangle))
    this.physics.add.overlap(this.player.hitbox, this.enemies.group, (_p, enemy) => this.touchEnemy(enemy as Phaser.Physics.Arcade.Image))
    this.physics.add.overlap(this.player.hitbox, this.enemies.shots, (_p, shot) => this.touchShot(shot as Phaser.Physics.Arcade.Image))
  }

  update(time: number, deltaMs: number): void {
    if (this.finishing) return
    if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      this.togglePause()
      return
    }
    const padPause = Boolean(this.input.gamepad?.getPad(0)?.buttons[9]?.pressed)
    if (padPause && !this.padPauseDown) {
      this.togglePause()
      this.padPauseDown = padPause
      return
    }
    this.padPauseDown = padPause
    if (this.paused) return
    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.restartLevel()
      return
    }
    this.expirePowers()
    const mods = powerMultipliers(this.activePowers.map((power) => ({ effect: power.def.effect })))
    if (this.mode === 'zen') {
      mods.infiniteEnergy = true
      mods.drainMult = 0
    }
    this.modsNow = mods
    this.physics.world.gravity.y = TUNING.gravity * this.level.gravityScale * mods.gravityMult
    this.player.setMods(mods)
    this.levelView.update(
      deltaMs,
      time,
      { x: this.player.body.center.x, y: this.player.body.center.y },
      mods.magnetRange,
      mods.radar,
      mods.freezeMachines,
    )
    if (!this.knockedOut) {
      const input = this.readInput()
      const events = this.player.update(input, deltaMs)
      if (events.jumped) audio.sfx('jump')
      if (events.landed) {
        audio.sfx('land')
        this.burst(this.player.body.center.x, this.player.body.bottom, 0x9bffda, 4, 55)
        if (this.player.onGround) {
          this.airRun = 0
          this.lastSafe = { x: this.player.body.center.x, y: this.player.body.bottom }
        }
      }
      if (events.jetStarted) audio.sfx('jet')
      if (events.jetStopped) audio.sfx('jet-stop')
      if (events.energyEmpty) {
        audio.sfx('empty')
        this.hud.toast('JET ENERGY EMPTY · LAND OR FIND A CELL', 0xff6b7a)
      }
      if (events.slid) audio.sfx('slide')
      if (this.player.jetting && time > this.jetPuffAt) {
        this.jetPuffAt = time + 75
        this.jetPuff()
      }
      if (this.player.onGround) this.airRun = 0
      this.catchFallThrough(this.lastFeet)
    }
    this.lastFeet = this.player.body.bottom

    this.hazards.update(time, deltaMs, mods)
    this.enemies.update(time, deltaMs, { x: this.player.body.center.x, y: this.player.body.center.y }, mods)
    if (this.combo > 0) {
      this.comboTimer -= deltaMs
      if (this.comboTimer <= 0) this.combo = 0
    }
    if (!this.knockedOut && this.player.body.bottom > this.level.height + 60) {
      this.damagePlayer(this.player.body.center.x, this.player.body.bottom, 'fall')
    }
    this.updateCamera(deltaMs, false)
    this.updatePlayerView(deltaMs)
    this.hud.update({
      levelName: this.displayName,
      worldName: worldAt(this.worldIndex).name,
      health: this.health,
      maxHealth: this.maxHealth,
      energy: this.player.energy,
      sparks: this.sparksCollected,
      required: this.requiredTotal,
      optional: this.optionalCollected,
      score: this.score,
      combo: this.combo,
      power: this.activePowers[this.activePowers.length - 1]?.def ?? null,
      objective: this.objective(),
      exitReady: this.exitReady,
    }, deltaMs)
    audio.setIntensity(this.combo / 15 + (1 - this.player.energy / 100) * 0.25)
  }

  /**
   * Arcade physics resolves collisions one step at a time. A fast fall, a thin
   * one-way platform or a carried lift can leave Pip below a surface he was
   * above last frame, which reads as falling straight through the floor. Put
   * him back on top of anything he crossed downwards.
   */
  private catchFallThrough(prevBottom: number): void {
    const body = this.player.body
    if (body.velocity.y <= 0) return
    if (body.bottom <= prevBottom) return
    // A teleport or respawn clears downwards speed; a genuine fall keeps it,
    // even when a long frame moves the player several floors at once.
    if (body.bottom - prevBottom > 150 && body.velocity.y < 200) return
    const platforms = [
      ...this.levelView.solids.getChildren(),
      ...this.levelView.oneWays.getChildren(),
      ...this.levelView.movingGroup.getChildren(),
    ]
    let landing: Phaser.Physics.Arcade.StaticBody | null = null
    for (const child of platforms) {
      const platform = (child as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody
      if (!platform || !platform.enable) continue
      if (body.right <= platform.left || body.left >= platform.right) continue
      if (prevBottom > platform.top + 1 || body.bottom <= platform.top + 1) continue
      // Snap to the highest surface crossed, so a long frame cannot carry the
      // player past an earlier floor.
      if (!landing || platform.top < landing.top) landing = platform
    }
    if (!landing) return
    body.position.y = landing.top - body.height
    body.velocity.y = 0
    body.updateCenter()
    this.player.hitbox.y = landing.top
  }

  private readInput(): PlayerInput {
    const pad = this.input.gamepad?.getPad(0)
    const axis = pad?.axes[0]?.getValue() ?? 0
    const input: PlayerInput = {
      left: this.keys.left.isDown || this.keys.a.isDown || this.cursors.left.isDown || axis < -0.28 || Boolean(pad?.buttons[14]?.pressed),
      right: this.keys.right.isDown || this.keys.d.isDown || this.cursors.right.isDown || axis > 0.28 || Boolean(pad?.buttons[15]?.pressed),
      jet: this.keys.jet.isDown || this.keys.up.isDown || this.keys.w.isDown || this.cursors.up.isDown || Boolean(pad?.buttons[0]?.pressed),
      duck: this.keys.duck.isDown || this.keys.s.isDown || this.cursors.down.isDown || Boolean(pad?.buttons[1]?.pressed),
      interact: this.keys.interact.isDown || Boolean(pad?.buttons[2]?.pressed),
      pause: false,
      restart: false,
    }
    return this.touch.readInto(input)
  }

  private objective(): string {
    if (this.mode === 'time') return 'REACH THE PORTAL · BEAT YOUR BEST TIME'
    if (this.mode === 'endless') return 'DESCEND · COLLECT · SURVIVE THE NEXT STRATUM'
    if (this.mode === 'zen') return 'A QUIET DESCENT · COLLECT EVERY REQUIRED SPARK'
    if (this.exitReady) return 'THE EXIT IS OPEN'
    return `COLLECT ${this.sparksCollected}/${this.requiredTotal} REQUIRED SPARKS`
  }

  private expirePowers(): void {
    const now = this.time.now
    const before = this.activePowers.length
    this.activePowers = this.activePowers.filter((power) => power.def.durationMs <= 0 || power.endsAt > now)
    if (before !== this.activePowers.length) this.hud?.toast('POWER FADED', 0xb79cff)
  }

  private updateCamera(_delta: number, snap: boolean): void {
    const settings = this.modsNow ? loadSave().settings : loadSave().settings
    const body = this.player.body
    const look = body.velocity.y > 100 ? CAMERA.lookAheadDown : -CAMERA.lookAheadUp
    const targetX = Phaser.Math.Clamp(body.center.x + Phaser.Math.Clamp(body.velocity.x * 0.16, -CAMERA.lookAheadX, CAMERA.lookAheadX) - GAME_WIDTH / 2, 0, Math.max(0, this.level.width - GAME_WIDTH))
    const targetY = Phaser.Math.Clamp(body.center.y + look - GAME_HEIGHT * 0.56, 0, Math.max(0, this.level.height - GAME_HEIGHT))
    const camera = this.cameras.main
    if (snap) {
      camera.scrollX = targetX
      camera.scrollY = targetY
      return
    }
    const smoothX = settings.reducedMotion ? 0.26 : CAMERA.lerpX
    const smoothY = settings.reducedMotion ? 0.24 : CAMERA.lerpY
    camera.scrollX = Phaser.Math.Linear(camera.scrollX, targetX, smoothX)
    camera.scrollY = Phaser.Math.Linear(camera.scrollY, targetY, smoothY)
  }

  private updatePlayerView(deltaMs: number): void {
    const save = loadSave()
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
      shield: this.activePowers.some((power) => Boolean(power.def.effect.shield)),
      energyRatio: this.player.energy / 100,
      reducedMotion: save.settings.reducedMotion,
    }, deltaMs)
  }

  private collectSpark(image: Phaser.Physics.Arcade.Image, optional: boolean): void {
    if (!image.active) return
    image.disableBody(true, true)
    const x = image.x
    const y = image.y
    this.combo += 1 + this.modsNow.comboBonus
    this.comboTimer = 3000
    this.bestCombo = Math.max(this.bestCombo, this.combo)
    if (!this.player.onGround) {
      this.airRun += 1
      this.bestAirRun = Math.max(this.bestAirRun, this.airRun)
    }
    const bonus = this.modsNow.sparkBonus
    const value = scoreForSpark(this.combo, this.modsNow.scoreMult) + bonus
    this.score += value
    this.burst(x, y, optional ? 0xb79cff : 0x5cf2d6, optional ? 9 : 6, optional ? 80 : 55)
    this.scorePopup(x, y, `+${value}`)
    if (optional) {
      this.optionalCollected += 1
      audio.sfx('optional')
      this.hud.toast('RESONANCE FOUND · OPTIONAL FRAGMENT', 0xb79cff)
    } else {
      this.sparksCollected += 1
      audio.sfx('spark')
    }
    if (this.mode === 'campaign' || this.mode === 'daily' || this.mode === 'zen' || this.mode === 'classic') {
      if (this.sparksCollected >= this.requiredTotal && !this.portalReady) {
        this.portalReady = true
        this.exitReady = true
        this.levelView.setExitReady(true)
        this.backdrop.pulse(0xffffff, 0.22)
        this.hud.toast('ALL SPARKS COLLECTED · THE EXIT IS SINGING', 0x9bffda)
        audio.sfx('portal')
      }
    }
  }

  private collectEnergy(cell: Phaser.Physics.Arcade.Image): void {
    if (!cell.active) return
    const x = cell.x
    const y = cell.y
    cell.disableBody(true, true)
    this.player.addEnergy(32)
    this.score += 10
    audio.sfx('energy')
    this.burst(x, y, 0x5cf2d6, 4, 45)
    this.hud.toast('JET CELL · +32 ENERGY', 0x5cf2d6)
  }

  private collectPower(orb: Phaser.Physics.Arcade.Image): void {
    if (!orb.active) return
    const id = String(orb.getData('powerId') ?? this.level.powerupId)
    orb.disableBody(true, true)
    const def = POWER_BY_ID.get(id)
    if (!def) return
    this.activatePower(def)
    this.score += 50
    this.burst(orb.x, orb.y, def.color, 12, 90)
    this.scorePopup(orb.x, orb.y, def.name.toUpperCase())
  }

  private activatePower(def: PowerUpDefinition): void {
    audio.sfx('power')
    this.powerHistory.push(def.id)
    this.hud.toast(`${def.glyph} ${def.name.toUpperCase()} · ${def.description}`, def.color)
    if (def.effect.energyRefill) this.player.addEnergy(def.effect.energyRefill)
    if (def.effect.immediate) this.applyImmediate(def)
    if (def.durationMs > 0) {
      this.activePowers = this.activePowers.filter((active) => active.def.id !== def.id)
      this.activePowers.push({ def, endsAt: this.time.now + def.durationMs })
      if (this.activePowers.length > 3) this.activePowers.shift()
    }
  }

  private applyImmediate(def: PowerUpDefinition): void {
    switch (def.effect.immediate) {
      case 'dash':
        this.player.body.velocity.x = this.player.facing * 560
        break
      case 'twin':
        this.player.body.velocity.y = -520
        this.player.jetting = false
        this.player.body.setAllowGravity(true)
        break
      case 'life':
        this.health = Math.min(5, this.health + 1)
        this.player.setHealth(this.health)
        this.maxHealth = Math.max(this.maxHealth, this.health)
        this.hud.toast('EXTRA HEART · THE JOURNEY CONTINUES', 0xff6b9d)
        break
      case 'teleport':
        this.respawnAtCheckpoint(false)
        break
      case 'portal': {
        const platform = this.level.platforms
          .filter((entry) => entry.y < this.player.body.bottom - 50)
          .sort((a, b) => b.y - a.y)[0]
        if (platform) {
          this.player.teleport(Phaser.Math.Clamp(this.player.body.center.x, platform.x + 36, platform.x + platform.width - 36), platform.y - 2)
          this.burst(this.player.body.center.x, this.player.body.bottom, 0x8affc1, 10, 80)
        }
        break
      }
      case 'pulse': {
        const removed = this.enemies.pulse(this.player.body.center.x, this.player.body.center.y, 210)
        removed.forEach((point) => this.burst(point.x, point.y, 0xffe066, 6))
        this.backdrop.pulse(0xffe066, 0.18)
        break
      }
      case 'sonic': {
        const removed = this.enemies.pulse(this.player.body.center.x, this.player.body.center.y, 330)
        removed.forEach((point) => this.burst(point.x, point.y, 0xff8ed6, 7))
        break
      }
    }
    if (def.effect.immediate === 'teleport') this.hud.toast('EMERGENCY TELEPORT · CHECKPOINT', 0xb79cff)
  }

  private touchSwitch(zone: Phaser.GameObjects.GameObject): void {
    const id = zone.getData('switchId') as string | undefined
    if (!id || zone.getData('switched')) return
    zone.setData('switched', true)
    this.levelView.activateSwitch(id)
    this.hazards.disableSwitch(id)
    this.score += 75
    const switchPosition = zone as Phaser.GameObjects.Arc
    this.burst(switchPosition.x, switchPosition.y, 0xffe066, 8, 65)
    audio.sfx('switch')
    this.hud.toast('MACHINERY REROUTED · LINKED HAZARD OFFLINE', 0x9bffda)
    this.cameras.main.flash(100, 255, 230, 120, false)
  }

  private touchCheckpoint(zone: Phaser.GameObjects.GameObject): void {
    const index = Number(zone.getData('checkpointIndex') ?? 0)
    const x = Number(zone.getData('checkpointX') ?? this.level.start.x)
    const y = Number(zone.getData('checkpointY') ?? this.level.start.y)
    if (this.levelView.activatedCheckpointCount > index) return
    this.levelView.activateCheckpoint(index)
    this.checkpoint = { x, y: y - 2 }
    this.score += 25
    audio.sfx('checkpoint')
    this.hud.toast('CHECKPOINT RELAY ONLINE', 0x5cf2d6)
    this.burst(x, y - 35, 0x5cf2d6, 9, 70)
  }

  private touchExit(): void {
    if (!this.exitReady || this.finishing) return
    this.finishRun()
  }

  private touchHazard(zone: Phaser.GameObjects.Rectangle): void {
    if (this.knockedOut) return
    const contact = this.hazards.contactAt(zone)
    if (contact === 'damage') {
      if (this.modsNow.phase || this.modsNow.hazardImmune) return
      this.damagePlayer(zone.x, zone.y, 'hazard')
    } else if (contact === 'wind') {
      this.player.body.velocity.x += this.player.body.center.x < zone.x ? -190 * 0.016 : 190 * 0.016
    } else if (contact === 'water') {
      this.player.body.velocity.y = Math.min(this.player.body.velocity.y, 185)
      this.player.body.velocity.x *= 0.99
    } else if (contact === 'gravity') {
      this.player.body.velocity.x += (zone.x - this.player.body.center.x) * 0.02
    }
  }

  private touchEnemy(enemy: Phaser.Physics.Arcade.Image): void {
    if (this.knockedOut || !enemy.active) return
    const stomping = this.player.body.velocity.y > 85 && this.player.body.bottom < enemy.y + 16
    if (stomping) {
      const result = this.enemies.stomp(enemy)
      if (result.defeated) {
        this.player.body.velocity.y = -430
        this.score += 90
        audio.sfx('hit')
        this.burst(result.x, result.y, 0xff7ec4, 7, 55)
        this.hud.toast(`STOMPED · ${enemy.getData('name') ?? 'MACHINE'}`, 0xffe066)
        return
      }
      if (result.shielded) {
        this.hud.toast('SHIELDED · GET AROUND IT', 0x9beeff)
      }
    }
    this.damagePlayer(enemy.x, enemy.y, 'enemy')
  }

  private touchShot(shot: Phaser.Physics.Arcade.Image): void {
    if (!shot.active) return
    const x = shot.x
    const y = shot.y
    shot.destroy()
    this.burst(x, y, 0xff7ec4, 4, 40)
    this.damagePlayer(x, y, 'enemy')
  }

  private damagePlayer(sourceX: number, sourceY: number, source: 'hazard' | 'enemy' | 'fall'): void {
    if (this.finishing || this.knockedOut || this.mode === 'zen') return
    if (this.player.invulnerable > 0 || this.modsNow.invincible) return
    if (source === 'hazard' && (this.modsNow.phase || this.modsNow.hazardImmune)) return
    const shieldIndex = this.activePowers.findIndex((power) => Boolean(power.def.effect.shield))
    if (shieldIndex >= 0) {
      const shield = this.activePowers.splice(shieldIndex, 1)[0]
      this.player.invulnerable = 900
      this.burst(this.player.body.center.x, this.player.body.center.y, shield.def.color, 12, 95)
      audio.sfx('shield')
      this.hud.toast('SHIELD POPPED · STILL IN ONE PIECE', 0x76e8ff)
      return
    }
    this.health -= 1
    this.player.setHealth(this.health)
    this.damageTaken = true
    this.deaths += 1
    this.combo = 0
    this.player.hurt(sourceX)
    this.player.body.enable = false
    this.knockedOut = true
    this.cameras.main.shake(260, 0.012)
    this.backdrop.pulse(0xff5679, 0.24)
    audio.sfx('death')
    this.hud.toast(source === 'fall' ? 'PIP FELL OUT OF THE MIX' : 'THE MACHINE GOT THE BEAT', 0xff5679)
    this.time.delayedCall(680, () => {
      if (this.health <= 0) this.failRun()
      else this.respawnAtCheckpoint(true)
    })
    void sourceY
  }

  private respawnAtCheckpoint(cost: boolean): void {
    this.knockedOut = false
    this.player.body.enable = true
    this.player.reset(this.checkpoint.x, this.checkpoint.y)
    this.player.setHealth(this.health)
    this.player.invulnerable = TUNING.respawnGraceMs
    this.activePowers = []
    this.enemies.shots.clear(true, true)
    this.finishing = false
    this.cameras.main.flash(180, 255, 255, 255, false)
    this.burst(this.checkpoint.x, this.checkpoint.y, 0x9bffda, 10, 65)
    this.hud.toast(cost ? 'BACK AT THE CHECKPOINT · FULL JET CELL' : 'EMERGENCY TELEPORT · CHECKPOINT', 0x9bffda)
  }

  private finishRun(): void {
    if (this.finishing) return
    this.finishing = true
    this.physics.pause()
    this.player.body.enable = false
    this.touch.setVisible(false)
    this.cameras.main.flash(180, 255, 255, 255, false)
    this.burst(this.level.exit.x, this.level.exit.y, 0xffe066, 22, 120)
    audio.sfx('victory')
    this.time.delayedCall(720, () => this.commitFinish())
  }

  private commitFinish(): void {
    const timeMs = Math.max(1, Math.round(performance.now() - this.startedAt))
    const completionBonus = 500 + Math.max(0, Math.round((90000 - timeMs) / 180))
    this.score += completionBonus
    if (this.mode === 'endless') {
      this.scene.restart({
        ...this.sceneData,
        levelId: this.levelId,
        mode: 'endless',
        stage: this.stage + 1,
        runScore: this.score + 500,
        runHealth: this.health,
        runDeaths: this.deaths,
      })
      return
    }
    if (this.mode === 'classic') {
      if (this.runStage >= 9) {
        this.completeClassic()
        return
      }
      const next = ALL_LEVELS[Math.min(ALL_LEVELS.length - 1, this.runStage + 1)]
      this.scene.restart({
        levelId: next.id,
        mode: 'classic',
        runStage: this.runStage + 1,
        runScore: this.score,
        runHealth: this.health,
        runDeaths: this.deaths,
      })
      return
    }
    this.completeStandard(timeMs)
  }

  private completeStandard(timeMs: number): void {
    const optionalComplete = this.optionalTotal > 0 && this.optionalCollected >= this.optionalTotal
    const stars = starsFor({
      completed: true,
      energy: this.player.energy,
      noDamage: !this.damageTaken,
      allOptional: optionalComplete,
    })
    const result = this.makeResult(timeMs, stars)
    const saved = recordLevelResult(result)
    const progress = reconcileProgress()
    const next = nextLevelId(this.levelId)
    const data: ResultsData = {
      success: true,
      mode: this.mode,
      levelId: this.levelId,
      levelName: this.displayName,
      worldIndex: this.worldIndex,
      result,
      nextLevelId: this.mode === 'campaign' ? next : null,
      newAchievements: progress.achievements,
      newOutfits: progress.outfits,
      newBoots: progress.boots,
    }
    void saved
    this.scene.start('Results', data)
  }

  private completeClassic(): void {
    const result: LevelResult = {
      ...this.makeResult(Math.max(1, Math.round(performance.now() - this.startedAt)), 3),
      score: this.score + 2000,
    }
    recordLevelResult(result)
    const progress = reconcileProgress()
    this.scene.start('Results', {
      success: true, mode: 'classic', levelId: this.levelId, levelName: 'CLASSIC ARCADE · TEN STAGES',
      worldIndex: 0, result, nextLevelId: null, newAchievements: progress.achievements,
      newOutfits: progress.outfits, newBoots: progress.boots,
    } satisfies ResultsData)
  }

  private failRun(): void {
    if (this.finishing) return
    this.finishing = true
    this.touch.setVisible(false)
    this.player.body.enable = false
    recordRunFailure(this.mode, this.score, this.deaths)
    const progress = reconcileProgress()
    const result = this.makeResult(Math.max(1, Math.round(performance.now() - this.startedAt)), 0)
    this.time.delayedCall(120, () => {
      this.scene.start('Results', {
        success: false, mode: this.mode, levelId: this.levelId, levelName: this.displayName,
        worldIndex: this.worldIndex, result, nextLevelId: null,
        newAchievements: progress.achievements, newOutfits: progress.outfits, newBoots: progress.boots,
      } satisfies ResultsData)
    })
  }

  private makeResult(timeMs: number, stars: LevelResult['stars']): LevelResult {
    return {
      levelId: this.levelId,
      mode: this.mode,
      score: this.score,
      stars,
      timeMs,
      energy: this.player.energy,
      noDamage: !this.damageTaken,
      optional: this.optionalTotal > 0 && this.optionalCollected >= this.optionalTotal,
      combo: this.bestCombo,
      sparks: this.sparksCollected,
      optionalSparks: this.optionalCollected,
      deaths: this.deaths,
      airSparkRun: this.bestAirRun,
      powerups: this.powerHistory,
      dailyDate: this.dailyDate,
    }
  }

  private togglePause(): void {
    if (this.finishing) return
    if (this.paused) {
      this.paused = false
      this.physics.resume()
      this.pauseLayer?.destroy(true)
      this.pauseLayer = undefined
      this.touch.setVisible(isTouchDevice())
      this.hud.setPauseEnabled(true)
      audio.sfx('back')
      return
    }
    this.paused = true
    this.physics.pause()
    this.touch.setVisible(false)
    this.hud.setPauseEnabled(false)
    audio.sfx('click')
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(3000)
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x070510, 0.8).setInteractive()
    const card = panel(this, 56, 245, GAME_WIDTH - 112, 400, 0x5cf2d6, 0.96, 3001)
    const title = this.add.text(GAME_WIDTH / 2, 286, 'PAUSED', {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '33px', fontStyle: 'bold', color: '#fff4dc',
    }).setOrigin(0.5).setDepth(3002)
    const level = this.add.text(GAME_WIDTH / 2, 326, `${this.displayName} · ${worldAt(this.worldIndex).name}`, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif', fontSize: '11px', color: '#a99fc4',
    }).setOrigin(0.5).setDepth(3002)
    const resume = new UiButton(this, {
      x: GAME_WIDTH / 2, y: 390, width: 330, height: 48, label: 'RESUME', color: 0x5cf2d6,
      onClick: () => this.togglePause(),
    })
    const restart = new UiButton(this, {
      x: GAME_WIDTH / 2, y: 450, width: 330, height: 44, label: 'RESTART LEVEL', color: 0xffe066,
      onClick: () => this.restartLevel(),
    })
    const settings = new UiButton(this, {
      x: GAME_WIDTH / 2, y: 504, width: 330, height: 40, label: 'SETTINGS', color: 0x9beeff,
      onClick: () => {
        this.physics.resume()
        this.scene.start('Settings')
      },
    })
    const quit = new UiButton(this, {
      x: GAME_WIDTH / 2, y: 556, width: 330, height: 40, label: 'ABANDON RUN', color: 0xff7ec4,
      onClick: () => {
        this.physics.resume()
        this.scene.start('Menu')
      },
    })
    layer.add([shade, card, title, level, resume.container, restart.container, settings.container, quit.container])
    this.pauseLayer = layer
  }

  private restartLevel(): void {
    audio.sfx('click')
    this.scene.restart({
      ...this.sceneData,
      levelId: this.levelId,
      mode: this.mode,
      runScore: this.mode === 'campaign' ? 0 : this.runScore,
      runHealth: this.mode === 'campaign' ? 3 : this.health,
      runStage: this.runStage,
      runDeaths: this.deaths,
    })
  }

  private burst(x: number, y: number, color: number, count: number, spread = 65): void {
    for (let index = 0; index < count; index += 1) {
      const image = this.add
        .image(x, y, index % 3 === 0 ? 'spark-4' : 'dust')
        .setTint(color)
        .setDisplaySize(index % 3 === 0 ? 10 : 5, index % 3 === 0 ? 10 : 5)
        .setDepth(30)
        .setBlendMode(Phaser.BlendModes.ADD)
      const angle = (index / count) * Math.PI * 2 + Math.random() * 0.4
      const distance = spread * (0.45 + Math.random() * 0.7)
      this.tweens.add({
        targets: image,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 280 + Math.random() * 220,
        ease: 'Quad.easeOut',
        onComplete: () => image.destroy(),
      })
    }
  }

  private scorePopup(x: number, y: number, text: string): void {
    const label = this.add.text(x, y - 10, text, {
      fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
      fontSize: '11px', fontStyle: 'bold', color: '#ffe066', stroke: '#140e2b', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(40)
    this.tweens.add({
      targets: label, y: y - 42, alpha: 0, duration: 650, ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    })
  }

  private jetPuff(): void {
    if (this.modsNow === undefined) return
    const cosmetic = loadSave().cosmetics
    const exhaust = BOOT_BY_ID.get(cosmetic.boots)?.exhaust ?? 0x5cf2d6
    const x = this.player.body.center.x - this.player.facing * 9
    const y = this.player.body.bottom - 4
    const puff = this.add.image(x, y, 'flame').setDisplaySize(12, 28).setTint(exhaust)
      .setDepth(19).setBlendMode(Phaser.BlendModes.ADD).setRotation(Math.PI + (Math.random() - 0.5) * 0.55)
    this.tweens.add({
      targets: puff, y: y + 20, alpha: 0, scaleX: 0.2, scaleY: 0.5, duration: 230,
      onComplete: () => puff.destroy(),
    })
  }

  /** Read-only state used by the browser smoke test and the tuner. */
  testState(): Record<string, unknown> {
    return {
      levelId: this.levelId,
      levelName: this.displayName,
      mode: this.mode,
      stage: this.stage,
      paused: this.paused,
      finishing: this.finishing,
      knockedOut: this.knockedOut,
      health: this.health,
      energy: Math.round(this.player?.energy ?? 0),
      sparks: this.sparksCollected,
      required: this.requiredTotal,
      optional: this.optionalCollected,
      optionalTotal: this.optionalTotal,
      score: this.score,
      combo: this.combo,
      exitReady: this.exitReady,
      x: Math.round(this.player?.body.center.x ?? 0),
      y: Math.round(this.player?.body.center.y ?? 0),
      onGround: Boolean(this.player?.onGround),
      jetting: Boolean(this.player?.jetting),
      touchVisible: this.touch?.visibleNow ?? false,
      hazards: this.hazards?.instances.length ?? 0,
      enemies: this.enemies?.instances.filter((enemy) => !enemy.defeated).length ?? 0,
      activePowers: this.activePowers.map((power) => power.def.id),
      checkpoint: this.checkpoint,
    }
  }

  debugCollectRequired(): void {
    this.levelView.sparks.getChildren().forEach((child) => {
      const image = child as Phaser.Physics.Arcade.Image
      if (image.active) this.collectSpark(image, false)
    })
  }

  debugTeleportToExit(): void {
    this.player.teleport(this.level.exit.x, this.level.exit.y + 22)
  }

  debugMotionSample(): Array<{ x: number; y: number; axis: string; style: string }> {
    return this.levelView.motionSample()
  }

  debugTeleportToLift(): boolean {
    const lift = this.levelView.boardableLift()
    if (!lift) return false
    // Body.reset centres the hitbox, so this leaves Pip's feet 6 units above
    // the lift surface to drop onto it.
    this.player.teleport(lift.x, lift.top - 34)
    return true
  }

  debugDamage(): void {
    this.damagePlayer(this.player.body.center.x - 20, this.player.body.center.y, 'hazard')
  }

  debugFinish(): void {
    if (!this.exitReady) this.debugCollectRequired()
    this.finishRun()
  }
}
