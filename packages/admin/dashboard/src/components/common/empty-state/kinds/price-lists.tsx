import { Art, Card, Chip, Label } from "../kit"

/** A price tag with the old price crossed out and the new one. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={58} y={28} w={124} h={84} r={14} tilt={-6}>
        <circle cx={78} cy={50} r={6} fill="var(--es-stage-a)" stroke="var(--es-ink-soft)" />
        <Label x={78} y={84} size={13} weight={500} tone="soft">$ 1.200</Label>
        <rect x={76} y={79} width={52} height={1.5} fill="var(--es-ink-soft)" />
        <Label x={78} y={102} size={18} weight={700}>$ 990</Label>
      </Card>
      <Chip x={150} y={20} w={54} tone="peach" tilt={8}>
        B2B
      </Chip>
    </>
  </Art>
)
