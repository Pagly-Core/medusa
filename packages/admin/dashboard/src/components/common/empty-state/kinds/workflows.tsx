import { Art, Bar, Card, CheckBadge } from "../kit"

/** Three steps joined in a row, the last one done. */
export const Illustration = () => (
  <Art>
    <>
      <path d="M64 72 H 176" stroke="var(--es-ink-soft)" strokeWidth={2} strokeDasharray="4 4" />
      <Card x={40} y={52} w={48} h={40} r={12} tilt={-4}>
        <Bar x={52} y={69} w={24} />
      </Card>
      <Card x={96} y={52} w={48} h={40} r={12} tilt={3}>
        <Bar x={108} y={69} w={24} tone="soft" />
      </Card>
      <CheckBadge cx={182} cy={72} r={18} />
    </>
  </Art>
)
