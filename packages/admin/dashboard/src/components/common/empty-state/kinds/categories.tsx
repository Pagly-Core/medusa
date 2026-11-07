import { Art, Bar, Card } from "../kit"

/** A category with two subcategories branching from it. */
export const Illustration = () => (
  <Art>
    <>
      <path
        d="M84 58 V 96 H 118 M84 76 H 118"
        stroke="var(--es-ink-soft)"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
      <Card x={44} y={24} w={88} h={34} r={11}>
        <circle cx={60} cy={41} r={6} fill="var(--es-violet)" />
        <Bar x={72} y={38} w={48} />
      </Card>
      <Card x={118} y={62} w={84} h={28} r={10}>
        <circle cx={132} cy={76} r={5} fill="var(--es-peach)" />
        <Bar x={142} y={73} w={46} tone="soft" />
      </Card>
      <Card x={118} y={96} w={84} h={28} r={10}>
        <circle cx={132} cy={110} r={5} fill="var(--es-mint)" />
        <Bar x={142} y={107} w={38} tone="soft" />
      </Card>
    </>
  </Art>
)
