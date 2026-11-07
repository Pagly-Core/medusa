import { Art, Bar, Card, Label } from "../kit"

/** Two coupons clipped together for the dates they run. */
export const Illustration = () => (
  <Art>
    <>
      <Card x={70} y={58} w={136} h={56} r={12} faded>
        <Bar x={86} y={80} w={60} tone="soft" />
      </Card>
      <Card x={34} y={34} w={144} h={60} r={12}>
        <path
          d="M120 40 V 88"
          stroke="var(--es-ink-soft)"
          strokeDasharray="3 4"
          strokeWidth={1.5}
        />
        <Label x={48} y={66} size={12} weight={700}>
          BLACK10
        </Label>
        <Bar x={48} y={74} w={40} tone="soft" />
        <Label
          x={148}
          y={70}
          size={15}
          weight={700}
          tone="mint"
          anchor="middle"
        >
          10%
        </Label>
      </Card>
      <Card x={160} y={14} w={44} h={42} r={10}>
        <rect
          x={160}
          y={14}
          width={44}
          height={13}
          rx={10}
          fill="var(--es-tint-violet)"
        />
        <rect
          x={160}
          y={21}
          width={44}
          height={6}
          fill="var(--es-tint-violet)"
        />
        <Label x={182} y={48} size={15} weight={700} anchor="middle">
          28
        </Label>
      </Card>
    </>
  </Art>
)
