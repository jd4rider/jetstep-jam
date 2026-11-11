import Phaser from 'phaser'
import { COLORS } from '../config'
import { worldAt } from '../data/worlds'
import type { GameplaySettings, LevelData, MovingPlatformSpec, PlatformSpec } from '../types'

interface MovingPlatform {
  spec: MovingPlatformSpec
  rect: Phaser.GameObjects.Rectangle
  body: Phaser.Physics.Arcade.StaticBody
  visual: Phaser.GameObjects.Graphics
  x: number
  y: number
  deltaX: number
  deltaY: number
}

interface PortalRing {
  ellipse: Phaser.GameObjects.Ellipse
  baseScale: number
}

function colorFrom(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color
}

function lighten(hex: string, amount: number): number {
  const color = Phaser.Display.Color.HexStringToColor(hex)
  return Phaser.Display.Color.GetColor(
    Math.min(255, color.red + amount),
    Math.min(255, color.green + amount),
    Math.min(255, color.blue + amount),
  )
}

export class LevelView {
  readonly level: LevelData
  readonly solids: Phaser.Physics.Arcade.StaticGroup
  readonly oneWays: Phaser.Physics.Arcade.StaticGroup
  readonly movingGroup: Phaser.Physics.Arcade.StaticGroup
  readonly sparks: Phaser.Physics.Arcade.Group
  readonly optionalSparks: Phaser.Physics.Arcade.Group
  readonly energy: Phaser.Physics.Arcade.Group
  readonly powerups: Phaser.Physics.Arcade.Group
  readonly switches: Phaser.Physics.Arcade.StaticGroup
  readonly checkpoints: Phaser.Physics.Arcade.StaticGroup
  exitZone!: Phaser.GameObjects.Rectangle
  readonly worldPalette: ReturnType<typeof worldAt>['palette']
  private readonly scene: Phaser.Scene
  private readonly moving: MovingPlatform[] = []
  private readonly switchVisuals = new Map<string, Phaser.GameObjects.Graphics>()
  private readonly checkpointVisuals: Phaser.GameObjects.Graphics[] = []
  private readonly portalRings: PortalRing[] = []
  private readonly portal: Phaser.GameObjects.Graphics
  private readonly settings: GameplaySettings
  private time = 0
  private movingTime = 0
  private exitReady = false
  private activatedCheckpoints = 0

  constructor(scene: Phaser.Scene, level: LevelData, settings: GameplaySettings) {
    this.scene = scene
    this.level = level
    this.settings = settings
    const world = worldAt(level.worldIndex)
    this.worldPalette = world.palette
    this.solids = scene.physics.add.staticGroup()
    this.oneWays = scene.physics.add.staticGroup()
    this.movingGroup = scene.physics.add.staticGroup()
    this.sparks = scene.physics.add.group({ allowGravity: false, immovable: true })
    this.optionalSparks = scene.physics.add.group({ allowGravity: false, immovable: true })
    this.energy = scene.physics.add.group({ allowGravity: false, immovable: true })
    this.powerups = scene.physics.add.group({ allowGravity: false, immovable: true })
    this.switches = scene.physics.add.staticGroup()
    this.checkpoints = scene.physics.add.staticGroup()

    this.drawPlatforms()
    this.buildMovingPlatforms()
    this.buildPickups()
    this.buildSwitches()
    this.buildCheckpoints()
    this.buildExit()
    this.portal = scene.add.graphics().setDepth(3)
    void this.portal
  }

  private drawPlatforms(): void {
    const graphics = this.scene.add.graphics().setDepth(1)
    this.level.platforms.forEach((platform) => {
      this.drawPlatform(graphics, platform, platform.x + platform.width / 2, platform.y + platform.height / 2)
      const rect = this.scene.add.rectangle(platform.x + platform.width / 2, platform.y + platform.height / 2, platform.width, platform.height, 0xffffff, 0)
      this.scene.physics.add.existing(rect, true)
      rect.setVisible(false)
      if (platform.kind === 'oneway') this.oneWays.add(rect)
      else this.solids.add(rect)
      ;(rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject()
    })
  }

  private drawPlatform(g: Phaser.GameObjects.Graphics, platform: PlatformSpec, cx: number, cy: number): void {
    const palette = this.worldPalette
    const top = colorFrom(palette.platform)
    const light = colorFrom(palette.platformLight)
    const ink = colorFrom(palette.ink)
    const w = platform.width
    const h = platform.height
    const x = cx - w / 2
    const y = cy - h / 2
    g.fillStyle(0x07040f, 0.35)
    g.fillRoundedRect(x, y + 6, w, h, 8)
    g.fillGradientStyle(light, light, top, top, 1, 1, 1, 1)
    g.fillRoundedRect(x, y, w, h, 7)
    g.fillStyle(light, 0.72)
    g.fillRoundedRect(x + 3, y + 2, Math.max(0, w - 6), 4, 2)
    g.lineStyle(1.4, light, 0.42)
    g.strokeRoundedRect(x, y, w, h, 7)
    g.lineStyle(1, ink, 0.4)
    for (let px = x + 16; px < x + w - 12; px += 64) {
      g.fillStyle(ink, 0.35)
      g.fillCircle(px, y + h - 6, 1.7)
    }
    if (platform.kind === 'ice') {
      g.lineStyle(1, 0xffffff, 0.62)
      g.beginPath()
      g.moveTo(x + 12, y + 8)
      g.lineTo(x + Math.min(w - 14, 58), y + 8)
      g.strokePath()
    } else if (platform.kind === 'conveyor') {
      const direction = platform.direction ?? 1
      g.lineStyle(2, light, 0.8)
      for (let px = x + 26; px < x + w - 18; px += 34) {
        g.beginPath()
        g.moveTo(px - 5 * direction, y + h / 2 - 4)
        g.lineTo(px + 4 * direction, y + h / 2)
        g.lineTo(px - 5 * direction, y + h / 2 + 4)
        g.strokePath()
      }
    } else if (platform.kind === 'bounce') {
      g.fillStyle(light, 0.85)
      for (let px = x + 22; px < x + w - 18; px += 35) {
        g.fillCircle(px, y + 4, 4)
      }
    } else if (platform.kind === 'oneway') {
      g.lineStyle(2, COLORS.teal, 0.4)
      g.beginPath()
      g.moveTo(x + 8, y + h + 7)
      g.lineTo(x + w - 8, y + h + 7)
      g.strokePath()
    }
  }

  private buildMovingPlatforms(): void {
    this.level.movingPlatforms.forEach((spec) => {
      const rect = this.scene.add.rectangle(spec.x, spec.y, spec.width, spec.height, 0xffffff, 0)
      rect.setVisible(false)
      this.movingGroup.add(rect)
      const body = rect.body as Phaser.Physics.Arcade.StaticBody
      body.updateFromGameObject()
      const visual = this.scene.add.graphics().setDepth(4)
      this.moving.push({ spec, rect, body, visual, x: spec.x, y: spec.y, deltaX: 0, deltaY: 0 })
      this.drawMovingVisual(visual, spec, spec.x, spec.y)
    })
  }

  private drawMovingVisual(g: Phaser.GameObjects.Graphics, spec: MovingPlatformSpec, x: number, y: number): void {
    const palette = this.worldPalette
    const light = colorFrom(palette.platformLight)
    const top = colorFrom(palette.platform)
    const width = spec.width
    const height = spec.height
    g.clear()
    g.fillStyle(0x07040f, 0.3)
    g.fillRoundedRect(x - width / 2, y - height / 2 + 5, width, height, 7)
    g.fillGradientStyle(light, light, top, top, 1, 1, 1, 1)
    g.fillRoundedRect(x - width / 2, y - height / 2, width, height, 6)
    g.lineStyle(1.5, light, 0.55)
    g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 6)
    g.fillStyle(light, 0.8)
    g.fillCircle(x - width / 2 + 9, y, 2.5)
    g.fillCircle(x + width / 2 - 9, y, 2.5)
    if (spec.style === 'carrier') {
      g.lineStyle(1.4, light, 0.6)
      g.beginPath()
      g.moveTo(x - 12, y + height / 2 + 5)
      g.lineTo(x, y + height / 2 + 10)
      g.lineTo(x + 12, y + height / 2 + 5)
      g.strokePath()
    }
  }

  private buildPickups(): void {
    const addSpark = (group: Phaser.Physics.Arcade.Group, spec: { x: number; y: number; required?: boolean; variant?: number }, optional: boolean): Phaser.Physics.Arcade.Image => {
      const key = optional ? 'spark-optional' : `spark-${(spec.variant ?? 0) % 5}`
      const image = group.create(spec.x, spec.y, key) as Phaser.Physics.Arcade.Image
      image.setDisplaySize(optional ? 24 : 30, optional ? 24 : 30)
      image.setCircle(14)
      image.setData('baseY', spec.y)
      image.setData('phase', Math.random() * Math.PI * 2)
      image.setDepth(6)
      image.setBlendMode(Phaser.BlendModes.ADD)
      if (optional) image.setAlpha(0.62)
      return image
    }
    this.level.sparks.forEach((spec) => addSpark(this.sparks, spec, false))
    this.level.optionalSparks.forEach((spec) => addSpark(this.optionalSparks, spec, true))
    this.level.energy.forEach((spec) => {
      const image = this.energy.create(spec.x, spec.y, 'energy-cell') as Phaser.Physics.Arcade.Image
      image.setDisplaySize(19, 28)
      image.setData('baseY', spec.y)
      image.setData('phase', Math.random() * Math.PI * 2)
      image.setDepth(6)
      image.setBlendMode(Phaser.BlendModes.ADD)
    })
    const power = this.level.powerupId
    const spot = this.level.platforms[Math.floor(this.level.platforms.length / 2)]
    const orb = this.powerups.create(spot.x + Math.min(80, spot.width / 2), spot.y - 56, 'power-orb') as Phaser.Physics.Arcade.Image
    orb.setDisplaySize(30, 30)
    orb.setData('powerId', power)
    orb.setData('baseY', orb.y)
    orb.setData('phase', 0.4)
    orb.setDepth(6)
    orb.setBlendMode(Phaser.BlendModes.ADD)
  }

  private buildSwitches(): void {
    this.level.switches.forEach((spec) => {
      const g = this.scene.add.graphics().setDepth(5)
      this.drawSwitch(g, spec.x, spec.y, false, colorFrom(spec.color))
      this.switchVisuals.set(spec.id, g)
      const zone = this.scene.add.circle(spec.x, spec.y, 25, 0xffffff, 0)
      this.scene.physics.add.existing(zone, true)
      zone.setData('switchId', spec.id)
      this.switches.add(zone)
    })
    this.level.hazards.forEach((hazard) => {
      if (!hazard.linkedSwitch) return
      const visual = this.switchVisuals.get(hazard.linkedSwitch)
      if (visual) visual.setAlpha(0.85)
    })
  }

  private drawSwitch(g: Phaser.GameObjects.Graphics, x: number, y: number, active: boolean, color: number): void {
    g.clear()
    g.fillStyle(active ? color : 0x1a1631, active ? 0.9 : 0.75)
    g.fillCircle(x, y, 17)
    g.lineStyle(2.5, active ? 0xffffff : color, active ? 0.95 : 0.5)
    g.strokeCircle(x, y, 17)
    g.lineStyle(1.4, active ? color : 0xffffff, 0.35)
    g.strokeCircle(x, y, 23)
    g.fillStyle(active ? 0xffffff : color, active ? 0.85 : 0.55)
    g.fillCircle(x, y, 6)
    g.lineStyle(1.3, color, active ? 0.65 : 0.22)
    g.beginPath()
    g.arc(x, y, 28, -0.8, 0.8)
    g.strokePath()
  }

  private buildCheckpoints(): void {
    this.level.checkpoints.forEach((spec, index) => {
      const g = this.scene.add.graphics().setDepth(5)
      this.drawCheckpoint(g, spec.x, spec.y, index === 0)
      this.checkpointVisuals.push(g)
      const zone = this.scene.add.rectangle(spec.x, spec.y - 22, 52, 68, 0xffffff, 0)
      this.scene.physics.add.existing(zone, true)
      zone.setData('checkpointIndex', index)
      zone.setData('checkpointX', spec.x)
      zone.setData('checkpointY', spec.y)
      this.checkpoints.add(zone)
    })
  }

  private drawCheckpoint(g: Phaser.GameObjects.Graphics, x: number, y: number, active: boolean): void {
    g.clear()
    g.lineStyle(4, active ? COLORS.teal : 0x5a4b72, active ? 1 : 0.55)
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x, y - 67)
    g.strokePath()
    g.fillStyle(active ? COLORS.teal : 0x5a4b72, active ? 0.9 : 0.45)
    g.fillTriangle(x + 2, y - 64, x + 36, y - 53, x + 2, y - 40)
    g.lineStyle(1.5, 0xffffff, active ? 0.5 : 0.15)
    g.strokeTriangle(x + 2, y - 64, x + 36, y - 53, x + 2, y - 40)
    g.fillStyle(active ? COLORS.teal : 0x5a4b72, 0.35)
    g.fillCircle(x, y, 7)
  }

  private buildExit(): void {
    const x = this.level.exit.x
    const y = this.level.exit.y
    const palette = this.worldPalette
    const accent = colorFrom(palette.accent)
    const glow = colorFrom(palette.glow)
    const base = this.scene.add.graphics().setDepth(2)
    base.fillStyle(0x080611, 0.75)
    base.fillEllipse(x, y, 74, 108)
    base.lineStyle(3, accent, 0.42)
    base.strokeEllipse(x, y, 74, 108)
    this.portalRings.push({ ellipse: this.scene.add.ellipse(x, y, 55, 90, accent, 0.08).setDepth(3), baseScale: 1 })
    this.portalRings.push({ ellipse: this.scene.add.ellipse(x, y, 43, 74, glow, 0.08).setDepth(3), baseScale: 1 })
    this.portalRings[0].ellipse.setStrokeStyle(2, accent, 0.5)
    this.portalRings[1].ellipse.setStrokeStyle(1.5, glow, 0.6)
    this.portalRings.forEach((ring, index) => {
      if (!this.settings.reducedMotion) {
        this.scene.tweens.add({
          targets: ring.ellipse,
          scaleX: 1.12 + index * 0.1,
          scaleY: 1.04 + index * 0.06,
          alpha: 0.58,
          duration: 900 + index * 260,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      }
    })
    this.exitZone = this.scene.add.rectangle(x, y, 64, 96, 0xffffff, 0)
    this.scene.physics.add.existing(this.exitZone, true)
    this.exitZone.setData('exit', true)
  }

  setExitReady(ready: boolean): void {
    this.exitReady = ready
    const accent = colorFrom(this.worldPalette.accent)
    this.portalRings.forEach((ring) => ring.ellipse.setFillStyle(accent, ready ? 0.22 : 0.04))
    this.portalRings.forEach((ring) => ring.ellipse.setAlpha(ready ? 1 : 0.34))
    this.portalRings[0].ellipse.setStrokeStyle(ready ? 3 : 1.5, accent, ready ? 0.9 : 0.25)
    if (ready) this.scene.cameras.main.flash(160, 255, 255, 255, false)
  }

  activateSwitch(id: string): void {
    const visual = this.switchVisuals.get(id)
    if (!visual) return
    const spec = this.level.switches.find((entry) => entry.id === id)
    if (!spec) return
    this.drawSwitch(visual, spec.x, spec.y, true, colorFrom(spec.color))
  }

  activateCheckpoint(index: number): void {
    this.activatedCheckpoints = Math.max(this.activatedCheckpoints, index + 1)
    this.level.checkpoints.forEach((spec, i) => {
      const visual = this.checkpointVisuals[i]
      if (!visual) return
      this.drawCheckpoint(visual, spec.x, spec.y, i <= index)
    })
  }

  checkpointPosition(index: number): { x: number; y: number } {
    const spec = this.level.checkpoints[Math.max(0, Math.min(index, this.level.checkpoints.length - 1))]
    return spec ? { x: spec.x, y: spec.y - 2 } : { x: this.level.start.x, y: this.level.start.y }
  }

  get activatedCheckpointCount(): number {
    return this.activatedCheckpoints
  }

  update(deltaMs: number, time: number, player: { x: number; y: number }, magnetRange: number, radar: boolean, freezeMachines: boolean): void {
    this.time += deltaMs
    const dt = Math.min(deltaMs, 34) / 1000
    this.animatePickups(this.sparks, time, player, magnetRange, dt, false)
    this.animatePickups(this.optionalSparks, time, player, magnetRange, dt, true, radar)
    this.animatePickups(this.energy, time, player, magnetRange, dt, false)
    this.animatePower(time)
    if (!freezeMachines) this.movingTime += Math.min(deltaMs, 34)
    this.updateMoving(freezeMachines)
    this.portalRings.forEach((ring, index) => {
      ring.ellipse.setScale(1 + Math.sin(time * 0.0016 + index) * 0.025)
    })
  }

  private animatePickups(
    group: Phaser.Physics.Arcade.Group,
    time: number,
    player: { x: number; y: number },
    magnetRange: number,
    dt: number,
    optional: boolean,
    radar = false,
  ): void {
    group.getChildren().forEach((child) => {
      const image = child as Phaser.Physics.Arcade.Image
      if (!image.active) return
      const baseY = Number(image.getData('baseY') ?? image.y)
      const phase = Number(image.getData('phase') ?? 0)
      image.setRotation(time * 0.0012 + phase)
      const distance = Phaser.Math.Distance.Between(image.x, image.y, player.x, player.y - 20)
      if (magnetRange > 0 && distance < magnetRange && distance > 1) {
        image.x += ((player.x - image.x) / distance) * 270 * dt
        image.y += ((player.y - 20 - image.y) / distance) * 270 * dt
        image.setData('baseY', image.y)
      } else {
        image.y = baseY + Math.sin(time * 0.003 + phase) * 3
      }
      if (optional) image.setAlpha(radar ? 0.95 : 0.56)
      image.body?.updateFromGameObject()
    })
  }

  private animatePower(time: number): void {
    this.powerups.getChildren().forEach((child) => {
      const image = child as Phaser.Physics.Arcade.Image
      if (!image.active) return
      const baseY = Number(image.getData('baseY') ?? image.y)
      image.y = baseY + Math.sin(time * 0.0034) * 5
      image.rotation = Math.sin(time * 0.0017) * 0.18
      image.body?.updateFromGameObject()
    })
  }

  private updateMoving(freeze: boolean): void {
    if (freeze) return
    this.moving.forEach((platform) => {
      const spec = platform.spec
      // speed is authored in world-units per second. A full there-and-back
      // cycle is therefore twice the travel distance, with a floor so short
      // carriers never feel twitchy.
      const cycleMs = Math.max(2800, (spec.distance / Math.max(24, spec.speed * 1.35)) * 2000)
      const progress = (Math.sin((this.movingTime / cycleMs) * Math.PI * 2 + spec.phase * Math.PI * 2) + 1) / 2
      let x = spec.x
      let y = spec.y
      if (spec.axis === 'x') x += (progress * 2 - 1) * spec.distance * 0.5
      if (spec.axis === 'y') y += progress * spec.distance
      if (spec.axis === 'xy') {
        x += (progress * 2 - 1) * spec.distance * 0.35
        y += progress * spec.distance * 0.8
      }
      platform.deltaX = x - platform.x
      platform.deltaY = y - platform.y
      platform.x = x
      platform.y = y
      platform.rect.setPosition(x, y)
      platform.body.updateFromGameObject()
      this.drawMovingVisual(platform.visual, spec, x, y)
    })
  }

  motionSample(): Array<{ x: number; y: number; axis: string; style: string }> {
    return this.moving.map((platform) => ({
      x: Math.round(platform.x),
      y: Math.round(platform.y),
      axis: platform.spec.axis,
      style: platform.spec.style,
    }))
  }

  boardableLift(): { x: number; y: number; top: number } | null {
    const platform = this.moving.find((item) => item.spec.style === 'lift')
    return platform ? { x: platform.x, y: platform.y, top: platform.body.top } : null
  }

  rideDelta(playerBottom: number, playerLeft: number, playerRight: number): { x: number; y: number } {
    for (const platform of this.moving) {
      const top = platform.body.top
      if (Math.abs(playerBottom - top) > 9) continue
      const platformLeft = platform.body.left
      const platformRight = platform.body.right
      if (playerRight < platformLeft - 4 || playerLeft > platformRight + 4) continue
      // A suspended tab can produce a large frame jump. Never fling the player
      // across the stage when they step back onto a platform.
      return {
        x: Phaser.Math.Clamp(platform.deltaX, -24, 24),
        y: Phaser.Math.Clamp(platform.deltaY, -24, 24),
      }
    }
    return { x: 0, y: 0 }
  }

  nearestOptional(playerX: number, playerY: number): Phaser.Physics.Arcade.Image | null {
    let best: Phaser.Physics.Arcade.Image | null = null
    let distance = Number.POSITIVE_INFINITY
    this.optionalSparks.getChildren().forEach((child) => {
      const image = child as Phaser.Physics.Arcade.Image
      if (!image.active) return
      const d = Phaser.Math.Distance.Between(playerX, playerY, image.x, image.y)
      if (d < distance) {
        best = image
        distance = d
      }
    })
    return best
  }

  destroy(): void {
    this.moving.forEach((platform) => {
      platform.rect.destroy()
      platform.visual.destroy()
    })
    this.portalRings.forEach((ring) => ring.ellipse.destroy())
    this.portal.destroy()
    this.exitZone.destroy()
    this.sparks.destroy(true)
    this.optionalSparks.destroy(true)
    this.energy.destroy(true)
    this.powerups.destroy(true)
    this.switches.destroy(true)
    this.checkpoints.destroy(true)
    this.solids.destroy(true)
    this.oneWays.destroy(true)
    this.movingGroup.destroy(true)
  }
}
