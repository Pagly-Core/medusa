// Pagly: the same kit as @pagly/storefront's admin components/empty-state/kit.tsx.
// Keep the two in step: plugin pages and core pages draw alike.

import { createContext, useContext, useId, type ReactNode } from "react"

/**
 * The empty-state illustration kit, in the admin's own style: small pieces of
 * real interface (flat cards with hairline borders, status badges, a focused
 * field, a pointer) on a faint dot grid. Every drawing in `kinds/` is built
 * from these parts. Colours are the dashboard's tokens (`--bg-base`,
 * `--fg-base`, `--tag-*`…), so light and dark mode follow the admin's theme;
 * the `--es-*` names below only point at them. Example text inside a drawing
 * stays language-neutral (names, numbers, codes): the drawing is not
 * translated.
 */
const PALETTE = `
[data-pagly-es] {
  --es-ink: var(--fg-base); --es-ink-soft: var(--fg-disabled); --es-ink-faint: var(--border-base);
  --es-card-top: var(--bg-base); --es-field: var(--bg-field); --es-field-edge: var(--border-strong);
  --es-mint: var(--tag-green-icon); --es-violet: var(--tag-purple-icon); --es-peach: var(--tag-orange-icon);
  --es-on-accent: var(--bg-base);
  --es-tint-mint: var(--tag-neutral-bg); --es-tint-violet: var(--tag-neutral-bg); --es-tint-peach: var(--tag-neutral-bg);
  --es-stage-a: var(--bg-subtle); --es-stage-b: var(--bg-subtle); --es-stage-c: var(--bg-subtle);
  --es-gold-a: var(--tag-orange-icon); --es-gold-b: var(--tag-orange-icon);
  --es-photo: var(--tag-neutral-bg); --es-photo-mark: var(--tag-neutral-icon);
  --es-shadow-o: 0.07;
}
.dark [data-pagly-es] { --es-shadow-o: 0.45; }
`

type Ids = { dots: string; fade: string; mask: string; shadow: string }

const IdsContext = createContext<Ids | null>(null)

const useIds = () => {
  const ids = useContext(IdsContext)
  if (!ids) {
    throw new Error("Illustration parts must be drawn inside <Art>")
  }
  return ids
}

const url = (id: string) => `url(#${id})`

/** The fills a drawing can use for its own shapes: a photo placeholder and the stars' orange. */
export type Paints = { thumb: string; gold: string }

const PAINTS: Paints = { thumb: "var(--es-photo)", gold: "var(--es-gold-a)" }

/** The 240 × 144 stage: a dot grid that fades out at the edges. Pass a function to use the kit's fills. */
export const Art = ({
  children,
}: {
  children: ReactNode | ((paints: Paints) => ReactNode)
}) => {
  const base = useId().replace(/[^A-Za-z0-9_-]/g, "")
  const ids: Ids = {
    dots: `es${base}dots`,
    fade: `es${base}fade`,
    mask: `es${base}mask`,
    shadow: `es${base}shadow`,
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
        <pattern
          id={ids.dots}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="4" cy="4" r="0.8" fill="var(--border-strong)" />
        </pattern>
        <radialGradient id={ids.fade} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0.35" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={ids.mask}>
          <rect x="0" y="0" width="240" height="144" fill={url(ids.fade)} />
        </mask>
        <filter id={ids.shadow} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow
            dx="0"
            dy="1"
            stdDeviation="1"
            style={{ floodColor: "black", floodOpacity: "var(--es-shadow-o)" }}
          />
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="6"
            style={{ floodColor: "black", floodOpacity: "var(--es-shadow-o)" }}
          />
        </filter>
      </defs>
      <rect
        x="0"
        y="0"
        width="240"
        height="144"
        fill={url(ids.dots)}
        mask={url(ids.mask)}
      />
      <IdsContext.Provider value={ids}>
        {typeof children === "function" ? children(PAINTS) : children}
      </IdsContext.Provider>
    </svg>
  )
}

/**
 * A card, like the admin's containers: flat, hairline border, soft shadow.
 * Corners are the admin's 8px unless a shape asks for a round one (r > 20).
 */
export const Card = ({
  x,
  y,
  w,
  h,
  r = 8,
  faded,
  children,
}: {
  x: number
  y: number
  w: number
  h: number
  r?: number
  faded?: boolean
  children?: ReactNode
}) => {
  const ids = useIds()
  return (
    <g opacity={faded ? 0.6 : undefined}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r > 20 ? r : Math.min(r, 8)}
        fill="var(--bg-base)"
        stroke="var(--border-base)"
        filter={url(ids.shadow)}
      />
      {children}
    </g>
  )
}

export type Accent = "mint" | "violet" | "peach"

/** The admin's tag colours for each accent. */
const TAG: Record<Accent, string> = {
  mint: "green",
  violet: "purple",
  peach: "orange",
}

const accent = (tone: Accent) => `var(--tag-${TAG[tone]}-icon)`

/** A text line drawn as a rounded bar. */
export const Bar = ({
  x,
  y,
  w,
  h = 5,
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
    height={Math.min(h, 6)}
    rx={Math.min(h, 6) / 2}
    fill={
      tone === "ink"
        ? "var(--fg-base)"
        : tone === "soft"
        ? "var(--fg-disabled)"
        : tone === "faint"
        ? "var(--border-strong)"
        : accent(tone)
    }
  />
)

/** A product photo: the admin's placeholder, a tile with a small landscape. */
export const Thumb = ({
  x,
  y,
  size,
  r = 6,
}: {
  x: number
  y: number
  size: number
  r?: number
}) => {
  const s = size / 40
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={Math.min(r, 6)}
        fill="var(--es-photo)"
      />
      <path
        d={`M${x + 9 * s} ${y + 29 * s} l${8 * s} ${-10 * s} ${6 * s} ${
          7 * s
        } ${4 * s} ${-4 * s} ${8 * s} ${7 * s}z`}
        fill="var(--es-photo-mark)"
      />
    </g>
  )
}

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
        ? "var(--fg-base)"
        : tone === "soft"
        ? "var(--fg-muted)"
        : tone === "onAccent" || tone === "onInk"
        ? "var(--bg-base)"
        : `var(--tag-${TAG[tone]}-text)`
    }
    style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
  >
    {children}
  </text>
)

/** A status badge, like the admin's: a tinted pill with a dot and a short value. */
export const Chip = ({
  x,
  y,
  w,
  h = 18,
  tone = "mint",
  children,
}: {
  x: number
  y: number
  w: number
  h?: number
  tone?: Accent
  children?: ReactNode
}) => {
  const tag = TAG[tone]
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={5}
        fill={`var(--tag-${tag}-bg)`}
        stroke={`var(--tag-${tag}-border)`}
      />
      <circle
        cx={x + 8}
        cy={y + h / 2}
        r={2.4}
        fill={`var(--tag-${tag}-icon)`}
      />
      {children ? (
        <text
          x={x + 14}
          y={y + h / 2 + 3}
          fontSize={8.5}
          fontWeight={500}
          fill={`var(--tag-${tag}-text)`}
          style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
        >
          {children}
        </text>
      ) : null}
    </g>
  )
}

/** A status badge with no words, for rows of a list. */
export const Tag = ({
  x,
  y,
  w,
  h = 14,
  tone = "mint",
}: {
  x: number
  y: number
  w: number
  h?: number
  tone?: Accent
}) => {
  const tag = TAG[tone]
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill={`var(--tag-${tag}-bg)`}
        stroke={`var(--tag-${tag}-border)`}
      />
      <circle
        cx={x + 6.5}
        cy={y + h / 2}
        r={2.2}
        fill={`var(--tag-${tag}-icon)`}
      />
      <rect
        x={x + 12}
        y={y + h / 2 - 1.5}
        width={Math.max(w - 18, 4)}
        height={3}
        rx={1.5}
        fill={`var(--tag-${tag}-text)`}
        opacity={0.6}
      />
    </g>
  )
}

/** A small round badge with a check: done, approved, issued. */
export const CheckBadge = ({
  cx,
  cy,
  r = 12,
  tone = "mint",
}: {
  cx: number
  cy: number
  r?: number
  tone?: Accent
}) => {
  const ids = useIds()
  const s = Math.min(r, 14) / 15
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={Math.min(r, 14)}
        fill="var(--bg-base)"
        stroke="var(--border-base)"
        filter={url(ids.shadow)}
      />
      <path
        d={`M${cx - 6 * s} ${cy} l${4.5 * s} ${4.5 * s} ${8 * s} ${-9 * s}`}
        stroke={accent(tone)}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

const STAR =
  "M0 -5 l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z"

/** A row of stars in the admin's orange; the ones past `filled` are drawn soft. */
export const Stars = ({
  x,
  y,
  count = 5,
  filled = count,
  gap = 13,
  scale = 0.9,
}: {
  x: number
  y: number
  count?: number
  filled?: number
  gap?: number
  scale?: number
}) => (
  <g>
    {Array.from({ length: count }, (_, index) => (
      <path
        key={index}
        d={STAR}
        transform={`translate(${x + index * gap} ${y}) scale(${scale})`}
        fill={index < filled ? "var(--tag-orange-icon)" : "var(--fg-disabled)"}
      />
    ))}
  </g>
)

/** An input holding an example value; with a caret it is focused, with the admin's blue ring. */
export const Field = ({
  x,
  y,
  w,
  h = 24,
  value,
  caretAt,
}: {
  x: number
  y: number
  w: number
  h?: number
  value?: string
  caretAt?: number
}) => {
  const focused = caretAt !== undefined
  return (
    <g>
      {focused ? (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={6}
          fill="none"
          stroke="var(--bg-interactive)"
          strokeOpacity={0.3}
          strokeWidth={3}
        />
      ) : null}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill="var(--bg-field)"
        stroke={focused ? "var(--bg-interactive)" : "var(--border-strong)"}
      />
      {value ? (
        <Label x={x + 9} y={y + h / 2 + 3.6} size={10.5} weight={400}>
          {value}
        </Label>
      ) : null}
      {focused ? (
        <rect
          x={x + caretAt}
          y={y + 5}
          width={1.2}
          height={h - 10}
          fill="var(--fg-base)"
        />
      ) : null}
    </g>
  )
}

/** A button: `ink` is the admin's primary (inverted), an accent is a secondary one. */
export const Button = ({
  x,
  y,
  w,
  h = 16,
  tone = "ink",
}: {
  x: number
  y: number
  w: number
  h?: number
  tone?: "ink" | Accent
}) =>
  tone === "ink" ? (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} fill="var(--fg-base)" />
      <rect
        x={x + w * 0.28}
        y={y + h / 2 - 1.5}
        width={w * 0.44}
        height={3}
        rx={1.5}
        fill="var(--bg-base)"
        opacity={0.85}
      />
    </g>
  ) : (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={5}
        fill="var(--bg-base)"
        stroke="var(--border-strong)"
      />
      <rect
        x={x + w * 0.28}
        y={y + h / 2 - 1.5}
        width={w * 0.44}
        height={3}
        rx={1.5}
        fill="var(--fg-base)"
        opacity={0.75}
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
}) => (
  <g>
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="var(--tag-neutral-bg)"
      stroke="var(--border-base)"
    />
    <circle
      cx={cx}
      cy={cy - r * 0.18}
      r={r * 0.3}
      fill="var(--tag-neutral-icon)"
    />
    <path
      d={`M${cx - r * 0.5} ${cy + r * 0.55} a${r * 0.5} ${
        r * 0.42
      } 0 0 1 ${r} 0`}
      fill="var(--tag-neutral-icon)"
    />
  </g>
)

/** The mouse pointer, its tip at (x, y): what the merchant is about to click. */
export const Pointer = ({ x, y }: { x: number; y: number }) => (
  <path
    d={`M${x} ${y} l0 15 4-4 3 6 3-1.4 -3-6 5.5 0z`}
    fill="var(--fg-base)"
    stroke="var(--bg-base)"
    strokeWidth={1.2}
    strokeLinejoin="round"
  />
)
