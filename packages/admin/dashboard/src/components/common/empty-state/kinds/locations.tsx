import { Art, Bar, Card } from "../kit"

/** A store location marked with a pin on a small map. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={36} y={26} w={168} h={92}>
        <path
          d="M46 96 C 80 70, 110 110, 150 80 S 190 70, 196 60"
          stroke="var(--es-ink-faint)"
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M50 50 H 120 M90 36 V 110"
          stroke="var(--es-ink-faint)"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <Bar x={140} y={98} w={46} tone="soft" />
      </Card>
      <g>
        <path
          d="M120 30 c-12 0 -20 9 -20 20 c0 15 20 34 20 34 s20 -19 20 -34 c0 -11 -8 -20 -20 -20 z"
          fill="var(--es-violet)"
        />
        <circle cx={120} cy={50} r={7} fill="var(--es-on-accent)" />
      </g>
    </>
  </Art>
)
