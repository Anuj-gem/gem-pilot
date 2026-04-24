// Server-side PDF generator for the report. Built on pdfkit (already in deps).
//
// Three render levels controlled by `scope`:
//   - 'pitch'  — top card + Why this is a hit + Lead Characters + Package Angles
//   - 'full'   — pitch sections + Production Planning + Dev Priorities + Narrative Breakdown
//   - 'free'   — same skeleton as pitch, but ONLY the unblurred pieces a free
//                writer can read on their own report (top card + bullet 01 of
//                Why this is a hit + Primary Lever from Dev Priorities)
//
// The 'free' scope mirrors the paywall blur on /report/[id]/page.tsx so the
// PDF a free writer downloads is exactly what they can already see on screen.
// Pro writers always get 'pitch' or 'full'.

// @types/pdfkit isn't installed and we don't need full types — declare the
// surface we use inline so TS is happy without pulling in another devDep.
// PDFKit is required lazily inside generateReportPdf so a load-time error
// (e.g. missing AFM font files in a serverless build) becomes a catchable
// runtime error instead of a route-killing module-load crash.
type PDFDocumentCtor = new (opts?: any) => PdfDoc

interface PdfDoc {
  on(event: string, fn: (data: any) => void): this
  end(): void
  addPage(): this
  switchToPage(n: number): this
  bufferedPageRange(): { start: number; count: number }
  font(name: string): this
  fontSize(n: number): this
  fillColor(color: string): this
  strokeColor(color: string): this
  lineWidth(n: number): this
  text(text: string, x?: any, y?: any, opts?: any): this
  moveDown(n?: number): this
  rect(x: number, y: number, w: number, h: number): this
  fill(color?: string): this
  stroke(color?: string): this
  moveTo(x: number, y: number): this
  lineTo(x: number, y: number): this
  save(): this
  restore(): this
  x: number
  y: number
  page: {
    width: number
    height: number
    margins: { top: number; bottom: number; left: number; right: number }
  }
}

export type PdfScope = 'pitch' | 'full' | 'free'

interface PdfInput {
  title: string
  authorName: string | null
  declaredFormat: string | null
  postedAt: string | null
  evaluation: any // GEMEvaluation + V5Extras shape — kept loose so we tolerate field drift
  scope: PdfScope
}

const COLORS = {
  text: '#111827',
  body: '#374151',
  muted: '#6b7280',
  faint: '#9ca3af',
  gold: '#d4a017',
  goldDark: '#92710f',
  emerald: '#059669',
  red: '#dc2626',
  divider: '#e5e7eb',
}

export async function generateReportPdf(input: PdfInput): Promise<Buffer> {
  // Lazy require — see comment near PDFDocumentCtor type above.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit') as PDFDocumentCtor
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 56, bottom: 64, left: 56, right: 56 },
        info: {
          Title: `${input.title} — GEM Report`,
          Author: 'GEM',
          Producer: 'GEM (gem.studio)',
        },
      })

      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // ── Helper renderers ──────────────────────────────────────────
      const eyebrow = (text: string, color = COLORS.muted) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(color)
          .text(text.toUpperCase(), { characterSpacing: 1.2 })
        doc.moveDown(0.25)
      }
      const sectionHeader = (text: string) => {
        ensureSpace(doc, 80)
        doc.moveDown(0.6)
        doc
          .save()
          .rect(doc.page.margins.left, doc.y, 28, 1.5)
          .fill(COLORS.gold)
          .restore()
        doc.moveDown(0.4)
        doc
          .font('Helvetica-Bold')
          .fontSize(13)
          .fillColor(COLORS.text)
          .text(text.toUpperCase(), { characterSpacing: 1.6 })
        doc.moveDown(0.6)
      }
      const subhead = (text: string) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(13.5)
          .fillColor(COLORS.text)
          .text(text)
        doc.moveDown(0.25)
      }
      const body = (text: string, opts?: { italic?: boolean; color?: string }) => {
        doc
          .font(opts?.italic ? 'Helvetica-Oblique' : 'Helvetica')
          .fontSize(10.5)
          .fillColor(opts?.color ?? COLORS.body)
          .text(text, { align: 'left', lineGap: 2 })
        doc.moveDown(0.6)
      }
      const numberedItem = (n: number, title: string, content: string) => {
        ensureSpace(doc, 70)
        const startY = doc.y
        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(COLORS.gold)
          .text(String(n).padStart(2, '0'), doc.page.margins.left, startY, {
            width: 22,
            continued: false,
          })
        doc
          .font('Helvetica-Bold')
          .fontSize(11.5)
          .fillColor(COLORS.text)
          .text(title, doc.page.margins.left + 22, startY, {
            width: contentWidth(doc) - 22,
          })
        doc.moveDown(0.3)
        if (content) {
          doc
            .font('Helvetica')
            .fontSize(10.5)
            .fillColor(COLORS.body)
            .text(content, doc.page.margins.left + 22, doc.y, {
              width: contentWidth(doc) - 22,
              lineGap: 2,
            })
        }
        doc.moveDown(0.7)
        doc.x = doc.page.margins.left
      }
      const labeledBlock = (label: string, value: string, accent = COLORS.gold) => {
        ensureSpace(doc, 50)
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(accent)
          .text(label.toUpperCase(), { characterSpacing: 1.3 })
        doc.moveDown(0.2)
        doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor(COLORS.text)
          .text(value, { lineGap: 2 })
        doc.moveDown(0.7)
      }
      const divider = () => {
        doc.moveDown(0.5)
        doc
          .save()
          .strokeColor(COLORS.divider)
          .lineWidth(0.5)
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .stroke()
          .restore()
        doc.moveDown(0.6)
      }

      // ── Cover / top card ──────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.gold)
        .text('GEM', { characterSpacing: 2.5 })
      doc.moveDown(0.4)

      doc
        .font('Helvetica-Bold')
        .fontSize(26)
        .fillColor(COLORS.text)
        .text(input.title, { lineGap: 2 })
      doc.moveDown(0.3)

      const metaParts: string[] = []
      if (input.authorName) metaParts.push(`By ${input.authorName}`)
      if (input.declaredFormat) metaParts.push(input.declaredFormat)
      const cls = input.evaluation?.classification
      if (cls?.genre_primary) metaParts.push(cls.genre_primary)
      if (input.postedAt) metaParts.push(`Posted ${formatDate(input.postedAt)}`)
      doc
        .font('Helvetica')
        .fontSize(10.5)
        .fillColor(COLORS.muted)
        .text(metaParts.join('  ·  '))
      doc.moveDown(0.4)

      const headline =
        input.evaluation?.positioning_hook ||
        input.evaluation?.whats_special?.headline ||
        ''
      if (headline) {
        doc.moveDown(0.4)
        doc
          .save()
          .rect(doc.x, doc.y, 3, 36)
          .fill(COLORS.gold)
          .restore()
        const hX = doc.page.margins.left + 12
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(COLORS.goldDark)
          .text('HEADLINE', hX, doc.y - 36, {
            characterSpacing: 1.4,
          })
        doc.moveDown(0.2)
        doc
          .font('Helvetica-Oblique')
          .fontSize(13)
          .fillColor(COLORS.text)
          .text(headline, hX, doc.y, {
            width: contentWidth(doc) - 12,
            lineGap: 3,
          })
        doc.x = doc.page.margins.left
        doc.moveDown(0.8)
      }
      divider()

      const isFree = input.scope === 'free'

      // ── WHY THIS IS A HIT ─────────────────────────────────────────
      const strengths: any[] = input.evaluation?.whats_special?.strengths ?? []
      if (strengths.length > 0) {
        sectionHeader('Why this is a hit')
        const subtitleHeadline = input.evaluation?.whats_special?.headline
        if (subtitleHeadline) body(subtitleHeadline, { color: COLORS.body })
        const items = isFree ? strengths.slice(0, 1) : strengths
        items.forEach((s, i) => {
          numberedItem(i + 1, s.dimension_or_area || `Strength ${i + 1}`, s.what_it_means || '')
        })
        if (isFree && strengths.length > 1) {
          body(
            `+ ${strengths.length - 1} more strength${strengths.length - 1 === 1 ? '' : 's'} unlocked with GEM Pro.`,
            { italic: true, color: COLORS.faint }
          )
        }
      }

      // ── LEAD CHARACTERS — Pitch + Full only (Pro) ─────────────────
      const leads: any[] = input.evaluation?.lead_characters ?? []
      if (!isFree && leads.length > 0) {
        sectionHeader('Lead Characters')
        leads.forEach((c) => {
          ensureSpace(doc, 80)
          doc
            .font('Helvetica-Bold')
            .fontSize(11.5)
            .fillColor(COLORS.text)
            .text(c.name || 'Unnamed', { continued: false })
          const meta = [c.role_type, c.demographics].filter(Boolean).join('  ·  ')
          if (meta) {
            doc
              .font('Helvetica')
              .fontSize(9.5)
              .fillColor(COLORS.muted)
              .text(meta)
          }
          doc.moveDown(0.25)
          if (c.hook) body(c.hook)
          if (c.why_actor_wants_this) {
            labeledBlock('Why an actor would want this part', c.why_actor_wants_this, COLORS.emerald)
          }
        })
      }

      // ── PACKAGE ANGLES — Pitch + Full only (Pro) ──────────────────
      const pkg = input.evaluation?.package_angles
      if (!isFree && pkg) {
        sectionHeader('Package Angles')
        if (pkg.director_appeal) {
          subhead('Why a director wants this')
          if (pkg.director_appeal.hook) body(pkg.director_appeal.hook)
          if (pkg.director_appeal.fit_profile) {
            labeledBlock('Director fit profile', pkg.director_appeal.fit_profile, COLORS.emerald)
          }
          if (pkg.director_appeal.detail) body(pkg.director_appeal.detail)
        }
        if (pkg.buyer_appeal) {
          subhead('Why a buyer wants this')
          if (pkg.buyer_appeal.tier) {
            doc
              .font('Helvetica-Bold')
              .fontSize(10)
              .fillColor(COLORS.muted)
              .text(pkg.buyer_appeal.tier)
            doc.moveDown(0.2)
          }
          if (pkg.buyer_appeal.lane) body(pkg.buyer_appeal.lane, { color: COLORS.muted })
          if (pkg.buyer_appeal.detail) body(pkg.buyer_appeal.detail)
        }
      }

      // ── DEVELOPMENT PRIORITIES (Full + Free first-bullet) ─────────
      const considerations: any[] = input.evaluation?.considerations ?? []
      if (considerations.length > 0 && (input.scope === 'full' || isFree)) {
        const primary = considerations.find((c) => c.is_primary_lever === true)
        const secondary = considerations.filter((c) => c.is_primary_lever !== true)
        sectionHeader('Development Priorities')
        if (primary) {
          subhead(primary.area || 'Primary lever')
          doc
            .font('Helvetica-Bold')
            .fontSize(8.5)
            .fillColor(COLORS.red)
            .text('PRIMARY LEVER', { characterSpacing: 1.4 })
          doc.moveDown(0.25)
          if (primary.detail) body(primary.detail)
        }
        if (input.scope === 'full') {
          if (input.evaluation?.craft_note) {
            labeledBlock('Craft note', input.evaluation.craft_note, COLORS.emerald)
          }
          secondary.forEach((c) => {
            subhead(c.area || 'Note')
            if (c.detail) body(c.detail)
          })
        } else if (isFree && secondary.length > 0) {
          body(
            `+ ${secondary.length} more development note${secondary.length === 1 ? '' : 's'} unlocked with GEM Pro.`,
            { italic: true, color: COLORS.faint }
          )
        }
      }

      // ── PRODUCTION PLANNING — Full only ───────────────────────────
      const prod = input.evaluation?.production_reality
      if (input.scope === 'full' && prod) {
        sectionHeader('Production Planning')
        if (prod.cast) {
          subhead('Cast')
          const lines: string[] = []
          if (prod.cast.speaking_roles != null) lines.push(`Speaking roles: ${prod.cast.speaking_roles}`)
          if (prod.cast.leads != null) lines.push(`Leads: ${prod.cast.leads}`)
          if (prod.cast.series_regulars) lines.push(`Series regulars: ${prod.cast.series_regulars}`)
          if (prod.cast.child_actors) lines.push(`Child actors: yes`)
          if (Array.isArray(prod.cast.casting_characteristics) && prod.cast.casting_characteristics.length) {
            lines.push(`Casting: ${prod.cast.casting_characteristics.join(', ')}`)
          }
          body(lines.join('\n'))
        }
        if (prod.locations) {
          subhead('Locations & Scale')
          const lines: string[] = []
          if (prod.locations.distinct_count != null) lines.push(`Distinct locations: ${prod.locations.distinct_count}`)
          if (prod.locations.interior_exterior_ratio) lines.push(`Int / Ext: ${prod.locations.interior_exterior_ratio}`)
          if (prod.locations.period_or_contemporary) lines.push(`Era: ${prod.locations.period_or_contemporary}`)
          if (Array.isArray(prod.locations.notable_requirements) && prod.locations.notable_requirements.length) {
            lines.push(`Notable: ${prod.locations.notable_requirements.join(', ')}`)
          }
          body(lines.join('\n'))
        }
        if (prod.technical) {
          subhead('Technical')
          const lines: string[] = []
          if (prod.technical.vfx_level) {
            lines.push(`VFX: ${prod.technical.vfx_level}${prod.technical.vfx_details ? ` — ${prod.technical.vfx_details}` : ''}`)
          }
          if (prod.technical.stunts_level) lines.push(`Stunts: ${prod.technical.stunts_level}`)
          if (prod.technical.sfx_needs) lines.push(`SFX: ${prod.technical.sfx_needs}`)
          if (prod.technical.night_shoots) lines.push(`Night shoots: ${prod.technical.night_shoots}`)
          if (prod.technical.animals) lines.push(`Animals: yes`)
          body(lines.join('\n'))
        }
        if (prod.platform_fit) {
          subhead('Platform & Content')
          const lines: string[] = []
          if (prod.platform_fit.recommended_lane) lines.push(`Lane: ${prod.platform_fit.recommended_lane}`)
          if (prod.platform_fit.content_level) lines.push(`Content: ${prod.platform_fit.content_level}`)
          if (prod.platform_fit.series_engine_or_release_model) {
            lines.push(`Model: ${prod.platform_fit.series_engine_or_release_model}`)
          }
          body(lines.join('\n'))
        }
        if (Array.isArray(prod.rights_flags) && prod.rights_flags.length > 0) {
          subhead('Rights & Clearance')
          for (const r of prod.rights_flags) {
            body(`• ${r.type}: ${r.detail}`)
          }
        }
      }

      // ── NARRATIVE BREAKDOWN — Full only (no weights, just per-dim score + commentary) ─
      const scores = input.evaluation?.scores
      if (input.scope === 'full' && scores && Object.keys(scores).length > 0) {
        sectionHeader('Narrative Breakdown')
        Object.entries(scores).forEach(([key, val]: [string, any]) => {
          if (typeof val?.score !== 'number') return
          ensureSpace(doc, 60)
          const label = key
            .replace(/_and_/g, ' & ')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
          doc
            .font('Helvetica-Bold')
            .fontSize(11)
            .fillColor(COLORS.text)
            .text(`${label}  —  ${val.score}/10`)
          doc.moveDown(0.2)
          if (val.reasoning) body(val.reasoning)
        })
      }

      // ── FOOTER on every page ──────────────────────────────────────
      const range = doc.bufferedPageRange()
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i)
        const bottom = doc.page.height - 36
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(COLORS.faint)
          .text(
            `GEM  ·  gem.studio  ·  ${input.title.slice(0, 60)}`,
            doc.page.margins.left,
            bottom,
            { width: contentWidth(doc), align: 'left', lineBreak: false }
          )
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(COLORS.faint)
          .text(`${i + 1} / ${range.count}`, doc.page.margins.left, bottom, {
            width: contentWidth(doc),
            align: 'right',
            lineBreak: false,
          })
      }

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}

// PDFKit utility helpers
function contentWidth(doc: PdfDoc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right
}
function ensureSpace(doc: PdfDoc, needed: number) {
  const remaining = doc.page.height - doc.page.margins.bottom - doc.y
  if (remaining < needed) doc.addPage()
}
function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}
