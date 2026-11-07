import { Art, Bar, Card, Chip, Thumb } from "../kit"

/** A half-filled order with a payment link floating beside it. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={40} y={20} w={124} h={106} tilt={-4}>
        <Bar x={52} y={32} w={56} h={7} />
        <Thumb x={52} y={50} size={18} r={5} />
        <Bar x={78} y={54} w={52} tone="soft" />
        <rect x={52} y={76} width={100} height={18} rx={6} fill="none" stroke="var(--es-ink-soft)" strokeDasharray="3 3" />
        <path d="M102 81 v8 M98 85 h8" stroke="var(--es-ink-soft)" strokeWidth={1.6} strokeLinecap="round" />
        <Bar x={52} y={106} w={40} tone="faint" />
      </Card>
      <Chip x={150} y={40} w={60} tone="violet" tilt={8}>
        pay.link
      </Chip>
    </>
  </Art>
)
