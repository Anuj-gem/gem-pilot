// Issues — v5.4 reframed Considerations.
// Headline up top, then list of issue items. Item flagged
// `is_primary_lever` gets a red-accent border + "Sharpest issue" label,
// matching the existing primary-lever treatment in `Collapsible`.
import type { Issues } from '@/types'
import { Section, Collapsible } from './v5-components'

interface Props {
  data: Issues
}

export function IssuesSection({ data }: Props) {
  if (!data?.items?.length && !data?.headline) return null
  const primary = data.items.find((i) => i.is_primary_lever === true)
  const secondary = data.items.filter((i) => i.is_primary_lever !== true)
  return (
    <Section
      label="Issues"
      subtitle={data.headline}
    >
      <div className="space-y-3">
        {primary && (
          <Collapsible
            title={primary.area}
            primary
            defaultOpen
          >
            <p className="text-[17px] text-[var(--gem-gray-100)] leading-[1.65] m-0">
              {primary.detail}
            </p>
          </Collapsible>
        )}
        {secondary.map((item, i) => (
          <Collapsible key={i} title={item.area}>
            <p className="text-[17px] text-[var(--gem-gray-100)] leading-[1.65] m-0">
              {item.detail}
            </p>
          </Collapsible>
        ))}
      </div>
    </Section>
  )
}
