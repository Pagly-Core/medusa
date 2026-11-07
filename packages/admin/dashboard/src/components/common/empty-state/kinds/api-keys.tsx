import { Art, Card, Label } from "../kit"

/** A key card with its token masked. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={36} y={38} w={168} h={68} r={14} tilt={-4}>
        <circle cx={66} cy={72} r={14} fill="none" stroke="var(--es-violet)" strokeWidth={4} />
        <path d="M80 72 H 110 M100 72 v8 M106 72 v6" stroke="var(--es-violet)" strokeWidth={4} strokeLinecap="round" />
        <rect x={120} y={62} width={70} height={20} rx={7} fill="var(--es-field)" stroke="var(--es-field-edge)" />
        <Label x={128} y={76} size={10}>pk_••••</Label>
      </Card>
    </>
  </Art>
)
