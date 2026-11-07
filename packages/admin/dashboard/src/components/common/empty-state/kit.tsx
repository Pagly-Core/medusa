import { createContext, useContext, useId, type ReactNode } from "react"

// Pagly: the same kit as @pagly/storefront's admin components/empty-state/kit.tsx.
// Keep the two in step: plugin pages and core pages draw with one palette.

/**
 * The "3D suave" illustration kit: a soft gradient stage with tilted cards
 * floating over it. Every empty-state drawing in `kinds/` is built from these
 * parts and draws with the `--es-*` tokens below, so light and dark mode come
 * from one place. Example text inside a drawing stays language-neutral
 * (names, numbers, codes), because the drawing is not translated.
 */

/** The palette, scoped to the drawings; `.dark` is the admin's dark theme. */
const PALETTE = `
[data-pagly-es] {
  --es-stage-a: #ede9fe; --es-stage-b: #fdf2f8; --es-stage-c: #ffedd5;
  --es-card-top: #ffffff; --es-card-bottom: #f4f4f5; --es-card-edge: rgba(0, 0, 0, 0);
  --es-ink: #3f3f46; --es-ink-soft: #d4d4d8; --es-ink-faint: #e4e4e7;
  --es-field: #ffffff; --es-field-edge: #e4e4e7;
  --es-thumb-a: #c4b5fd; --es-thumb-b: #fdba74;
  --es-gold-a: #fcd34d; --es-gold-b: #f97316;
  --es-mint: #10b981; --es-violet: #8b5cf6; --es-peach: #fb923c; --es-on-accent: #ffffff;
  --es-tint-violet: #ede9fe; --es-tint-mint: #d1fae5; --es-tint-peach: #ffedd5;
  --es-glow: #ffffff; --es-glow-o: 0.45;
  --es-shadow: #3f3f46; --es-shadow-o: 0.16; --es-grain-o: 0.07;
}
.dark [data-pagly-es] {
  --es-stage-a: #241a3d; --es-stage-b: #2a1d2c; --es-stage-c: #33221a;
  --es-card-top: #34343a; --es-card-bottom: #2a2a2f; --es-card-edge: rgba(255, 255, 255, 0.08);
  --es-ink: #e4e4e7; --es-ink-soft: #52525b; --es-ink-faint: #3f3f46;
  --es-field: #212124; --es-field-edge: rgba(255, 255, 255, 0.1);
  --es-thumb-a: #7c3aed; --es-thumb-b: #ea580c;
  --es-tint-violet: #2e1065; --es-tint-mint: #022c22; --es-tint-peach: #431407;
  --es-glow-o: 0.06;
  --es-shadow: #000000; --es-shadow-o: 0.5; --es-grain-o: 0.12;
}
`

type Ids = {
  stage: string
  card: string
  thumb: string
  gold: string
  shadow: string
  grain: string
  clip: string
}

const IdsContext = createContext<Ids | null>(null)

const useIds = () => {
  const ids = useContext(IdsContext)
  if (!ids) {
    throw new Error("Illustration parts must be drawn inside <Art>")
  }
  return ids
}

const url = (id: string) => `url(#${id})`

/** Turns degrees around a point into an SVG transform. */
const tilt = (deg: number | undefined, cx: number, cy: number) =>
  deg ? `rotate(${deg} ${cx} ${cy})` : undefined

/** The gradient paints a drawing can fill its own shapes with. */
export type Paints = { thumb: string; gold: string }

/** The 240 × 144 stage every drawing sits on. Pass a function to fill custom shapes with the kit's gradients. */
export const Art = ({
  children,
}: {
  children: ReactNode | ((paints: Paints) => ReactNode)
}) => {
  const base = useId().replace(/[^A-Za-z0-9_-]/g, "")
  const ids: Ids = {
    stage: `es${base}stage`,
    card: `es${base}card`,
    thumb: `es${base}thumb`,
    gold: `es${base}gold`,
    shadow: `es${base}shadow`,
    grain: `es${base}grain`,
    clip: `es${base}clip`,
  }

  return (
    <svg
      viewBox="0 0 240 144"
      aria-hidden="true"
      focusable="false"
      data-pagly-es=""
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        overflow: "visible",
      }}
    >
      <style>{PALETTE}</style>
      <defs>
        <linearGradient id={ids.stage} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--es-stage-a)" }} />
          <stop offset="0.55" style={{ stopColor: "var(--es-stage-b)" }} />
          <stop offset="1" style={{ stopColor: "var(--es-stage-c)" }} />
        </linearGradient>
        <linearGradient id={ids.card} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--es-card-top)" }} />
          <stop offset="1" style={{ stopColor: "var(--es-card-bottom)" }} />
        </linearGradient>
        <linearGradient id={ids.thumb} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--es-thumb-a)" }} />
          <stop offset="1" style={{ stopColor: "var(--es-thumb-b)" }} />
        </linearGradient>
        <linearGradient id={ids.gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--es-gold-a)" }} />
          <stop offset="1" style={{ stopColor: "var(--es-gold-b)" }} />
        </linearGradient>
        <filter id={ids.shadow} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="7"
            style={{
              floodColor: "var(--es-shadow)",
              floodOpacity: "var(--es-shadow-o)",
            }}
          />
          <feDropShadow
            dx="0"
            dy="1"
            stdDeviation="1"
            style={{
              floodColor: "var(--es-shadow)",
              floodOpacity: "var(--es-shadow-o)",
            }}
          />
        </filter>
        <filter id={ids.grain}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 1" />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <clipPath id={ids.clip}>
          <rect x="8" y="8" width="224" height="128" rx="22" />
        </clipPath>
      </defs>
      <rect
        x="8"
        y="8"
        width="224"
        height="128"
        rx="22"
        fill={url(ids.stage)}
      />
      <g clipPath={url(ids.clip)}>
        <rect
          x="8"
          y="8"
          width="224"
          height="128"
          fill="black"
          filter={url(ids.grain)}
          style={{ opacity: "var(--es-grain-o)" }}
        />
        <circle
          cx="34"
          cy="124"
          r="30"
          fill="var(--es-glow)"
          style={{ opacity: "var(--es-glow-o)" }}
        />
      </g>
      <IdsContext.Provider value={ids}>
        {typeof children === "function"
          ? children({ thumb: url(ids.thumb), gold: url(ids.gold) })
          : children}
      </IdsContext.Provider>
    </svg>
  )
}

/** A floating card: soft gradient face, deep shadow, an optional tilt in degrees. */
export const Card = ({
  x,
  y,
  w,
  h,
  r = 14,
  tilt: deg,
  faded,
  children,
}: {
  x: number
  y: number
  w: number
  h: number
  r?: number
  tilt?: number
  faded?: boolean
  children?: ReactNode
}) => {
  const ids = useIds()
  return (
    <g
      transform={tilt(deg, x + w / 2, y + h / 2)}
      filter={url(ids.shadow)}
      opacity={faded ? 0.75 : undefined}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        fill={url(ids.card)}
        stroke="var(--es-card-edge)"
      />
      {children}
    </g>
  )
}

/** A text line drawn as a rounded bar. */
export const Bar = ({
  x,
  y,
  w,
  h = 6,
  tone = "ink",
}: {
  x: number
  y: number
  w: number
  h?: number
  tone?: "ink" | "soft" | "faint" | Accent
}) => (
  <rect
    x={x}
    y={y}
    width={w}
    height={h}
    rx={h / 2}
    fill={
      tone === "ink"
        ? "var(--es-ink)"
        : tone === "soft"
        ? "var(--es-ink-soft)"
        : tone === "faint"
        ? "var(--es-ink-faint)"
        : accent(tone)
    }
  />
)

/** A product photo: a violet-to-peach square with a soft highlight. */
export const Thumb = ({
  x,
  y,
  size,
  r = 10,
}: {
  x: number
  y: number
  size: number
  r?: number
}) => {
  const ids = useIds()
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={r}
        fill={url(ids.thumb)}
      />
      <circle
        cx={x + size / 2}
        cy={y + size / 2}
        r={size * 0.22}
        fill="white"
        opacity={0.5}
      />
    </g>
  )
}

export type Accent = "mint" | "violet" | "peach"

const accent = (tone: Accent) => `var(--es-${tone})`

/** Example text inside a drawing; keep it language-neutral. */
export const Label = ({
  x,
  y,
  size = 9,
  weight = 500,
  tone = "ink",
  anchor,
  children,
}: {
  x: number
  y: number
  size?: number
  weight?: number
  /** `onInk` is for text on an ink-filled shape, like a picked option. */
  tone?: "ink" | "soft" | "onAccent" | "onInk" | Accent
  anchor?: "start" | "middle" | "end"
  children: ReactNode
}) => (
  <text
    x={x}
    y={y}
    fontSize={size}
    fontWeight={weight}
    textAnchor={anchor}
    fill={
      tone === "ink"
        ? "var(--es-ink)"
        : tone === "soft"
        ? "var(--es-ink-soft)"
        : tone === "onAccent"
        ? "var(--es-on-accent)"
        : tone === "onInk"
        ? "var(--es-card-top)"
        : accent(tone)
    }
    style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
  >
    {children}
  </text>
)

/** A solid pill floating over the scene, like "+ $200". */
export const Chip = ({
  x,
  y,
  w,
  h = 22,
  tone = "mint",
  tilt: deg,
  children,
}: {
  x: number
  y: number
  w: number
  h?: number
  tone?: Accent
  tilt?: number
  children?: ReactNode
}) => {
  const ids = useIds()
  return (
    <g transform={tilt(deg, x + w / 2, y + h / 2)} filter={url(ids.shadow)}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={accent(tone)} />
      {children ? (
        <Label
          x={x + w / 2}
          y={y + h / 2 + 3.2}
          size={9}
          weight={700}
          tone="onAccent"
          anchor="middle"
        >
          {children}
        </Label>
      ) : null}
    </g>
  )
}

/** A soft tinted pill inside a card, like a status badge. */
export const Tag = ({
  x,
  y,
  w,
  h = 12,
  tone = "mint",
}: {
  x: number
  y: number
  w: number
  h?: number
  tone?: Accent
}) => (
  <g>
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={h / 2}
      fill={`var(--es-tint-${tone})`}
    />
    <rect
      x={x + 6}
      y={y + h / 2 - 1.5}
      width={w - 12}
      height={3}
      rx={1.5}
      fill={accent(tone)}
      opacity={0.7}
    />
  </g>
)

/** A round floating badge with a check mark. */
export const CheckBadge = ({
  cx,
  cy,
  r = 15,
  tone = "mint",
}: {
  cx: number
  cy: number
  r?: number
  tone?: Accent
}) => {
  const ids = useIds()
  const s = r / 15
  return (
    <g filter={url(ids.shadow)}>
      <circle cx={cx} cy={cy} r={r} fill={accent(tone)} />
      <path
        d={`M${cx - 7 * s} ${cy} l${5 * s} ${5 * s} ${9 * s} ${-10 * s}`}
        stroke="var(--es-on-accent)"
        strokeWidth={2.6 * s}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

const STAR =
  "M0 -5 l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z"

/** A row of gold stars; the ones past `filled` are drawn soft. */
export const Stars = ({
  x,
  y,
  count = 5,
  filled = count,
  gap = 14,
  scale = 1,
}: {
  x: number
  y: number
  count?: number
  filled?: number
  gap?: number
  scale?: number
}) => {
  const ids = useIds()
  return (
    <g>
      {Array.from({ length: count }, (_, index) => (
        <path
          key={index}
          d={STAR}
          transform={`translate(${x + index * gap} ${y}) scale(${scale})`}
          fill={index < filled ? url(ids.gold) : "var(--es-ink-soft)"}
        />
      ))}
    </g>
  )
}

/** An input field holding an example value, with a caret after it. */
export const Field = ({
  x,
  y,
  w,
  h = 26,
  value,
  caretAt,
}: {
  x: number
  y: number
  w: number
  h?: number
  value?: string
  caretAt?: number
}) => (
  <g>
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={9}
      fill="var(--es-field)"
      stroke="var(--es-field-edge)"
    />
    {value ? (
      <Label x={x + 10} y={y + h / 2 + 4} size={11}>
        {value}
      </Label>
    ) : null}
    {caretAt !== undefined ? (
      <rect
        x={x + caretAt}
        y={y + 6.5}
        width={1.5}
        height={h - 13}
        rx={0.75}
        fill="var(--es-violet)"
      />
    ) : null}
  </g>
)

/** A solid button inside a card. */
export const Button = ({
  x,
  y,
  w,
  h = 14,
  tone = "ink",
}: {
  x: number
  y: number
  w: number
  h?: number
  tone?: "ink" | Accent
}) => (
  <g>
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={h / 2}
      fill={tone === "ink" ? "var(--es-ink)" : accent(tone)}
    />
    <rect
      x={x + w * 0.3}
      y={y + h / 2 - 1.5}
      width={w * 0.4}
      height={3}
      rx={1.5}
      fill={tone === "ink" ? "var(--es-card-top)" : "var(--es-on-accent)"}
      opacity={0.85}
    />
  </g>
)

/** A small round avatar. */
export const Avatar = ({
  cx,
  cy,
  r = 7,
}: {
  cx: number
  cy: number
  r?: number
}) => {
  const ids = useIds()
  return <circle cx={cx} cy={cy} r={r} fill={url(ids.thumb)} />
}
