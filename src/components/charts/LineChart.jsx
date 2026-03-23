import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function LineChart({ data = [], dataKey = 'equity', xKey = 'time', height = 200, showZero = true }) {
  const style = getComputedStyle(document.documentElement)
  const profit = style.getPropertyValue('--color-profit').trim()
  const loss = style.getPropertyValue('--color-loss').trim()
  const border = style.getPropertyValue('--color-border').trim()
  const textMuted = style.getPropertyValue('--color-text-muted').trim()
  const mono = style.getPropertyValue('--mono').trim()

  const lastVal = data[data.length - 1]?.[dataKey] ?? 0
  const color = lastVal >= 0 ? profit : loss

  const formatted = useMemo(() =>
    data.map((d) => ({ ...d, [xKey]: typeof d[xKey] === 'string' ? d[xKey].slice(0, 10) : d[xKey] })),
    [data, xKey]
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey={xKey} tick={{ fill: textMuted, fontSize: 10, fontFamily: mono }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: textMuted, fontSize: 10, fontFamily: mono }} tickLine={false} axisLine={false} width={50} />
        {showZero && <ReferenceLine y={0} stroke={border} strokeDasharray="4 4" />}
        <Tooltip
          contentStyle={{ background: 'var(--color-surface-2)', border: `1px solid ${border}`, borderRadius: 8, fontSize: 11, fontFamily: mono }}
          labelStyle={{ color: textMuted }}
          itemStyle={{ color }}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill="url(#lineGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
