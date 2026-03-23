import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'

const CandlestickChart = forwardRef(function CandlestickChart(
  { candles = [], markers = [], priceLines = [], indicators = {}, mini = false, height },
  ref
) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const stateRef = useRef({
    candles: [], markers: [], priceLines: [], indicators: {},
    viewStart: 0, viewCount: 100,
    crosshair: null, isDragging: false, dragStartX: 0, dragStartView: 0,
    liveBid: null, dragAccum: 0,
  })

  // ── helpers ──────────────────────────────────────────────────────────────
  const clr = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim()

  const calcSMA = (data, period) => data.map((_, i) => {
    if (i < period - 1) return null
    return data.slice(i - period + 1, i + 1).reduce((s, c) => s + c.c, 0) / period
  })

  const calcEMA = (data, period) => {
    const k = 2 / (period + 1)
    const result = []
    let prev = null
    data.forEach((c, i) => {
      if (i < period - 1) { result.push(null); return }
      if (prev === null) { prev = data.slice(0, period).reduce((s, x) => s + x.c, 0) / period; result.push(prev); return }
      prev = c.c * k + prev * (1 - k)
      result.push(prev)
    })
    return result
  }

  const calcBB = (data, period = 20, mult = 2) => data.map((_, i) => {
    if (i < period - 1) return null
    const slice = data.slice(i - period + 1, i + 1)
    const mean = slice.reduce((s, c) => s + c.c, 0) / period
    const std = Math.sqrt(slice.reduce((s, c) => s + (c.c - mean) ** 2, 0) / period)
    return { upper: mean + mult * std, mid: mean, lower: mean - mult * std }
  })

  // ── draw ─────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { candles, markers, priceLines, indicators, viewStart, viewCount, crosshair, liveBid } = stateRef.current
    const W = canvas.width, H = canvas.height
    if (!W || !H) return

    const bg = clr('--color-bg')
    const border = clr('--color-border')
    const profit = clr('--color-profit')
    const loss = clr('--color-loss')
    const warn = clr('--color-warn')
    const accent = clr('--color-accent')
    const textMuted = clr('--color-text-muted')
    const textSec = clr('--color-text-sec')
    const s2 = clr('--color-surface-2')

    const start = Math.max(0, viewStart)
    const count = Math.min(viewCount || 100, candles.length - start)
    const visible = candles.slice(start, start + count)
    if (!visible.length) {
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = textMuted; ctx.font = '12px var(--sans)'; ctx.textAlign = 'center'
      ctx.fillText('Loading chart data…', W / 2, H / 2)
      return
    }

    const pad = { top: mini ? 4 : 24, bottom: mini ? 4 : 28, left: 4, right: mini ? 4 : 68 }
    const chartW = W - pad.left - pad.right
    const chartH = H - pad.top - pad.bottom

    const prices = visible.flatMap((c) => [c.h, c.l])
    let minP = Math.min(...prices), maxP = Math.max(...prices)
    const margin = (maxP - minP) * 0.05 || 0.0001
    minP -= margin; maxP += margin
    const range = maxP - minP

    const toY = (p) => pad.top + ((maxP - p) / range) * chartH
    const slotW = chartW / visible.length
    const candleW = Math.max(1, Math.floor(slotW * 0.7))

    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

    // Grid
    if (!mini) {
      ctx.strokeStyle = border; ctx.lineWidth = 0.5
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartH / 4) * i
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke()
        const price = maxP - (range / 4) * i
        ctx.fillStyle = textMuted; ctx.font = '10px var(--mono)'; ctx.textAlign = 'left'
        ctx.fillText(price.toFixed(5), W - pad.right + 4, y + 3)
      }
      // Time labels
      const step = Math.max(1, Math.floor(visible.length / 6))
      ctx.fillStyle = textMuted; ctx.font = '9px var(--mono)'; ctx.textAlign = 'center'
      visible.forEach((c, i) => {
        if (i % step !== 0) return
        const x = pad.left + i * slotW + slotW / 2
        const label = c.t ? new Date(c.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        ctx.fillText(label, x, H - 6)
      })
    }

    // Indicators — BB
    if (indicators.bb) {
      const bb = calcBB(candles, 20, 2)
      const visibleBB = bb.slice(start, start + count)
      ;['upper', 'mid', 'lower'].forEach((key, ki) => {
        ctx.strokeStyle = `rgba(129,140,248,${ki === 1 ? 0.4 : 0.25})`
        ctx.lineWidth = 1; ctx.setLineDash(ki === 1 ? [4, 4] : [])
        ctx.beginPath()
        let started = false
        visibleBB.forEach((b, i) => {
          if (!b) return
          const x = pad.left + i * slotW + slotW / 2
          const y = toY(b[key])
          if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
        })
        ctx.stroke(); ctx.setLineDash([])
      })
    }

    // Indicators — SMA
    if (indicators.ma) {
      const sma = calcSMA(candles, 20).slice(start, start + count)
      ctx.strokeStyle = warn; ctx.lineWidth = 1.5; ctx.beginPath()
      let started = false
      sma.forEach((v, i) => {
        if (v === null) return
        const x = pad.left + i * slotW + slotW / 2
        const y = toY(v)
        if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // Indicators — EMA
    if (indicators.ema) {
      const ema = calcEMA(candles, 20).slice(start, start + count)
      ctx.strokeStyle = clr('--color-live'); ctx.lineWidth = 1.5; ctx.beginPath()
      let started = false
      ema.forEach((v, i) => {
        if (v === null) return
        const x = pad.left + i * slotW + slotW / 2
        const y = toY(v)
        if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // Candles
    visible.forEach((c, i) => {
      const x = pad.left + i * slotW + (slotW - candleW) / 2
      const midX = x + candleW / 2
      const isUp = c.c >= c.o
      const color = isUp ? profit : loss
      ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1

      const bodyTop = toY(Math.max(c.o, c.c))
      const bodyH = Math.max(1, Math.abs(toY(c.o) - toY(c.c)))
      ctx.fillRect(x, bodyTop, candleW, bodyH)
      ctx.beginPath()
      ctx.moveTo(midX, toY(c.h)); ctx.lineTo(midX, bodyTop)
      ctx.moveTo(midX, bodyTop + bodyH); ctx.lineTo(midX, toY(c.l))
      ctx.stroke()
    })

    // Price lines
    priceLines.forEach(({ price, color, label, dash }) => {
      if (!price) return
      const y = toY(price)
      if (y < pad.top || y > H - pad.bottom) return
      ctx.strokeStyle = color || accent; ctx.lineWidth = 1
      ctx.setLineDash(dash ? [5, 4] : [])
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke()
      ctx.setLineDash([])
      if (label && !mini) {
        const tw = ctx.measureText(label).width + 8
        ctx.fillStyle = color || accent
        ctx.fillRect(W - pad.right, y - 8, tw, 16)
        ctx.fillStyle = bg; ctx.font = '9px var(--mono)'; ctx.textAlign = 'left'
        ctx.fillText(label, W - pad.right + 4, y + 3)
      }
    })

    // Live bid line
    if (liveBid && !mini) {
      const y = toY(liveBid)
      if (y >= pad.top && y <= H - pad.bottom) {
        ctx.strokeStyle = accent; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke()
        ctx.setLineDash([])
        const label = liveBid.toFixed(5)
        const tw = ctx.measureText(label).width + 8
        ctx.fillStyle = accent
        ctx.fillRect(W - pad.right, y - 8, tw, 16)
        ctx.fillStyle = bg; ctx.font = '10px var(--mono)'; ctx.textAlign = 'left'
        ctx.fillText(label, W - pad.right + 4, y + 3)
      }
    }

    // Markers
    markers.forEach(({ time, shape, color: mColor }) => {
      const idx = visible.findIndex((c) => c.t && Math.abs(new Date(c.t) - new Date(time)) < 60000 * 60)
      if (idx < 0) return
      const c = visible[idx]
      const x = pad.left + idx * slotW + slotW / 2
      const col = mColor || accent
      ctx.fillStyle = col

      if (shape === 'arrowUp') {
        const y = toY(c.l) + 12
        ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.closePath(); ctx.fill()
      } else if (shape === 'arrowDown') {
        const y = toY(c.h) - 12
        ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.closePath(); ctx.fill()
      } else {
        const y = toY((c.h + c.l) / 2)
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill()
      }
    })

    // Crosshair + OHLC tooltip
    if (!mini && crosshair) {
      const { x, y } = crosshair
      ctx.strokeStyle = border; ctx.lineWidth = 0.5; ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, H - pad.bottom); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke()
      ctx.setLineDash([])

      // Price tag on Y axis
      const hoverPrice = maxP - ((y - pad.top) / chartH) * range
      ctx.fillStyle = accent
      ctx.fillRect(W - pad.right, y - 8, 64, 16)
      ctx.fillStyle = bg; ctx.font = '10px var(--mono)'; ctx.textAlign = 'left'
      ctx.fillText(hoverPrice.toFixed(5), W - pad.right + 4, y + 3)

      // OHLC tooltip
      const hoverIdx = Math.floor((x - pad.left) / slotW)
      const hoverCandle = visible[Math.max(0, Math.min(hoverIdx, visible.length - 1))]
      if (hoverCandle) {
        const lines = [
          `O: ${hoverCandle.o?.toFixed(5)}`,
          `H: ${hoverCandle.h?.toFixed(5)}`,
          `L: ${hoverCandle.l?.toFixed(5)}`,
          `C: ${hoverCandle.c?.toFixed(5)}`,
        ]
        const bw = 110, bh = lines.length * 16 + 10
        const bx = Math.min(x + 10, W - pad.right - bw - 4)
        const by = Math.max(pad.top, Math.min(y - bh / 2, H - pad.bottom - bh))
        ctx.fillStyle = s2
        ctx.strokeStyle = border; ctx.lineWidth = 1
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill(); ctx.stroke()
        ctx.fillStyle = textSec; ctx.font = '10px var(--mono)'; ctx.textAlign = 'left'
        lines.forEach((l, i) => ctx.fillText(l, bx + 8, by + 14 + i * 16))
      }
    }
  }, [])

  // ── sync markers / priceLines / indicators (no view reset) ──────────────
  useEffect(() => {
    stateRef.current.markers = markers
    stateRef.current.priceLines = priceLines
    stateRef.current.indicators = indicators
    draw()
  }, [markers, priceLines, indicators, draw])

  // ── sync candles — only reset view when candles array is replaced ─────────
  const prevCandlesRef = useRef(candles)
  useEffect(() => {
    const isNewLoad = candles !== prevCandlesRef.current
    prevCandlesRef.current = candles
    stateRef.current.candles = candles
    if (isNewLoad && candles.length) {
      stateRef.current.viewStart = Math.max(0, candles.length - 100)
      stateRef.current.viewCount = Math.min(100, candles.length)
    }
    draw()
  }, [candles, draw])

  // ── ResizeObserver ────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = container.offsetWidth
      canvas.height = height || container.offsetHeight
      draw()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [height, draw])

  // ── Mouse interactions ────────────────────────────────────────────────────
  useEffect(() => {
    if (mini) return
    const canvas = canvasRef.current
    if (!canvas) return

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      stateRef.current.crosshair = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      if (stateRef.current.isDragging) {
        const dx = e.clientX - stateRef.current.dragStartX
        const { candles, viewCount } = stateRef.current
        const slotW = (canvas.width - 72) / viewCount
        // accumulate fractional candles scrolled
        const raw = -dx / slotW
        const floored = Math.floor(raw)
        stateRef.current.viewStart = Math.max(0, Math.min(
          stateRef.current.dragStartView + floored,
          candles.length - viewCount
        ))
      }
      draw()
    }

    const onDown = (e) => {
      stateRef.current.isDragging = true
      stateRef.current.dragStartX = e.clientX
      stateRef.current.dragStartView = stateRef.current.viewStart
      stateRef.current.dragAccum = 0
      canvas.style.cursor = 'grabbing'
    }

    const onUp = () => { stateRef.current.isDragging = false; canvas.style.cursor = 'crosshair' }

    const onLeave = () => { stateRef.current.crosshair = null; stateRef.current.isDragging = false; canvas.style.cursor = 'crosshair'; draw() }

    const onWheel = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const { candles, viewStart, viewCount } = stateRef.current
      const pad = 72
      const slotW = (canvas.width - pad) / viewCount
      // which candle index is under the cursor
      const cursorIdx = viewStart + (mouseX - 4) / slotW
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
      const newCount = Math.max(10, Math.min(candles.length, Math.round(viewCount * zoomFactor)))
      // keep cursor candle in place
      const newStart = Math.max(0, Math.min(
        Math.round(cursorIdx - (mouseX - 4) / ((canvas.width - pad) / newCount)),
        candles.length - newCount
      ))
      stateRef.current.viewCount = newCount
      stateRef.current.viewStart = newStart
      draw()
    }

    canvas.style.cursor = 'crosshair'
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mouseup', onUp)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    // Touch: pan + pinch-zoom
    let touchStartX = 0
    let touchStartView = 0
    let lastPinchDist = null

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX
        touchStartView = stateRef.current.viewStart
        lastPinchDist = null
      } else if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        touchStartView = stateRef.current.viewStart
      }
    }

    const onTouchMove = (e) => {
      e.preventDefault()
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX
        const { candles, viewCount } = stateRef.current
        const slotW = (canvas.width - 72) / viewCount
        const newStart = Math.max(0, Math.min(
          touchStartView + Math.floor(-dx / slotW),
          candles.length - viewCount
        ))
        stateRef.current.viewStart = newStart
        draw()
      } else if (e.touches.length === 2 && lastPinchDist !== null) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const { candles, viewCount } = stateRef.current
        const scale = lastPinchDist / dist
        const newCount = Math.max(10, Math.min(candles.length, Math.round(viewCount * scale)))
        stateRef.current.viewCount = newCount
        stateRef.current.viewStart = Math.max(0, Math.min(touchStartView, candles.length - newCount))
        lastPinchDist = dist
        draw()
      }
    }

    const onTouchEnd = () => { lastPinchDist = null }

    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)

    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [mini, draw])

  // ── Imperative handle ─────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    updateCandle: (candle) => {
      const arr = stateRef.current.candles
      if (!arr.length) return
      const last = arr[arr.length - 1]
      if (last && last.t === candle.t) arr[arr.length - 1] = { ...last, ...candle }
      else {
        arr.push(candle)
        // Auto-scroll to latest
        const { viewCount } = stateRef.current
        stateRef.current.viewStart = Math.max(0, arr.length - viewCount)
      }
      draw()
    },
    setData: (newCandles) => {
      stateRef.current.candles = newCandles
      stateRef.current.viewStart = Math.max(0, newCandles.length - 100)
      stateRef.current.viewCount = Math.min(100, newCandles.length)
      draw()
    },
    setViewRange: (start, count) => {
      stateRef.current.viewStart = start
      stateRef.current.viewCount = count
      draw()
    },
    setLiveBid: (bid) => {
      stateRef.current.liveBid = bid
      draw()
    },
  }))

  return (
    <div ref={containerRef} style={{ width: '100%', height: height || '100%', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
})

export default CandlestickChart
