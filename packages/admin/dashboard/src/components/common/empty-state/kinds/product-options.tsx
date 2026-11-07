import { Art, Bar, Card, Label } from "../kit"

/** A product's sizes and colours as choices a shopper picks from. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={40} y={26} w={160} h={92} tilt={-4}>
        <Bar x={54} y={40} w={30} tone="soft" />
        <rect x={54} y={52} width={30} height={20} rx={7} fill="var(--es-ink)" />
        <Label x={69} y={66} size={10} weight={700} tone="onInk" anchor="middle">S</Label>
        <rect x={90} y={52} width={30} height={20} rx={7} fill="var(--es-field)" stroke="var(--es-field-edge)" />
        <Label x={105} y={66} size={10} anchor="middle">M</Label>
        <rect x={126} y={52} width={30} height={20} rx={7} fill="var(--es-field)" stroke="var(--es-field-edge)" />
        <Label x={141} y={66} size={10} anchor="middle">L</Label>
        <Bar x={54} y={84} w={36} tone="soft" />
        <circle cx={62} cy={104} r={8} fill="var(--es-violet)" />
        <circle cx={84} cy={104} r={8} fill="var(--es-peach)" />
        <circle cx={106} cy={104} r={8} fill="var(--es-mint)" />
      </Card>
    </>
  </Art>
)
