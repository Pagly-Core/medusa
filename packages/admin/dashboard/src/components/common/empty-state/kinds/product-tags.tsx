import { Art, Bar, Card, Chip, Thumb } from "../kit"

/** A product with small tags hanging from it. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={44} y={22} w={96} h={104}>
        <Thumb x={54} y={32} size={76} r={9} />
        <Bar x={54} y={114} w={44} tone="soft" />
      </Card>
      <path
        d="M140 52 L 160 46 M140 78 L 166 84"
        stroke="var(--es-ink-soft)"
        strokeWidth={1.5}
      />
      <Chip x={156} y={34} w={50} tone="violet">
        #new
      </Chip>
      <Chip x={160} y={74} w={52} tone="mint">
        #eco
      </Chip>
    </>
  </Art>
)
