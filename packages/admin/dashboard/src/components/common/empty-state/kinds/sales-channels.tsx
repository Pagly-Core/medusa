import { Art, Bar, Card, Thumb } from "../kit"

/** One product reaching two places where it sells. */
export const Illustration = () => (
  <Art>
    <>
      <path d="M106 70 C 126 70, 130 46, 148 44 M106 70 C 126 70, 130 96, 148 98" stroke="var(--es-violet)" strokeWidth={2} strokeDasharray="3 4" fill="none" />
      <Card x={30} y={36} w={76} h={70} tilt={-5}>
        <Thumb x={40} y={46} size={56} r={9} />
      </Card>
      <Card x={148} y={24} w={64} h={40} r={11} tilt={4}>
        <rect x={148} y={24} width={64} height={11} rx={11} fill="var(--es-tint-violet)" />
        <Bar x={158} y={44} w={36} tone="soft" />
      </Card>
      <Card x={148} y={78} w={64} h={40} r={11} tilt={-3}>
        <rect x={148} y={78} width={64} height={11} rx={11} fill="var(--es-tint-mint)" />
        <Bar x={158} y={98} w={30} tone="soft" />
      </Card>
    </>
  </Art>
)
