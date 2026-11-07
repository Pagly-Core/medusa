import { Art, Bar, Card } from "../kit"

/** A box set aside for an order, with a hold badge. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={64} y={30} w={96} h={84} r={10} tilt={-5}>
        <rect x={64} y={30} width={96} height={22} rx={10} fill="var(--es-tint-violet)" />
        <rect x={106} y={30} width={12} height={84} fill="var(--es-violet)" opacity={0.35} />
        <Bar x={76} y={92} w={40} tone="soft" />
      </Card>
      <Card x={150} y={20} w={40} h={40} r={20} tilt={6}>
        <rect x={162} y={39} width={16} height={12} rx={3} fill="var(--es-violet)" />
        <path d="M165 39 v-3 a5 5 0 0 1 10 0 v3" stroke="var(--es-violet)" strokeWidth={2} fill="none" />
      </Card>
    </>
  </Art>
)
