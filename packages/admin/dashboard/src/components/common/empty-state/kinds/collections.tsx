import { Art, Bar, Card, Thumb } from "../kit"

/** A titled shelf holding three products. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={26} y={24} w={188} h={98} tilt={-3}>
        <Bar x={40} y={38} w={60} h={8} />
        <Bar x={40} y={52} w={36} tone="soft" />
        <Thumb x={40} y={66} size={46} r={9} />
        <Thumb x={97} y={66} size={46} r={9} />
        <Thumb x={154} y={66} size={46} r={9} />
      </Card>
    </>
  </Art>
)
