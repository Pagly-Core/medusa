import { Art, Bar, Card, Pointer } from "../kit"

/** Two delivery choices, standard and express, one of them picked. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={40} y={28} w={160} h={36} r={11}>
        <circle
          cx={58}
          cy={46}
          r={7}
          fill="none"
          stroke="var(--es-violet)"
          strokeWidth={2}
        />
        <circle cx={58} cy={46} r={3.5} fill="var(--es-violet)" />
        <Bar x={74} y={43} w={60} />
        <Bar x={164} y={43} w={22} tone="soft" />
      </Card>
      <Card x={44} y={74} w={160} h={36} r={11}>
        <circle
          cx={62}
          cy={92}
          r={7}
          fill="none"
          stroke="var(--es-ink-soft)"
          strokeWidth={2}
        />
        <Bar x={78} y={89} w={48} tone="soft" />
        <Bar x={168} y={89} w={22} tone="soft" />
      </Card>
      <Pointer x={62} y={50} />
    </>
  </Art>
)
