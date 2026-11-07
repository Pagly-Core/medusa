import { Art, Card, Chip } from "../kit"

/** A globe with the currencies a store sells in. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={72} y={22} w={96} h={96} r={48} tilt={0}>
        <circle cx={120} cy={70} r={40} fill="none" stroke="var(--es-ink-faint)" strokeWidth={2} />
        <ellipse cx={120} cy={70} rx={16} ry={40} fill="none" stroke="var(--es-ink-faint)" strokeWidth={2} />
        <path d="M80 70 H 160 M86 50 H 154 M86 90 H 154" stroke="var(--es-ink-faint)" strokeWidth={2} />
      </Card>
      <Chip x={30} y={34} w={44} tone="violet" tilt={-8}>
        UYU
      </Chip>
      <Chip x={164} y={86} w={44} tone="mint" tilt={8}>
        USD
      </Chip>
    </>
  </Art>
)
