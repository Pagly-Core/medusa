import { Art, Bar, Card, Label } from "../kit"

/** A receipt with the tax line highlighted. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={66} y={16} w={108} h={112}>
        <Bar x={78} y={30} w={50} h={7} />
        <Bar x={78} y={48} w={50} tone="soft" />
        <Bar x={146} y={48} w={16} tone="soft" />
        <Bar x={78} y={60} w={40} tone="soft" />
        <Bar x={146} y={60} w={16} tone="soft" />
        <rect
          x={72}
          y={72}
          width={96}
          height={18}
          rx={6}
          fill="var(--es-tint-violet)"
        />
        <Bar x={78} y={78} w={30} tone="violet" />
        <Label x={162} y={85} size={10} weight={700} tone="violet" anchor="end">
          22%
        </Label>
        <rect x={78} y={100} width={84} height={1} fill="var(--es-ink-faint)" />
        <Bar x={118} y={108} w={44} h={7} />
      </Card>
    </>
  </Art>
)
