import Phaser from 'phaser'
import { mulberry32, range } from '../core/rng'
import { worldAt } from '../data/worlds'

function css(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return `rgba(${r},${g},${b},${alpha})`
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function makeCanvas(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): void {
  if (scene.textures.exists(key)) return
  const texture = scene.textures.createCanvas(key, width, height)
  if (!texture) return
  const ctx = texture.context
  ctx.clearRect(0, 0, width, height)
  draw(ctx, width, height)
  texture.refresh()
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawSpark(ctx: CanvasRenderingContext2D, variant: number): void {
  const colors = [
    ['#ffe066', '#ff9f68'],
    ['#5cf2ff', '#9bffda'],
    ['#b79cff', '#ff8ed6'],
    ['#ff7ec4', '#ffe066'],
    ['#ffffff', '#9bffda'],
  ]
  const pair = colors[variant % colors.length]
  glow(ctx, 32, 32, 29, pair[0])
  ctx.save()
  ctx.translate(32, 32)
  ctx.rotate(variant * 0.4)
  ctx.fillStyle = pair[1]
  ctx.beginPath()
  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2
    const radius = i % 2 === 0 ? 23 : 9
    if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
    else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(-6, -7, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = css(0xffffff, 0.7)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, 30, 0.2, Math.PI * 1.05)
  ctx.stroke()
  ctx.restore()
}

function drawEnemy(ctx: CanvasRenderingContext2D, variant: number): void {
  const palette = [
    ['#ff7ec4', '#7d2b63'], ['#5cf2ff', '#17647a'], ['#ffe066', '#8c6b1a'],
    ['#8affc1', '#245f49'], ['#b79cff', '#493b80'], ['#ff9f68', '#7d3e20'],
  ]
  const pair = palette[variant % palette.length]
  const random = mulberry32(1200 + variant * 91)
  ctx.translate(48, 48)
  ctx.fillStyle = css(0x0a0718, 0.32)
  ctx.beginPath()
  ctx.ellipse(0, 28, 30, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  const family = variant % 10
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (family === 0 || family === 7) {
    // crawler
    ctx.strokeStyle = pair[1]
    ctx.lineWidth = 7
    for (let leg = -1; leg <= 1; leg += 2) {
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath()
        ctx.moveTo(leg * 15, 7)
        ctx.lineTo(leg * (26 + random() * 7), 22 + i * 5)
        ctx.stroke()
      }
    }
    ctx.fillStyle = pair[0]
    rounded(ctx, -25, -17, 50, 36, 16)
    ctx.fill()
    ctx.fillStyle = pair[1]
    rounded(ctx, -16, -8, 32, 17, 8)
    ctx.fill()
  } else if (family === 1 || family === 4) {
    // drone / hopper
    ctx.fillStyle = pair[1]
    rounded(ctx, -29, -4, 58, 18, 9)
    ctx.fill()
    ctx.fillStyle = pair[0]
    ctx.beginPath()
    ctx.arc(0, -7, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.globalAlpha = 0.7
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, -7, 30, 0.2, Math.PI * 1.5)
    ctx.stroke()
    ctx.globalAlpha = 1
  } else if (family === 2) {
    // roller
    ctx.fillStyle = pair[1]
    ctx.beginPath()
    ctx.arc(0, 0, 29, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = pair[0]
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(0, 0, 19, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * 11, Math.sin(angle) * 11)
      ctx.lineTo(Math.cos(angle) * 25, Math.sin(angle) * 25)
      ctx.stroke()
    }
  } else if (family === 3) {
    // bat / wing
    ctx.fillStyle = pair[1]
    ctx.beginPath()
    ctx.moveTo(-4, -2)
    ctx.lineTo(-40, -22)
    ctx.lineTo(-28, 8)
    ctx.lineTo(-10, 14)
    ctx.closePath()
    ctx.moveTo(4, -2)
    ctx.lineTo(40, -22)
    ctx.lineTo(28, 8)
    ctx.lineTo(10, 14)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = pair[0]
    rounded(ctx, -17, -18, 34, 37, 15)
    ctx.fill()
  } else if (family === 5) {
    // shield bot
    ctx.fillStyle = pair[1]
    rounded(ctx, -27, -25, 54, 50, 13)
    ctx.fill()
    ctx.strokeStyle = pair[0]
    ctx.lineWidth = 5
    rounded(ctx, -20, -18, 40, 36, 10)
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(-11, -8, 7, 7)
    ctx.fillRect(5, -8, 7, 7)
  } else if (family === 6) {
    // turret
    ctx.fillStyle = pair[1]
    rounded(ctx, -25, 0, 50, 26, 10)
    ctx.fill()
    ctx.fillStyle = pair[0]
    ctx.beginPath()
    ctx.arc(0, -6, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = pair[1]
    ctx.fillRect(6, -12, 34, 9)
  } else if (family === 8) {
    // charger
    ctx.fillStyle = pair[1]
    ctx.beginPath()
    ctx.moveTo(-28, 14)
    ctx.lineTo(0, -28)
    ctx.lineTo(28, 14)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = pair[0]
    ctx.beginPath()
    ctx.arc(0, -4, 19, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // jelly
    ctx.fillStyle = pair[0]
    ctx.beginPath()
    ctx.arc(0, 0, 27, Math.PI, 0)
    ctx.lineTo(23, 20)
    for (let i = 0; i < 5; i += 1) {
      ctx.quadraticCurveTo(17 - i * 10, 27 + (i % 2) * 5, 8 - i * 8, 20)
    }
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.5)
    ctx.beginPath()
    ctx.ellipse(-9, -8, 11, 5, -0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // eyes
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(-8, -9, 5, 0, Math.PI * 2)
  ctx.arc(9, -9, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#19112b'
  ctx.beginPath()
  ctx.arc(-7, -8, 2, 0, Math.PI * 2)
  ctx.arc(10, -8, 2, 0, Math.PI * 2)
  ctx.fill()
}

function drawBackground(ctx: CanvasRenderingContext2D, worldIndex: number, width: number, height: number): void {
  const world = worldAt(worldIndex)
  const palette = world.palette
  const random = mulberry32(9000 + worldIndex * 313)
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, palette.skyTop)
  gradient.addColorStop(0.58, palette.skyBottom)
  gradient.addColorStop(1, palette.ink)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // soft light source
  ctx.fillStyle = css(0xffffff, 0.04)
  ctx.beginPath()
  ctx.ellipse(width * 0.75, height * 0.16, width * 0.32, height * 0.18, -0.2, 0, Math.PI * 2)
  ctx.fill()
  glow(ctx, width * 0.74, height * 0.17, width * 0.22, css(0xffffff, 0.1))

  // far skyline and machine silhouettes
  for (let layer = 0; layer < 3; layer += 1) {
    ctx.fillStyle = css(Phaser.Display.Color.HexStringToColor(layer === 0 ? palette.horizon : palette.platform).color, 0.18 + layer * 0.13)
    const base = height * (0.5 + layer * 0.07)
    const blocks = 10 + layer * 4
    for (let i = 0; i < blocks; i += 1) {
      const w = range(random, 20, 68)
      const h = range(random, 40, 150) * (1 + layer * 0.22)
      const x = range(random, -20, width + 20)
      ctx.fillRect(x, base - h, w, h + 80)
      if (layer > 0 && random() < 0.5) {
        ctx.fillStyle = css(0xffffff, 0.08)
        ctx.fillRect(x + 8, base - h + 12, 4, 4)
        ctx.fillStyle = css(Phaser.Display.Color.HexStringToColor(layer === 0 ? palette.horizon : palette.platform).color, 0.18 + layer * 0.13)
      }
    }
  }

  // giant decorative rings / gears
  ctx.strokeStyle = css(0xffffff, 0.08)
  ctx.lineWidth = 3
  for (let i = 0; i < 5; i += 1) {
    const x = range(random, 30, width - 30)
    const y = range(random, 60, height * 0.7)
    const radius = range(random, 24, 74)
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.stroke()
    for (let tooth = 0; tooth < 8; tooth += 1) {
      const angle = (tooth / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)
      ctx.lineTo(x + Math.cos(angle) * (radius + 8), y + Math.sin(angle) * (radius + 8))
      ctx.stroke()
    }
  }

  // floating musical notes
  ctx.font = '600 20px "Trebuchet MS", sans-serif'
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = css(0xffffff, range(random, 0.05, 0.18))
    const x = range(random, 0, width)
    const y = range(random, 0, height)
    ctx.fillText(random() < 0.5 ? '♪' : '♫', x, y)
  }

  // layered foreground mist
  const mist = ctx.createLinearGradient(0, height * 0.58, 0, height)
  mist.addColorStop(0, 'rgba(0,0,0,0)')
  mist.addColorStop(1, css(Phaser.Display.Color.HexStringToColor(palette.skyTop).color, 0.62))
  ctx.fillStyle = mist
  ctx.fillRect(0, height * 0.5, width, height * 0.5)

  // fine scanline texture keeps the flat canvas from feeling like a placeholder
  ctx.fillStyle = 'rgba(255,255,255,0.018)'
  for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1)
}

function drawBoss(ctx: CanvasRenderingContext2D, worldIndex: number): void {
  const world = worldAt(worldIndex)
  const color = Phaser.Display.Color.HexStringToColor(world.boss.color).color
  const palette = world.palette
  ctx.translate(160, 160)
  glow(ctx, 0, 0, 150, css(color, 0.28))
  ctx.strokeStyle = css(0xffffff, 0.22)
  ctx.lineWidth = 3
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.beginPath()
    ctx.arc(0, 0, 78 + ring * 24, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = css(0x140e2b, 0.9)
  rounded(ctx, -70, -48, 140, 112, 34)
  ctx.fill()
  ctx.strokeStyle = css(color, 0.95)
  ctx.lineWidth = 6
  rounded(ctx, -70, -48, 140, 112, 34)
  ctx.stroke()
  ctx.fillStyle = css(Phaser.Display.Color.HexStringToColor(palette.platform).color, 1)
  rounded(ctx, -48, -28, 96, 68, 24)
  ctx.fill()
  ctx.fillStyle = css(color, 1)
  ctx.beginPath()
  ctx.arc(-20, 0, 12, 0, Math.PI * 2)
  ctx.arc(22, 0, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(-17, -3, 4, 0, Math.PI * 2)
  ctx.arc(25, -3, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = css(color, 0.7)
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(0, 66, 49, 0.15, Math.PI - 0.15)
  ctx.stroke()
  ctx.fillStyle = css(color, 0.9)
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2
    ctx.save()
    ctx.rotate(angle)
    rounded(ctx, 84, -6, 26, 12, 5)
    ctx.fill()
    ctx.restore()
  }
}

export function ensureCoreTextures(scene: Phaser.Scene): void {
  for (let variant = 0; variant < 5; variant += 1) {
    makeCanvas(scene, `spark-${variant}`, 64, 64, (ctx) => drawSpark(ctx, variant))
  }
  makeCanvas(scene, 'spark-optional', 64, 64, (ctx) => {
    glow(ctx, 32, 32, 30, 'rgba(255,255,255,0.9)')
    ctx.save()
    ctx.translate(32, 32)
    ctx.rotate(Math.PI / 4)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(-16, -16, 32, 32)
    ctx.fillStyle = '#b79cff'
    ctx.fillRect(-10, -10, 20, 20)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(-22, -22, 44, 44)
    ctx.restore()
  })
  makeCanvas(scene, 'energy-cell', 44, 64, (ctx) => {
    glow(ctx, 22, 32, 25, 'rgba(92,242,214,0.45)')
    ctx.fillStyle = '#183c43'
    rounded(ctx, 7, 4, 30, 56, 9)
    ctx.fill()
    ctx.strokeStyle = '#9bffda'
    ctx.lineWidth = 3
    rounded(ctx, 7, 4, 30, 56, 9)
    ctx.stroke()
    ctx.fillStyle = '#5cf2d6'
    rounded(ctx, 13, 18, 18, 32, 5)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(17, 9, 10, 5)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillRect(15, 22, 4, 18)
  })
  makeCanvas(scene, 'power-orb', 56, 56, (ctx) => {
    glow(ctx, 28, 28, 28, 'rgba(255,224,102,0.6)')
    ctx.fillStyle = 'rgba(20,14,43,0.9)'
    ctx.beginPath()
    ctx.arc(28, 28, 23, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffe066'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(28, 28, 23, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(28, 28, 16, 0.2, Math.PI * 1.4)
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(28, 28, 5, 0, Math.PI * 2)
    ctx.fill()
  })
  makeCanvas(scene, 'spark-glow', 64, 64, (ctx) => glow(ctx, 32, 32, 32, 'rgba(255,255,255,0.7)'))
  makeCanvas(scene, 'dust', 10, 10, (ctx) => {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(5, 5, 4, 0, Math.PI * 2)
    ctx.fill()
  })
  makeCanvas(scene, 'flame', 32, 72, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 72)
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.6)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(16, 0)
    ctx.bezierCurveTo(34, 30, 24, 52, 16, 72)
    ctx.bezierCurveTo(8, 52, -2, 30, 16, 0)
    ctx.fill()
  })
  makeCanvas(scene, 'star-full', 40, 40, (ctx) => {
    ctx.translate(20, 20)
    ctx.fillStyle = '#ffe066'
    ctx.beginPath()
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 === 0 ? 17 : 7
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r)
    }
    ctx.closePath()
    ctx.fill()
  })
  makeCanvas(scene, 'star-empty', 40, 40, (ctx) => {
    ctx.translate(20, 20)
    ctx.strokeStyle = 'rgba(255,244,220,0.36)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 === 0 ? 17 : 7
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r)
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r)
    }
    ctx.closePath()
    ctx.stroke()
  })
}

export function ensurePipTextures(scene: Phaser.Scene): void {
  const part = (key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): void => {
    makeCanvas(scene, key, width, height, (ctx) => {
      ctx.translate(width / 2, height / 2)
      draw(ctx)
    })
  }
  part('pip-head', 80, 64, (ctx) => {
    ctx.fillStyle = '#ffffff'
    rounded(ctx, -34, -27, 68, 54, 22)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.62)'
    rounded(ctx, -24, -21, 26, 14, 7)
    ctx.fill()
  })
  part('pip-visor', 64, 32, (ctx) => {
    ctx.fillStyle = '#ffffff'
    rounded(ctx, -28, -13, 56, 26, 12)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    rounded(ctx, -18, -8, 12, 8, 4)
    ctx.fill()
  })
  part('pip-jacket', 76, 70, (ctx) => {
    ctx.fillStyle = '#ffffff'
    rounded(ctx, -31, -30, 62, 60, 16)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    rounded(ctx, -22, -24, 20, 42, 7)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(-4, 12, 8, 18)
  })
  part('pip-pack', 40, 58, (ctx) => {
    ctx.fillStyle = '#ffffff'
    rounded(ctx, -17, -27, 34, 54, 9)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillRect(-12, -19, 24, 5)
    ctx.fillRect(-12, 12, 24, 5)
    ctx.beginPath()
    ctx.arc(0, -3, 5, 0, Math.PI * 2)
    ctx.fill()
  })
  part('pip-arm', 26, 50, (ctx) => {
    ctx.fillStyle = '#ffffff'
    rounded(ctx, -9, -22, 18, 44, 8)
    ctx.fill()
  })
  part('pip-leg', 28, 46, (ctx) => {
    ctx.fillStyle = '#ffffff'
    rounded(ctx, -10, -21, 20, 42, 7)
    ctx.fill()
  })
  part('pip-boot', 70, 46, (ctx) => {
    ctx.fillStyle = '#ffffff'
    rounded(ctx, -30, -17, 58, 30, 12)
    ctx.fill()
    rounded(ctx, -25, 4, 54, 16, 7)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    rounded(ctx, -20, -10, 18, 7, 3)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fillRect(-15, 8, 35, 3)
  })
  part('pip-hand', 22, 20, (ctx) => {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(0, 0, 9, 0, Math.PI * 2)
    ctx.fill()
  })
  part('pip-flame', 32, 72, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 72)
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(0, -36)
    ctx.bezierCurveTo(18, -5, 14, 20, 0, 36)
    ctx.bezierCurveTo(-14, 20, -18, -5, 0, -36)
    ctx.fill()
  })
  makeCanvas(scene, 'pip-bubble', 128, 128, (ctx) => {
    glow(ctx, 64, 64, 62, 'rgba(118,232,255,0.22)')
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(64, 64, 54, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(118,232,255,0.6)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(64, 64, 51, -1.1, 0.1)
    ctx.stroke()
  })
}

export function ensureEnemyTextures(scene: Phaser.Scene): void {
  for (let variant = 0; variant < 30; variant += 1) {
    makeCanvas(scene, `enemy-${variant}`, 96, 96, (ctx) => drawEnemy(ctx, variant))
  }
}

export function ensureBackground(scene: Phaser.Scene, worldIndex: number): void {
  makeCanvas(scene, `backdrop-${worldIndex}`, 360, 640, (ctx, width, height) => drawBackground(ctx, worldIndex, width, height))
}

export function ensureBossTexture(scene: Phaser.Scene, worldIndex: number): void {
  makeCanvas(scene, `boss-${worldIndex}`, 320, 320, (ctx) => drawBoss(ctx, worldIndex))
}
