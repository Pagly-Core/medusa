import { Art, Avatar, Bar, Card, Chip, Tag } from "../kit"

/** A customer card with their orders count. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={44} y={30} w={152} h={84}>
        <Avatar cx={74} cy={62} r={18} />
        <Bar x={102} y={50} w={60} h={7} />
        <Bar x={102} y={64} w={74} tone="soft" />
        <Bar x={102} y={76} w={40} tone="faint" />
        <Tag x={58} y={94} w={40} tone="violet" />
      </Card>
      <Chip x={162} y={18} w={40} tone="violet">
        ×3
      </Chip>
    </>
  </Art>
)
