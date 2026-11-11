import Phaser from 'phaser'
import { worldAt } from '../data/worlds'
import type { HazardKind, HazardSpec, LevelData, PowerModifiers } from '../types'

interface HazardInstance {
  spec: HazardSpec
  zone: Phaser.GameObjects.Rectangle
  body: Phaser.Physics.Arcade.Body
  visual: Phaser.GameObjects.Graphics
  baseX: number
  baseY: number
  active: boolean
  disabled: boolean
  phase: number
}

export type HazardContact = 'damage' | 'wind' | 'water' | 'gravity' | 'none'

function colorFrom(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color
}

function damageKind(kind: HazardKind): boolean {
  return !['wind', 'fan', 'water', 'gravity'].includes(kind)
}

export class HazardSystem {
  readonly group: Phaser.Physics.Arcade.Group
  readonly instances: HazardInstance[] = []
  private readonly scene: Phaser.Scene
  private readonly palette: ReturnType<typeof worldAt>['palette']
  private time = 0

  constructor(scene: Phaser.Scene, level: LevelData) {
    this.scene = scene
    this.palette = worldAt(level.worldIndex).palette
    this.group = scene.physics.add.group({ allowGravity: false, immovable: true })
    level.hazards.forEach((spec) => this.create(spec))
  }

  private create(spec: HazardSpec): void {
    const zone = this.scene.add.rectangle(spec.x, spec.y + spec.height / 2, spec.width, spec.height, 0xffffff, 0)
    this.scene.physics.add.existing(zone)
    const body = zone.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setImmovable(true)
    body.setSize(spec.width, spec.height, true)
    zone.setData('hazardKind', spec.kind)
    zone.setData('hazardIndex', this.instances.length)
    this.group.add(zone)
    const visual = this.scene.add.graphics().setPosition(spec.x, spec.y + spec.height / 2).setDepth(8)
    this.draw(visual, spec)
    this.instances.push({
      spec, zone, body, visual, baseX: spec.x, baseY: spec.y, active: true, disabled: false, phase: spec.phase * Math.PI * 2,
    })
  }

  private draw(g: Phaser.GameObjects.Graphics, spec: HazardSpec): void {
    const hazardColor = colorFrom(this.palette.hazard)
    const accent = colorFrom(this.palette.accent)
    const w = spec.width
    const h = spec.height
    g.clear()
    switch (spec.kind) {
      case 'spike':
        g.fillStyle(hazardColor, 0.9)
        for (let x = -w / 2; x < w / 2; x += 14) {
          g.fillTriangle(x, h / 2, x + 7, -h / 2, x + 14, h / 2)
        }
        g.lineStyle(1, 0xffffff, 0.3)
        g.strokeRect(-w / 2, h / 2 - 2, w, 2)
        break
      case 'laser':
      case 'beam':
      case 'rhythm':
        g.fillStyle(hazardColor, 0.1)
        g.fillRect(-w / 2 - 8, -h / 2, w + 16, h)
        g.fillStyle(hazardColor, 0.78)
        g.fillRect(-w / 2, -h / 2, w, h)
        g.fillStyle(0xffffff, 0.7)
        g.fillRect(-2, -h / 2, 4, h)
        g.fillStyle(accent, 0.85)
        g.fillCircle(0, -h / 2, 7)
        g.fillStyle(0x0c0918, 0.75)
        g.fillCircle(0, -h / 2, 3)
        break
      case 'shutter':
        g.fillStyle(0x241a38, 0.96)
        g.fillRoundedRect(-w / 2, -h / 2, w, h, 4)
        g.lineStyle(1.5, hazardColor, 0.8)
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, 4)
        for (let y = -h / 2 + 9; y < h / 2; y += 16) {
          g.lineStyle(1, 0xffffff, 0.12)
          g.beginPath()
          g.moveTo(-w / 2 + 3, y)
          g.lineTo(w / 2 - 3, y)
          g.strokePath()
        }
        break
      case 'saw':
        g.fillStyle(0x181225, 1)
        g.fillCircle(0, 0, w / 2)
        g.lineStyle(3, hazardColor, 0.95)
        g.strokeCircle(0, 0, w / 2 - 2)
        g.fillStyle(hazardColor, 0.9)
        for (let index = 0; index < 10; index += 1) {
          const angle = (index / 10) * Math.PI * 2
          g.fillTriangle(
            Math.cos(angle - 0.1) * w * 0.36, Math.sin(angle - 0.1) * w * 0.36,
            Math.cos(angle) * (w * 0.52), Math.sin(angle) * (w * 0.52),
            Math.cos(angle + 0.1) * w * 0.36, Math.sin(angle + 0.1) * w * 0.36,
          )
        }
        g.fillStyle(accent, 0.6)
        g.fillCircle(0, 0, w * 0.11)
        break
      case 'steam':
      case 'fire':
        g.fillStyle(hazardColor, 0.08)
        g.fillTriangle(0, -h / 2, -w / 2, h / 2, w / 2, h / 2)
        g.fillStyle(hazardColor, 0.32)
        g.fillTriangle(0, -h / 2 + 10, -w * 0.28, h / 2, w * 0.28, h / 2)
        g.lineStyle(2, accent, 0.5)
        g.beginPath()
        g.moveTo(-w / 2, h / 2 - 4)
        g.lineTo(w / 2, h / 2 - 4)
        g.strokePath()
        g.fillStyle(accent, 0.55)
        g.fillCircle(0, h / 2 - 4, 5)
        break
      case 'piston':
      case 'crusher':
      case 'hammer':
        g.fillStyle(0x21162f, 1)
        g.fillRoundedRect(-w / 2, -h / 2, w, h, 7)
        g.lineStyle(2, hazardColor, 0.8)
        g.strokeRoundedRect(-w / 2, -h / 2, w, h, 7)
        g.fillStyle(hazardColor, 0.75)
        g.fillRect(-w / 2 + 5, h / 2 - 9, w - 10, 4)
        g.fillStyle(0xffffff, 0.26)
        g.fillRect(-w / 2 + 9, -h / 2 + 6, w - 18, 3)
        break
      case 'electric':
        g.fillStyle(hazardColor, 0.16)
        g.fillRect(-w / 2, -h / 2, w, h)
        g.lineStyle(3, hazardColor, 0.8)
        g.beginPath()
        g.moveTo(-w / 2, 0)
        for (let x = -w / 2; x <= w / 2; x += 9) g.lineTo(x, (x % 18 === 0 ? -1 : 1) * (h / 2 - 4))
        g.strokePath()
        g.lineStyle(1, 0xffffff, 0.7)
        g.beginPath()
        g.moveTo(-w / 2, 0)
        for (let x = -w / 2; x <= w / 2; x += 9) g.lineTo(x, (x % 18 === 0 ? 1 : -1) * (h / 2 - 6))
        g.strokePath()
        break
      case 'acid':
      case 'water':
        g.fillStyle(spec.kind === 'acid' ? colorFrom(this.palette.hazard) : 0x45d9ff, 0.18)
        g.fillRect(-w / 2, -h / 2, w, h)
        g.lineStyle(2, spec.kind === 'acid' ? hazardColor : 0x7af5d4, 0.55)
        g.beginPath()
        for (let x = -w / 2; x <= w / 2; x += 8) g.lineTo(x, Math.sin(x * 0.18) * 4)
        g.strokePath()
        break
      case 'mine':
        g.fillStyle(hazardColor, 0.22)
        g.fillCircle(0, 0, w * 0.75)
        g.fillStyle(0x21162f, 1)
        g.fillCircle(0, 0, w / 2 - 3)
        g.lineStyle(2, hazardColor, 0.9)
        g.strokeCircle(0, 0, w / 2 - 3)
        for (let index = 0; index < 8; index += 1) {
          const angle = (index / 8) * Math.PI * 2
          g.beginPath()
          g.moveTo(Math.cos(angle) * w * 0.25, Math.sin(angle) * w * 0.25)
          g.lineTo(Math.cos(angle) * w * 0.5, Math.sin(angle) * w * 0.5)
          g.strokePath()
        }
        g.fillStyle(accent, 0.9)
        g.fillCircle(0, 0, 4)
        break
      case 'wind':
      case 'fan':
        g.fillStyle(0x9beeff, 0.05)
        g.fillRect(-w / 2, -h / 2, w, h)
        g.lineStyle(2, 0x9beeff, 0.36)
        for (let index = 0; index < 4; index += 1) {
          g.beginPath()
          g.arc(0, index * 28 - 36, 24 + index * 4, -2.4, 1.4)
          g.strokePath()
        }
        break
      case 'gravity':
        g.fillStyle(0xb79cff, 0.04)
        g.fillCircle(0, 0, w / 2)
        g.lineStyle(1.5, 0xb79cff, 0.32)
        for (let index = 0; index < 3; index += 1) g.strokeCircle(0, 0, 22 + index * 16)
        break
      case 'icicle':
        g.fillStyle(hazardColor, 0.9)
        g.fillTriangle(0, h / 2, -w / 2, -h / 2, w / 2, -h / 2)
        g.fillStyle(0xffffff, 0.45)
        g.fillTriangle(-3, h / 2 - 6, -w * 0.2, -h / 2 + 5, 0, -h / 2 + 5)
        break
      case 'boulder':
        g.fillStyle(0x2a2234, 1)
        g.fillCircle(0, 0, w / 2)
        g.lineStyle(3, hazardColor, 0.7)
        g.strokeCircle(0, 0, w / 2)
        g.lineStyle(1, 0xffffff, 0.18)
        g.strokeCircle(-5, -5, w / 4)
        break
      default:
        g.fillStyle(hazardColor, 0.8)
        g.fillRect(-w / 2, -h / 2, w, h)
        break
    }
  }

  update(time: number, deltaMs: number, mods: PowerModifiers): void {
    if (mods.freezeMachines) return
    const scale = mods.slowHazards ? 0.55 : 1
    this.time += deltaMs * scale
    const t = time * scale
    this.instances.forEach((hazard) => {
      const { spec, zone, body, visual } = hazard
      if (hazard.disabled) {
        hazard.active = false
        body.enable = false
        visual.setAlpha(0.16)
        zone.setData('hazardActive', false)
        return
      }
      const phaseTime = (t + hazard.phase * 1000) % Math.max(1, spec.period || 1)
      const cycle = spec.period ? phaseTime / spec.period : 0
      let active = true
      if (spec.period > 0 && damageKind(spec.kind)) {
        active = cycle < 0.56
      }
      if (spec.kind === 'piston' || spec.kind === 'crusher' || spec.kind === 'hammer') {
        active = cycle < 0.62
      }
      if (spec.kind === 'icicle') {
        active = cycle < 0.35
      }
      hazard.active = active
      body.enable = active || !damageKind(spec.kind)
      zone.setData('hazardActive', active)
      visual.setAlpha(active ? 1 : spec.period > 0 ? 0.22 : 0.9)

      let x = spec.x
      let y = spec.y
      if (spec.axis === 'x' && spec.distance) {
        const offset = (Math.sin((t / 1000) * (spec.kind === 'boulder' ? 0.75 : 1.6) + hazard.phase) * 0.5 + 0.5) * spec.distance
        x += offset - spec.distance * 0.5
      }
      if (spec.axis === 'y' && spec.distance) {
        const offset = (Math.sin((t / 1000) * 1.35 + hazard.phase) * 0.5 + 0.5) * spec.distance
        y += offset
      }
      if (spec.kind === 'icicle') {
        y = spec.y + Math.max(0, cycle - 0.35) * 190
      }
      zone.setPosition(x, y + spec.height / 2)
      body.updateFromGameObject()
      visual.setPosition(x, y + spec.height / 2)
      if (spec.kind === 'saw' || spec.kind === 'boulder') visual.rotation += 0.018
      if (spec.kind === 'mine') visual.rotation = Math.sin(t * 0.001 + hazard.phase) * 0.1
    })
  }

  disableSwitch(id: string): void {
    this.instances.forEach((hazard) => {
      if (hazard.spec.linkedSwitch === id) {
        hazard.disabled = true
        hazard.active = false
        hazard.body.enable = false
        hazard.visual.setAlpha(0.16)
      }
    })
  }

  contactAt(zone: Phaser.GameObjects.GameObject): HazardContact {
    const kind = zone.getData('hazardKind') as HazardKind | undefined
    if (!kind) return 'none'
    if (zone.getData('hazardActive') === false) return 'none'
    if (kind === 'wind' || kind === 'fan') return 'wind'
    if (kind === 'water') return 'water'
    if (kind === 'gravity') return 'gravity'
    return 'damage'
  }

  nearestActiveDanger(x: number, y: number, radius: number): HazardInstance | null {
    let nearest: HazardInstance | null = null
    let best = radius * radius
    for (const hazard of this.instances) {
      if (!hazard.active || !damageKind(hazard.spec.kind)) continue
      const dx = hazard.spec.x - x
      const dy = hazard.spec.y - y
      const distance = dx * dx + dy * dy
      if (distance < best) {
        best = distance
        nearest = hazard
      }
    }
    return nearest
  }

  destroy(): void {
    this.instances.forEach((hazard) => {
      hazard.visual.destroy()
      hazard.zone.destroy()
    })
    this.group.destroy(true)
  }
}
