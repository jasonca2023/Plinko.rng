import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type DropResult = {
  id: number
  bet: number
  slotIndex: number
  multiplier: number
  payout: number
}

type Peg = { x: number; y: number }

type BallState = {
  x: number
  y: number
  vx: number
  vy: number
  active: boolean
  bet: number
  id: number
  seed: number
}

const ROWS = 11
const SLOT_COUNT = ROWS + 1
const PEG_RADIUS = 6
const BALL_RADIUS = 8
const TOP_PADDING = 70
const SIDE_PADDING = 62
const VERTICAL_GAP = 36
const HORIZONTAL_GAP = 40
const BOARD_WIDTH = SIDE_PADDING * 2 + SLOT_COUNT * HORIZONTAL_GAP
const BOARD_HEIGHT = TOP_PADDING + ROWS * VERTICAL_GAP + 124
const SLOTS_Y = TOP_PADDING + ROWS * VERTICAL_GAP + 42
const INITIAL_BALANCE = 1000
const MIN_BET = 0.01

const GRAVITY = 0.26
const RESTITUTION = 0.68
const AIR_DRAG = 0.995
const MAX_SPEED_X = 5.8
const MAX_SPEED_Y = 9.2

const multipliers = [0, 0.5, 1.2, 2, 3, 6, 6, 3, 2, 1.2, 0.5, 0]

function clampBet(input: number, balance: number): number {
  if (!Number.isFinite(input)) return MIN_BET
  const normalized = Math.round(input * 100) / 100
  if (normalized < MIN_BET) return MIN_BET
  if (normalized > balance) return Math.round(balance * 100) / 100
  return normalized
}

function createPegs(): Peg[] {
  const pegList: Peg[] = []

  for (let row = 0; row < ROWS; row += 1) {
    const count = SLOT_COUNT
    const isEvenRow = row % 2 === 0
    const rowOffset = isEvenRow ? 0 : HORIZONTAL_GAP / 2
    
    for (let col = 0; col < count; col += 1) {
      pegList.push({
        x: SIDE_PADDING + rowOffset + col * HORIZONTAL_GAP,
        y: TOP_PADDING + row * VERTICAL_GAP,
      })
    }
  }

  return pegList
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const ballsRef = useRef<BallState[]>([])

  const [balance, setBalance] = useState(INITIAL_BALANCE)
  const [bet, setBet] = useState(10)
  const [activeBallCount, setActiveBallCount] = useState(0)
  const [history, setHistory] = useState<DropResult[]>([])
  const [nextId, setNextId] = useState(1)
  const [activeSlot, setActiveSlot] = useState<number | null>(null)

  const isBankrupt = balance === 0 && activeBallCount === 0

  const pegs = useMemo(() => createPegs(), [])

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)

    ctx.fillStyle = '#0a1631'
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)

    ctx.fillStyle = '#14315a'
    ctx.fillRect(10, 10, BOARD_WIDTH - 20, BOARD_HEIGHT - 20)

    for (const peg of pegs) {
      ctx.beginPath()
      ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2)
      const pegGradient = ctx.createRadialGradient(peg.x - 2, peg.y - 2, 1, peg.x, peg.y, PEG_RADIUS)
      pegGradient.addColorStop(0, '#e9fdff')
      pegGradient.addColorStop(0.45, '#94ccff')
      pegGradient.addColorStop(1, '#4f8de2')
      ctx.fillStyle = pegGradient
      ctx.fill()
    }

    ctx.strokeStyle = 'rgba(140, 192, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(SIDE_PADDING - HORIZONTAL_GAP * 0.5, SLOTS_Y + 26)
    ctx.lineTo(SIDE_PADDING + (SLOT_COUNT - 1) * HORIZONTAL_GAP + HORIZONTAL_GAP * 0.5, SLOTS_Y + 26)
    ctx.stroke()

    for (const ball of ballsRef.current) {
      if (ball?.active) {
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
        const ballGradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_RADIUS)
        ballGradient.addColorStop(0, '#fff8d3')
        ballGradient.addColorStop(0.5, '#ffd86e')
        ballGradient.addColorStop(1, '#ffac28')
        ctx.fillStyle = ballGradient
        ctx.fill()
      }
    }
  }, [pegs])

  const finishDrop = (ballId: number, slotIndex: number) => {
    const ball = ballsRef.current.find((b) => b.id === ballId)
    if (!ball) return

    const boundedSlot = Math.max(0, Math.min(SLOT_COUNT - 1, slotIndex))
    const multiplier = multipliers[boundedSlot]
    const payout = Number((ball.bet * multiplier).toFixed(2))

    setBalance((prev) => Number((prev + payout).toFixed(2)))
    setHistory((prev) => [
      {
        id: ball.id,
        bet: ball.bet,
        slotIndex: boundedSlot,
        multiplier,
        payout,
      },
      ...prev,
    ].slice(0, 10))

    setActiveSlot(boundedSlot)
    ball.active = false
    ballsRef.current = ballsRef.current.filter((b) => b.active)
    setActiveBallCount(ballsRef.current.length)

    drawFrame()
  }

  const step = useCallback(() => {
    const balls = ballsRef.current
    if (balls.length === 0) {
      frameRef.current = null
      return
    }

    let hasActiveBall = false

    for (const ball of balls) {
      if (!ball.active) continue
      hasActiveBall = true

      ball.vy += GRAVITY
      ball.vx *= AIR_DRAG
      ball.vy *= AIR_DRAG

      if (ball.y < TOP_PADDING + VERTICAL_GAP * 0.6) {
        ball.vx *= 0.75
      }

      ball.vx = Math.max(-MAX_SPEED_X, Math.min(MAX_SPEED_X, ball.vx))
      ball.vy = Math.max(-MAX_SPEED_Y, Math.min(MAX_SPEED_Y, ball.vy))

      ball.x += ball.vx
      ball.y += ball.vy

      const leftWall = SIDE_PADDING - HORIZONTAL_GAP * 0.5
      const rightWall = SIDE_PADDING + (SLOT_COUNT - 1) * HORIZONTAL_GAP + HORIZONTAL_GAP * 0.5

      if (ball.x - BALL_RADIUS < leftWall) {
        ball.x = leftWall + BALL_RADIUS
        ball.vx = Math.max(0, ball.vx) * 0.35
      } else if (ball.x + BALL_RADIUS > rightWall) {
        ball.x = rightWall - BALL_RADIUS
        ball.vx = Math.min(0, ball.vx) * 0.35
      }

      for (const peg of pegs) {
        const dx = ball.x - peg.x
        const dy = ball.y - peg.y
        const distSq = dx * dx + dy * dy
        const minDist = BALL_RADIUS + PEG_RADIUS

        if (distSq <= minDist * minDist) {
          const dist = Math.max(0.0001, Math.sqrt(distSq))
          const nx = dx / dist
          const ny = dy / dist

          const overlap = minDist - dist
          ball.x += nx * overlap
          ball.y += ny * overlap

          const dot = ball.vx * nx + ball.vy * ny
          if (dot < 0) {
            ball.vx -= (1 + RESTITUTION) * dot * nx
            ball.vy -= (1 + RESTITUTION) * dot * ny
          }

          const angleNoise = Math.sin(ball.seed + peg.x * 0.073 + peg.y * 0.041) * 0.16
          ball.vx += angleNoise
        }
      }

      const floorY = SLOTS_Y + 24
      if (ball.y + BALL_RADIUS >= floorY) {
        const relative = (ball.x - SIDE_PADDING) / HORIZONTAL_GAP
        const slotIndex = Math.round(relative)
        finishDrop(ball.id, slotIndex)
      }
    }

    drawFrame()
    if (hasActiveBall) {
      frameRef.current = requestAnimationFrame(step)
    } else {
      frameRef.current = null
    }
  }, [pegs, finishDrop, drawFrame])

  const handleDrop = () => {
    if (balance < MIN_BET || isBankrupt) return

    const currentBet = clampBet(bet, balance)
    if (currentBet < MIN_BET || currentBet > balance) return

    setActiveSlot(null)
    setBalance((prev) => Number((prev - currentBet).toFixed(2)))

    const centerX = SIDE_PADDING + (ROWS * HORIZONTAL_GAP) / 2

    const newBall: BallState = {
      x: centerX,
      y: TOP_PADDING - 40,
      vx: 0,
      vy: 0.6,
      active: true,
      bet: currentBet,
      id: nextId,
      seed: nextId * 0.931,
    }

    ballsRef.current.push(newBall)
    setNextId((id) => id + 1)
    setActiveBallCount(ballsRef.current.length)

    drawFrame()
    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(step)
    }
  }

  const handleReset = () => {
    setBalance(INITIAL_BALANCE)
    setBet(10)
    setHistory([])
    setNextId(1)
    setActiveSlot(null)
    setActiveBallCount(0)
    ballsRef.current = []
    drawFrame()
  }

  useEffect(() => {
    drawFrame()
  }, [drawFrame])

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  return (
    <main className="app-shell">
      {isBankrupt ? (
        <div className="bankrupt-screen">
          <h1>BANKRUPT!</h1>
          <p>You've run out of money. Better luck next time!</p>
          <button onClick={handleReset} className="reset-button">Play Again</button>
        </div>
      ) : (
        <>
          <header className="topbar">
            <div>
              <p className="eyebrow">Plinko RNG</p>
              <h1>Ball + Peg Gambling Game</h1>
            </div>
            <div className="balance-card" aria-live="polite">
              <span>Balance</span>
              <strong>${balance.toFixed(2)}</strong>
            </div>
          </header>

          <section className="controls">
            <label htmlFor="bet">Bet Amount</label>
            <input
              id="bet"
              type="number"
              min={MIN_BET}
              step={0.01}
              value={bet}
              onChange={(event) => setBet(Number(event.target.value))}
            />
            <button onClick={handleDrop} disabled={balance < MIN_BET}>
              Drop Ball
            </button>
            <button onClick={() => setBet(balance)} disabled={balance < MIN_BET} className="all-in">
              All In
            </button>
          </section>

          <section className="board-wrap" aria-label="Plinko board">
            <div className="board-frame">
              <canvas ref={canvasRef} width={BOARD_WIDTH} height={BOARD_HEIGHT} />
              <div className="slots" style={{ width: SLOT_COUNT * HORIZONTAL_GAP }}>
                {multipliers.map((multiplier, i) => (
                  <div key={`${multiplier}-${i}`} className={`slot ${activeSlot === i ? 'active' : ''}`}>
                    {multiplier.toFixed(multiplier % 1 === 0 ? 0 : 1)}x
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="history">
            <h2>Recent Drops</h2>
            {history.length === 0 ? (
              <p className="empty">No drops yet. Drop your first ball.</p>
            ) : (
              <ul>
                {history.map((item) => (
                  <li key={item.id}>
                    <span>Bet ${item.bet.toFixed(2)}</span>
                    <span>Slot #{item.slotIndex + 1}</span>
                    <span>{item.multiplier.toFixed(item.multiplier % 1 === 0 ? 0 : 1)}x</span>
                    <strong>${item.payout.toFixed(2)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default App
