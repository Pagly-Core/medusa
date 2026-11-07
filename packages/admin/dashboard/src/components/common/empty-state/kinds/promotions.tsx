import { Art, Bar, Card, Label } from "../kit"

/** A coupon with its code and the discount it gives. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={36} y={34} w={168} h={70} r={12} tilt={-5}>
        <circle cx={120} cy={34} r={7} fill="var(--es-stage-b)" />
        <circle cx={120} cy={104} r={7} fill="var(--es-stage-b)" />
        <path d="M120 44 V 94" stroke="var(--es-ink-soft)" strokeDasharray="3 4" strokeWidth={1.5} />
        <Label x={52} y={70} size={13} weight={700}>SUMMER20</Label>
        <Bar x={52} y={80} w={44} tone="soft" />
        <Label x={162} y={76} size={18} weight={700} tone="mint" anchor="middle">20%</Label>
      </Card>
    </>
  </Art>
)
