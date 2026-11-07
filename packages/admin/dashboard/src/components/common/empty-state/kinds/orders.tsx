import { Art, Bar, Card, Tag, Thumb } from "../kit"

/** An order with its items and a paid badge, and the box it ships in. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={150} y={58} w={64} h={62} r={10} tilt={8}>
        <rect x={150} y={58} width={64} height={18} rx={10} fill="var(--es-tint-peach)" />
        <rect x={178} y={58} width={8} height={62} fill="var(--es-peach)" opacity={0.5} />
      </Card>
      <Card x={36} y={22} w={128} h={102} tilt={-4}>
        <Bar x={48} y={34} w={50} h={7} />
        <Tag x={122} y={32} w={32} />
        <Thumb x={48} y={52} size={18} r={5} />
        <Bar x={74} y={56} w={52} tone="soft" />
        <Bar x={138} y={56} w={16} tone="soft" />
        <Thumb x={48} y={76} size={18} r={5} />
        <Bar x={74} y={80} w={40} tone="soft" />
        <Bar x={138} y={80} w={16} tone="soft" />
        <rect x={48} y={100} width={106} height={1} fill="var(--es-ink-faint)" />
        <Bar x={110} y={108} w={44} h={7} />
      </Card>
    </>
  </Art>
)
