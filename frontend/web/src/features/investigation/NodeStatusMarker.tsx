import type { CSSProperties } from 'react'

export type NodeStatus = 'active' | 'confirmed' | 'ruledOut' | 'rootCause' | 'suspended' | 'conflict'

type NodeStatusMarkerProps = {
  status?: NodeStatus
  size?: number
  emphaticRuledOut?: boolean
  style?: CSSProperties
}

export function NodeStatusMarker({ status = 'active', size = 32, emphaticRuledOut = false, style = {} }: NodeStatusMarkerProps) {
  const r = size / 2
  const cx = r
  const cy = r
  const stroke = Math.max(2, size * 0.08)
  const surface = 'var(--color-surface-2)'

  let body: JSX.Element
  let groupOpacity = 1

  switch (status) {
    case 'active':
      body = <circle cx={cx} cy={cy} r={r - stroke} fill={surface} stroke="var(--color-node-active)" strokeWidth={stroke} />
      break
    case 'confirmed':
      body = <circle cx={cx} cy={cy} r={r - stroke} fill="var(--color-node-active)" />
      break
    case 'ruledOut':
      groupOpacity = 0.5
      body = (
        <>
          <circle cx={cx} cy={cy} r={r - stroke} fill={surface} stroke="var(--color-node-ruled-out)" strokeWidth={stroke} />
          {emphaticRuledOut && (
            <path
              d={`M${cx - size * 0.18},${cy - size * 0.18} L${cx + size * 0.18},${cy + size * 0.18} M${cx + size * 0.18},${cy - size * 0.18} L${cx - size * 0.18},${cy + size * 0.18}`}
              stroke="var(--color-danger)"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          )}
        </>
      )
      break
    case 'rootCause':
      body = (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={r - stroke}
            fill="color-mix(in srgb, var(--color-node-root-cause) 16%, var(--color-surface-2))"
            stroke="var(--color-node-root-cause)"
            strokeWidth={stroke}
          />
          <path
            d={`M${cx},${cy - size * 0.2} L${cx},${cy + size * 0.2} M${cx - size * 0.2},${cy} L${cx + size * 0.2},${cy}`}
            stroke="var(--color-node-root-cause)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </>
      )
      break
    case 'suspended':
      body = (
        <circle
          cx={cx}
          cy={cy}
          r={r - stroke}
          fill={surface}
          stroke="var(--color-node-suspended)"
          strokeWidth={stroke}
          strokeDasharray={`${size * 0.16} ${size * 0.12}`}
        />
      )
      break
    case 'conflict':
      body = (
        <>
          <path d={`M${cx},${stroke} a${r - stroke},${r - stroke} 0 0 1 0,${2 * (r - stroke)} Z`} fill="var(--color-node-conflict)" />
          <path d={`M${cx},${size - stroke} a${r - stroke},${r - stroke} 0 0 1 0,${-2 * (r - stroke)} Z`} fill="var(--color-node-active)" />
          <circle cx={cx} cy={cy} r={r * 0.42} fill={surface} />
        </>
      )
      break
    default:
      body = <circle cx={cx} cy={cy} r={r - stroke} fill="var(--color-node-active)" />
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ opacity: groupOpacity, ...style }}
      aria-label={status}
      role="img"
    >
      {body}
    </svg>
  )
}
