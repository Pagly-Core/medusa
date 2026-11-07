import { Art, Bar, Card, Label, Tag } from "../kit"

/** A refund receipt with the amount going back. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={62} y={18} w={116} h={108} tilt={-4}>
        <Bar x={76} y={32} w={50} h={7} />
        <Label x={76} y={66} size={17} weight={700} tone="peach">− $ 890</Label>
        <rect x={76} y={76} width={88} height={1} fill="var(--es-ink-faint)" />
        <Bar x={76} y={86} w={56} tone="soft" />
        <Bar x={76} y={98} w={40} tone="soft" />
        <Tag x={76} y={108} w={42} tone="peach" />
      </Card>
    </>
  </Art>
)
