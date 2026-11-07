import { Art, Avatar, Bar, Card, Chip } from "../kit"

/** A group of customers gathered under one label. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={40} y={34} w={160} h={78}>
        <Avatar cx={74} cy={66} r={16} />
        <Avatar cx={98} cy={66} r={16} />
        <Avatar cx={122} cy={66} r={16} />
        <Bar x={64} y={94} w={70} tone="soft" />
      </Card>
      <Chip x={150} y={22} w={56} tone="violet">
        VIP
      </Chip>
    </>
  </Art>
)
