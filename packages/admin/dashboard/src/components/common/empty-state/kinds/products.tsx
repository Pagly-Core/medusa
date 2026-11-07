import { Art, Bar, Button, Card, Chip, Thumb } from "../kit"

/** A product card with its photo, price and buy button, and a size chip. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={62} y={14} w={116} h={116} tilt={-5}>
        <Thumb x={72} y={24} size={96} r={10} />
      </Card>
      <Card x={92} y={88} w={100} h={40} r={12} tilt={3}>
        <Bar x={102} y={98} w={46} />
        <Bar x={102} y={110} w={28} tone="soft" />
        <Button x={154} y={100} w={30} />
      </Card>
      <Chip x={170} y={20} w={36} tone="violet" tilt={8}>
        M
      </Chip>
    </>
  </Art>
)
