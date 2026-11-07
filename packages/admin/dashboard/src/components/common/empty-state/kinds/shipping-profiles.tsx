import { Art, Bar, Card, Chip } from "../kit"

/** A parcel with a shipping label for how it travels. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={58} y={30} w={124} h={88} r={10} tilt={-5}>
        <rect x={58} y={30} width={124} height={24} rx={10} fill="var(--es-tint-peach)" />
        <rect x={112} y={30} width={14} height={88} fill="var(--es-peach)" opacity={0.4} />
        <rect x={70} y={72} width={36} height={30} rx={4} fill="var(--es-field)" stroke="var(--es-field-edge)" />
        <Bar x={76} y={80} w={24} h={4} />
        <Bar x={76} y={90} w={16} h={4} tone="soft" />
      </Card>
      <Chip x={160} y={18} w={50} tone="peach" tilt={8}>
        XL
      </Chip>
    </>
  </Art>
)
