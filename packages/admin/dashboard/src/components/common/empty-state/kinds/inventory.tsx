import { Art, Card, Chip } from "../kit"

/** Boxes stacked on a shelf with the units in stock. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={40} y={66} w={64} h={54} r={8} tilt={-3}>
        <rect x={40} y={66} width={64} height={14} rx={8} fill="var(--es-tint-peach)" />
        <rect x={68} y={66} width={8} height={54} fill="var(--es-peach)" opacity={0.45} />
      </Card>
      <Card x={108} y={66} w={64} h={54} r={8} tilt={2}>
        <rect x={108} y={66} width={64} height={14} rx={8} fill="var(--es-tint-violet)" />
        <rect x={136} y={66} width={8} height={54} fill="var(--es-violet)" opacity={0.35} />
      </Card>
      <Card x={74} y={16} w={64} h={50} r={8} tilt={-6}>
        <rect x={74} y={16} width={64} height={14} rx={8} fill="var(--es-tint-mint)" />
        <rect x={102} y={16} width={8} height={50} fill="var(--es-mint)" opacity={0.4} />
      </Card>
      <Chip x={166} y={22} w={44} tilt={8}>
        24
      </Chip>
    </>
  </Art>
)
