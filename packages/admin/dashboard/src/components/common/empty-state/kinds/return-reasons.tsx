import { Art, Card, Chip } from "../kit"

/** A parcel on its way back, with the reason on a chip. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={50} y={36} w={100} h={80} r={10}>
        <rect
          x={50}
          y={36}
          width={100}
          height={22}
          rx={10}
          fill="var(--es-tint-peach)"
        />
        <rect
          x={94}
          y={36}
          width={12}
          height={80}
          fill="var(--es-peach)"
          opacity={0.4}
        />
      </Card>
      <Card x={146} y={24} w={44} h={44} r={22}>
        <path
          d="M176 52 a10 10 0 1 0 -6 -18 M170 28 l0 7 7 0"
          stroke="var(--es-violet)"
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Card>
      <Chip x={132} y={92} w={70} tone="violet">
        size ≠
      </Chip>
    </>
  </Art>
)
