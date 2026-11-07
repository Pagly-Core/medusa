import { Art, Bar, Card } from "../kit"

/** Three stacked labels sorting products by what they are. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={70} y={86} w={110} h={30} r={10} faded>
        <Bar x={84} y={98} w={50} tone="soft" />
      </Card>
      <Card x={58} y={56} w={120} h={30} r={10}>
        <circle cx={74} cy={71} r={6} fill="var(--es-peach)" />
        <Bar x={86} y={68} w={60} tone="soft" />
      </Card>
      <Card x={48} y={24} w={130} h={32} r={10}>
        <circle cx={64} cy={40} r={6} fill="var(--es-violet)" />
        <Bar x={76} y={37} w={64} />
      </Card>
    </>
  </Art>
)
