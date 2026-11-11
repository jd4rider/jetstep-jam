import type { PowerUpDefinition } from '../types'

export const POWERUPS: PowerUpDefinition[] = [
  {
    id: 'mega-thrusters', name: 'Mega Thrusters', short: 'MEGA', glyph: '▲', color: 0xff8a3d,
    description: 'A fierce lift boost. Rise faster without changing your fuel burn.',
    durationMs: 14000, maxStacks: 1, effect: { thrustMult: 1.45 },
  },
  {
    id: 'eco-jets', name: 'Eco Jets', short: 'ECO', glyph: '◇', color: 0x8affc1,
    description: 'A tuned fuel line. Thrust costs almost half the usual energy.',
    durationMs: 18000, maxStacks: 1, effect: { drainMult: 0.55 },
  },
  {
    id: 'twin-boost', name: 'Twin Boost', short: 'TWIN', glyph: '⇈', color: 0x5cf2ff,
    description: 'Both boots fire at once for an immediate lift burst, then run hot.',
    durationMs: 5000, maxStacks: 1, effect: { thrustMult: 1.2, immediate: 'twin' },
  },
  {
    id: 'hover-stabilizer', name: 'Hover Stabilizer', short: 'HOVER', glyph: '≋', color: 0x9beeff,
    description: 'Softer gravity and a lower fall cap make precision hovering easy.',
    durationMs: 14000, maxStacks: 1, effect: { gravityMult: 0.68, maxFall: 300 },
  },
  {
    id: 'rocket-dash', name: 'Rocket Dash', short: 'DASH', glyph: '»', color: 0xff7ec4,
    description: 'A horizontal boot burst, followed by quicker ground movement.',
    durationMs: 6000, maxStacks: 1, effect: { speedMult: 1.22, immediate: 'dash' },
  },
  {
    id: 'air-brake', name: 'Air Brake', short: 'BRAKE', glyph: '▽', color: 0xb79cff,
    description: 'Vents compress the exhaust. Falling speed is sharply reduced.',
    durationMs: 14000, maxStacks: 1, effect: { maxFall: 220 },
  },
  {
    id: 'turbo-boots', name: 'Turbo Boots', short: 'TURBO', glyph: '⚡', color: 0xffe066,
    description: 'The meadow sprint. Ground speed rises by more than a third.',
    durationMs: 16000, maxStacks: 1, effect: { speedMult: 1.36 },
  },
  {
    id: 'gravity-boots', name: 'Gravity Boots', short: 'LUNA', glyph: '☾', color: 0xa6c8ff,
    description: 'A gentler pull lets you stretch every jump into a long arc.',
    durationMs: 16000, maxStacks: 1, effect: { gravityMult: 0.64, jumpMult: 1.05 },
  },
  {
    id: 'magnetic-boots', name: 'Magnetic Boots', short: 'MAG', glyph: '⌁', color: 0xff7ec4,
    description: 'A friendly magnetic field tugs nearby Sound Sparks toward Pip.',
    durationMs: 18000, maxStacks: 1, effect: { magnetRange: 180 },
  },
  {
    id: 'energy-recycler', name: 'Energy Recycler', short: 'RECYCLE', glyph: '↻', color: 0x9bffda,
    description: 'Every clean landing feeds a little reclaimed energy back into the boots.',
    durationMs: 20000, maxStacks: 1, effect: { landingRefill: 15 },
  },
  {
    id: 'bubble-shield', name: 'Bubble Shield', short: 'BUBBLE', glyph: '○', color: 0x76e8ff,
    description: 'A bright bubble absorbs the next hit, then pops with a musical splash.',
    durationMs: 30000, maxStacks: 1, effect: { shield: 1 },
  },
  {
    id: 'temporary-invincibility', name: 'Temporary Invincibility', short: 'STAR', glyph: '✦', color: 0xffffff,
    description: 'A fearless shine. Hazards and enemies cannot hurt Pip for a short time.',
    durationMs: 8000, maxStacks: 1, effect: { invincible: true, hazardImmune: true },
  },
  {
    id: 'extra-life', name: 'Extra Life', short: 'LIFE', glyph: '♥', color: 0xff6b9d,
    description: 'A spare heart for the journey. Added immediately.',
    durationMs: 0, maxStacks: 1, effect: { immediate: 'life' },
  },
  {
    id: 'emergency-teleport', name: 'Emergency Teleport', short: 'WARP', glyph: '↟', color: 0xb79cff,
    description: 'Snaps Pip back to the last safe checkpoint. Added immediately.',
    durationMs: 0, maxStacks: 1, effect: { immediate: 'teleport' },
  },
  {
    id: 'hazard-resistance', name: 'Hazard Resistance', short: 'WARD', glyph: '⬡', color: 0xffd166,
    description: 'A hard-light coating ignores hazard damage for seven seconds.',
    durationMs: 7000, maxStacks: 1, effect: { hazardImmune: true },
  },
  {
    id: 'shock-absorber', name: 'Shock Absorber', short: 'SOFT', glyph: '⌄', color: 0x9bffda,
    description: 'Landings are cushioned, and each one returns a little energy.',
    durationMs: 15000, maxStacks: 1, effect: { maxFall: 400, landingRefill: 8 },
  },
  {
    id: 'collision-guard', name: 'Collision Guard', short: 'GUARD', glyph: '▣', color: 0x76e8ff,
    description: 'A single-use guard plate stops one collision from costing a heart.',
    durationMs: 30000, maxStacks: 1, effect: { shield: 1 },
  },
  {
    id: 'enemy-freeze', name: 'Enemy Freeze', short: 'FREEZE', glyph: '❄', color: 0x9beeff,
    description: 'A cold little chord locks every enemy in place.',
    durationMs: 8000, maxStacks: 1, effect: { enemyFreeze: true },
  },
  {
    id: 'spark-magnet', name: 'Spark Magnet', short: 'MAGNET', glyph: '⌁', color: 0xff8ed6,
    description: 'A wider magnetic pull gathers sparks from across the floor.',
    durationMs: 16000, maxStacks: 1, effect: { magnetRange: 235 },
  },
  {
    id: 'double-score', name: 'Double Score', short: '×2', glyph: '×2', color: 0xffe066,
    description: 'Every note counts twice while the golden metronome ticks.',
    durationMs: 18000, maxStacks: 1, effect: { scoreMult: 2 },
  },
  {
    id: 'combo-booster', name: 'Combo Booster', short: 'COMBO', glyph: '∞', color: 0xff7ec4,
    description: 'The combo window grows, and every pickup adds an extra beat.',
    durationMs: 18000, maxStacks: 1, effect: { comboBonus: 1, sparkBonus: 5 },
  },
  {
    id: 'treasure-radar', name: 'Treasure Radar', short: 'RADAR', glyph: '◎', color: 0x8affc1,
    description: 'Optional resonance fragments glow through the machinery.',
    durationMs: 24000, maxStacks: 1, effect: { radar: true },
  },
  {
    id: 'secret-detector', name: 'Secret Detector', short: 'SECRET', glyph: '⌕', color: 0xb79cff,
    description: 'Reveals the nearest hidden resonance and marks the route.',
    durationMs: 30000, maxStacks: 1, effect: { radar: true, magnetRange: 90 },
  },
  {
    id: 'bonus-energy', name: 'Bonus Energy', short: 'FUEL', glyph: '▮', color: 0x9bffda,
    description: 'A full canister of jet energy, added immediately.',
    durationMs: 0, maxStacks: 1, effect: { immediate: 'pulse', energyRefill: 40 },
  },
  {
    id: 'rainbow-spark-multiplier', name: 'Rainbow Spark Multiplier', short: 'RAINBOW', glyph: '✺', color: 0xff7ec4,
    description: 'Each spark becomes a little rainbow chord worth extra score.',
    durationMs: 18000, maxStacks: 1, effect: { scoreMult: 1.5, sparkBonus: 10 },
  },
  {
    id: 'collectible-echo', name: 'Collectible Echo', short: 'ECHO', glyph: '◌', color: 0x63f5ff,
    description: 'Every pickup leaves a ringing echo that adds bonus score.',
    durationMs: 18000, maxStacks: 1, effect: { sparkBonus: 15 },
  },
  {
    id: 'time-slow', name: 'Time Slow', short: 'SLOW', glyph: '◷', color: 0x8af5ff,
    description: 'Hazard rhythms stretch out, giving you room to find the beat.',
    durationMs: 9000, maxStacks: 1, effect: { slowHazards: true },
  },
  {
    id: 'freeze-machinery', name: 'Freeze Machinery', short: 'STOP', glyph: '❄', color: 0x9beeff,
    description: 'Conveyors, lifts and timed hazards hold their note for a moment.',
    durationMs: 7000, maxStacks: 1, effect: { freezeMachines: true },
  },
  {
    id: 'pulse-blast', name: 'Pulse Blast', short: 'PULSE', glyph: '◎', color: 0xffe066,
    description: 'A circular soundwave interrupts nearby enemies and clears the air.',
    durationMs: 0, maxStacks: 1, effect: { immediate: 'pulse' },
  },
  {
    id: 'mini-drone', name: 'Mini Drone Companion', short: 'DRONE', glyph: '•', color: 0x5cf2ff,
    description: 'A tiny helper circles Pip and gathers nearby Sound Sparks.',
    durationMs: 20000, maxStacks: 1, effect: { drone: true, magnetRange: 150 },
  },
  {
    id: 'sonic-wave', name: 'Sonic Wave', short: 'SONIC', glyph: ')))', color: 0xff8ed6,
    description: 'A wide push of sound knocks enemies away from the machinery.',
    durationMs: 0, maxStacks: 1, effect: { immediate: 'sonic' },
  },
  {
    id: 'phase-boots', name: 'Phase Boots', short: 'PHASE', glyph: '◈', color: 0xb79cff,
    description: 'The boots step halfway out of phase, passing safely through hazards.',
    durationMs: 8000, maxStacks: 1, effect: { phase: true, hazardImmune: true },
  },
  {
    id: 'portal-hop', name: 'Portal Hop', short: 'HOP', glyph: '↝', color: 0x8affc1,
    description: 'A short spatial shortcut lifts Pip to a safer platform above.',
    durationMs: 0, maxStacks: 1, effect: { immediate: 'portal' },
  },
  {
    id: 'gravity-flip', name: 'Gravity Flip', short: 'FLIP', glyph: '⇅', color: 0xa6c8ff,
    description: 'The room turns over for six strange seconds. Jet controls still work.',
    durationMs: 6000, maxStacks: 1, effect: { gravityMult: -0.5 },
  },
  {
    id: 'ultimate-jetstorm', name: 'Ultimate Jetstorm', short: 'STORM', glyph: '✹', color: 0xffffff,
    description: 'Both boots become a tiny comet: unlimited energy and furious lift.',
    durationMs: 9000, maxStacks: 1, effect: { infiniteEnergy: true, thrustMult: 1.25, drainMult: 0 },
  },
]

export const POWER_BY_ID = new Map(POWERUPS.map((power) => [power.id, power]))

export function powerForLevel(seed: number): PowerUpDefinition {
  return POWERUPS[Math.abs(seed) % POWERUPS.length]
}
