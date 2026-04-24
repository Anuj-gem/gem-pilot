// Server-side PDF generator for the report. Built on pdf-lib (pure JS — no
// native deps, no font data files to bundle, works on Vercel serverless out
// of the box). Replaces the earlier pdfkit implementation, which kept
// failing on Vercel because Next's bundler strips pdfkit's .afm font data.
//
// Three render scopes (same as before):
//   - 'pitch'  — top card + Why this is a hit + Lead Characters + Package Angles
//   - 'full'   — pitch sections + Production Planning + Dev Priorities + Narrative Breakdown
//   - 'free'   — same skeleton as pitch, but ONLY the unblurred pieces a free
//                writer can read on their own report (top card + bullet 01 of
//                Why this is a hit + Primary Lever from Dev Priorities)
//
// pdf-lib has no auto-cursor or text-wrapping — we hand-roll both via the
// `Layout` helper below. Page coordinates in pdf-lib are bottom-left origin,
// but everything in this file uses a top-down `y` cursor that gets
// translated at draw time to keep the code readable.
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from 'pdf-lib'

export type PdfScope = 'pitch' | 'full' | 'free'

interface PdfInput {
  title: string
  authorName: string | null
  declaredFormat: string | null
  postedAt: string | null
  evaluation: any
  scope: PdfScope
}

// Page geometry (US Letter)
const PAGE_W = 612
const PAGE_H = 792
const MARGIN_X = 60
const MARGIN_TOP = 64
const MARGIN_BOTTOM = 72
const CONTENT_W = PAGE_W - MARGIN_X * 2

// Color palette — pdf-lib uses 0..1 RGB
const C = {
  text: rgb(0x11 / 255, 0x18 / 255, 0x27 / 255),
  body: rgb(0x37 / 255, 0x41 / 255, 0x51 / 255),
  muted: rgb(0x6b / 255, 0x72 / 255, 0x80 / 255),
  faint: rgb(0x9c / 255, 0xa3 / 255, 0xaf / 255),
  gold: rgb(0xd4 / 255, 0xa0 / 255, 0x17 / 255),
  goldDark: rgb(0x92 / 255, 0x71 / 255, 0x0f / 255),
  emerald: rgb(0x05 / 255, 0x96 / 255, 0x69 / 255),
  red: rgb(0xdc / 255, 0x26 / 255, 0x26 / 255),
  divider: rgb(0xe5 / 255, 0xe7 / 255, 0xeb / 255),
  accent: rgb(0x7c / 255, 0x3a / 255, 0xed / 255), // GEM purple — diamond mark
  white: rgb(1, 1, 1),
}

// Layout state — page-aware top-down cursor that mimics the pdfkit feel.
// We hold refs to fonts so callers don't pass them every time.
interface Layout {
  doc: PDFDocument
  page: PDFPage
  pageNumber: number
  y: number // top-down y (pixels from page top)
  fonts: { regular: PDFFont; bold: PDFFont; oblique: PDFFont; boldOblique: PDFFont }
  title: string // captured for footers
}

// Convert a top-down y to pdf-lib's bottom-left origin
function toPdfY(layout: Layout, topDownY: number, height = 0) {
  return PAGE_H - topDownY - height
}

// Word-wrap a string to fit `maxWidth` in points at the given font/size.
// Splits on whitespace, never within a word — simple and good enough for
// our copy. Returns the lines as an array.
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = []
  const paragraphs = String(text).split(/\n/)
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      out.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      const w = font.widthOfTextAtSize(candidate, size)
      if (w <= maxWidth) {
        line = candidate
      } else {
        if (line) out.push(line)
        // If a single word is wider than maxWidth, push it anyway (won't break inside)
        line = word
      }
    }
    if (line) out.push(line)
  }
  return out
}

// Draw wrapped text starting at the layout's current y. Auto-page-breaks
// when content would run past the bottom margin. Returns the new y.
function drawWrapped(
  layout: Layout,
  text: string,
  opts: {
    font: PDFFont
    size: number
    color: any
    lineHeight?: number
    x?: number
    maxWidth?: number
    spaceAfter?: number
  }
) {
  if (!text) return
  const x = opts.x ?? MARGIN_X
  const maxWidth = opts.maxWidth ?? CONTENT_W
  const lineHeight = opts.lineHeight ?? opts.size * 1.4
  const lines = wrapText(text, opts.font, opts.size, maxWidth)
  for (const line of lines) {
    ensureSpace(layout, lineHeight)
    layout.page.drawText(line, {
      x,
      y: toPdfY(layout, layout.y + opts.size, 0),
      font: opts.font,
      size: opts.size,
      color: opts.color,
    })
    layout.y += lineHeight
  }
  if (opts.spaceAfter) layout.y += opts.spaceAfter
}

// Reserve vertical room. If the requested height won't fit, start a new page.
function ensureSpace(layout: Layout, needed: number) {
  if (layout.y + needed > PAGE_H - MARGIN_BOTTOM) {
    addPage(layout)
  }
}

function addPage(layout: Layout) {
  const newPage = layout.doc.addPage([PAGE_W, PAGE_H])
  layout.page = newPage
  layout.pageNumber += 1
  layout.y = MARGIN_TOP
  // Footer is drawn at end (we know total page count then).
}

// Section header — small gold rule + uppercase label
function sectionHeader(layout: Layout, label: string) {
  ensureSpace(layout, 50)
  layout.y += 8
  // Gold rule
  layout.page.drawRectangle({
    x: MARGIN_X,
    y: toPdfY(layout, layout.y + 2, 0),
    width: 28,
    height: 1.5,
    color: C.gold,
  })
  layout.y += 10
  // Label
  drawWrapped(layout, label.toUpperCase(), {
    font: layout.fonts.bold,
    size: 12,
    color: C.text,
    lineHeight: 16,
    spaceAfter: 8,
  })
}

function subhead(layout: Layout, text: string) {
  ensureSpace(layout, 22)
  drawWrapped(layout, text, {
    font: layout.fonts.bold,
    size: 13,
    color: C.text,
    lineHeight: 17,
    spaceAfter: 4,
  })
}

function body(layout: Layout, text: string, color = C.body, font?: PDFFont) {
  drawWrapped(layout, text, {
    font: font ?? layout.fonts.regular,
    size: 10.5,
    color,
    lineHeight: 14.5,
    spaceAfter: 8,
  })
}

function divider(layout: Layout) {
  layout.y += 6
  layout.page.drawLine({
    start: { x: MARGIN_X, y: toPdfY(layout, layout.y, 0) },
    end: { x: PAGE_W - MARGIN_X, y: toPdfY(layout, layout.y, 0) },
    thickness: 0.5,
    color: C.divider,
  })
  layout.y += 12
}

// Numbered "Why this is a hit" list item — number on the left, title +
// optional body text on the right.
function numberedItem(layout: Layout, n: number, title: string, content: string) {
  ensureSpace(layout, 50)
  const startY = layout.y
  // Number
  layout.page.drawText(String(n).padStart(2, '0'), {
    x: MARGIN_X,
    y: toPdfY(layout, startY + 11.5, 0),
    font: layout.fonts.bold,
    size: 10,
    color: C.gold,
  })
  // Title
  const titleX = MARGIN_X + 22
  const titleW = CONTENT_W - 22
  const titleLines = wrapText(title, layout.fonts.bold, 11.5, titleW)
  let cursorY = startY
  for (const line of titleLines) {
    layout.page.drawText(line, {
      x: titleX,
      y: toPdfY(layout, cursorY + 11.5, 0),
      font: layout.fonts.bold,
      size: 11.5,
      color: C.text,
    })
    cursorY += 15
  }
  layout.y = cursorY + 4
  // Body
  if (content) {
    const bodyLines = wrapText(content, layout.fonts.regular, 10.5, titleW)
    for (const line of bodyLines) {
      ensureSpace(layout, 14.5)
      layout.page.drawText(line, {
        x: titleX,
        y: toPdfY(layout, layout.y + 10.5, 0),
        font: layout.fonts.regular,
        size: 10.5,
        color: C.body,
      })
      layout.y += 14.5
    }
  }
  layout.y += 10
}

// Labeled emerald-tinted block (used for "Why an actor wants this" + craft notes)
function labeledBlock(layout: Layout, label: string, value: string, accentColor = C.emerald) {
  ensureSpace(layout, 50)
  drawWrapped(layout, label.toUpperCase(), {
    font: layout.fonts.bold,
    size: 9,
    color: accentColor,
    lineHeight: 12,
    spaceAfter: 3,
  })
  drawWrapped(layout, value, {
    font: layout.fonts.regular,
    size: 10.5,
    color: C.text,
    lineHeight: 14.5,
    spaceAfter: 10,
  })
}

// ── Brand mark (page 1 top-right) ─────────────────────────────────
// Small purple diamond + GEM wordmark. Drawn on page 1 only — subsequent
// pages get the wordmark in the footer.
function drawBrandMark(layout: Layout) {
  const baseY = MARGIN_TOP - 18
  // Diamond — drawn as a rotated square via four lines forming a diamond
  const cx = PAGE_W - MARGIN_X - 30
  const cy = toPdfY(layout, baseY, 0) + 4
  const size = 6
  layout.page.drawRectangle({
    x: cx - size / 2,
    y: cy - size / 2,
    width: size,
    height: size,
    color: C.accent,
    rotate: degrees(45),
  })
  // GEM wordmark
  layout.page.drawText('GEM', {
    x: PAGE_W - MARGIN_X - 22,
    y: toPdfY(layout, baseY, 0),
    font: layout.fonts.bold,
    size: 10,
    color: C.text,
  })
}

// ── Footer (every page) ─────────────────────────────────────────────
// Drawn after all content is laid out so we know totalPages for "Page X of Y".
function drawFooters(doc: PDFDocument, fonts: Layout['fonts'], title: string) {
  const pages = doc.getPages()
  const total = pages.length
  pages.forEach((page, idx) => {
    const pageNum = idx + 1
    // Divider line
    page.drawLine({
      start: { x: MARGIN_X, y: 50 },
      end: { x: PAGE_W - MARGIN_X, y: 50 },
      thickness: 0.5,
      color: C.divider,
    })
    // Left: GEM · gem.studio · title
    const titleSlice = title.length > 50 ? title.slice(0, 47) + '...' : title
    page.drawText(`GEM  -  gem.studio  -  ${titleSlice}`, {
      x: MARGIN_X,
      y: 36,
      font: fonts.regular,
      size: 8,
      color: C.faint,
    })
    // Right: Page X of Y
    const pageLabel = `Page ${pageNum} of ${total}`
    const pageLabelWidth = fonts.regular.widthOfTextAtSize(pageLabel, 8)
    page.drawText(pageLabel, {
      x: PAGE_W - MARGIN_X - pageLabelWidth,
      y: 36,
      font: fonts.regular,
      size: 8,
      color: C.faint,
    })
  })
}

export async function generateReportPdf(input: PdfInput): Promise<Buffer> {
  const doc = await PDFDocument.create()
  doc.setTitle(`${input.title} - GEM Report`)
  doc.setAuthor('GEM')
  doc.setProducer('GEM (gem.studio)')
  doc.setCreator('GEM (gem.studio)')

  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    oblique: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldOblique: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  }

  const firstPage = doc.addPage([PAGE_W, PAGE_H])
  const layout: Layout = {
    doc,
    page: firstPage,
    pageNumber: 1,
    y: MARGIN_TOP,
    fonts,
    title: input.title,
  }

  // ── Brand mark on page 1 (top-right) ──────────────────────────────
  drawBrandMark(layout)

  // ── Cover / top card ──────────────────────────────────────────────
  // Title — wraps if long, leaves room on the right for the brand mark.
  drawWrapped(layout, input.title, {
    font: fonts.bold,
    size: 28,
    color: C.text,
    lineHeight: 32,
    maxWidth: CONTENT_W - 60, // leave room for brand mark
    spaceAfter: 8,
  })

  // Meta line — author / format / genre / date
  const metaParts: string[] = []
  if (input.authorName) metaParts.push(`By ${input.authorName}`)
  if (input.declaredFormat) metaParts.push(input.declaredFormat)
  const cls = input.evaluation?.classification
  if (cls?.genre_primary) metaParts.push(cls.genre_primary)
  if (input.postedAt) metaParts.push(`Posted ${formatDate(input.postedAt)}`)
  if (metaParts.length > 0) {
    drawWrapped(layout, metaParts.join('  -  '), {
      font: fonts.regular,
      size: 10.5,
      color: C.muted,
      lineHeight: 14,
      spaceAfter: 18,
    })
  }

  // Headline card — gold left rule + label + the line itself
  const headline =
    input.evaluation?.positioning_hook ||
    input.evaluation?.whats_special?.headline ||
    ''
  if (headline) {
    const blockStartY = layout.y
    const labelHeight = 14
    const textX = MARGIN_X + 12
    const textW = CONTENT_W - 12
    // Label
    layout.page.drawText('HEADLINE', {
      x: textX,
      y: toPdfY(layout, layout.y + 9, 0),
      font: fonts.bold,
      size: 9,
      color: C.goldDark,
    })
    layout.y += labelHeight + 2
    // Body — italic
    drawWrapped(layout, headline, {
      font: fonts.oblique,
      size: 13.5,
      color: C.text,
      lineHeight: 19,
      x: textX,
      maxWidth: textW,
      spaceAfter: 4,
    })
    // Gold left rule — drawn now that we know block height
    const blockHeight = layout.y - blockStartY - 4
    layout.page.drawRectangle({
      x: MARGIN_X,
      y: toPdfY(layout, blockStartY, 0) - blockHeight,
      width: 3,
      height: blockHeight,
      color: C.gold,
    })
    layout.y += 12
  }
  divider(layout)

  const isFree = input.scope === 'free'

  // ── WHY THIS IS A HIT ─────────────────────────────────────────────
  const strengths: any[] = input.evaluation?.whats_special?.strengths ?? []
  if (strengths.length > 0) {
    sectionHeader(layout, 'Why this is a hit')
    const subtitleHeadline = input.evaluation?.whats_special?.headline
    if (subtitleHeadline && subtitleHeadline !== headline) {
      body(layout, subtitleHeadline)
    }
    const items = isFree ? strengths.slice(0, 1) : strengths
    items.forEach((s, i) => {
      numberedItem(layout, i + 1, s.dimension_or_area || `Strength ${i + 1}`, s.what_it_means || '')
    })
    if (isFree && strengths.length > 1) {
      drawWrapped(layout, `+ ${strengths.length - 1} more strength${strengths.length - 1 === 1 ? '' : 's'} unlocked with GEM Pro.`, {
        font: fonts.oblique,
        size: 10,
        color: C.faint,
        lineHeight: 14,
        spaceAfter: 8,
      })
    }
  }

  // ── LEAD CHARACTERS — Pitch + Full only ───────────────────────────
  const leads: any[] = input.evaluation?.lead_characters ?? []
  if (!isFree && leads.length > 0) {
    sectionHeader(layout, 'Lead Characters')
    leads.forEach((c) => {
      ensureSpace(layout, 80)
      subhead(layout, c.name || 'Unnamed')
      const meta = [c.role_type, c.demographics].filter(Boolean).join('  -  ')
      if (meta) {
        drawWrapped(layout, meta, {
          font: fonts.regular,
          size: 9.5,
          color: C.muted,
          lineHeight: 12,
          spaceAfter: 4,
        })
      }
      if (c.hook) body(layout, c.hook)
      if (c.why_actor_wants_this) {
        labeledBlock(layout, 'Why an actor would want this part', c.why_actor_wants_this, C.emerald)
      }
    })
  }

  // ── PACKAGE ANGLES — Pitch + Full only ────────────────────────────
  const pkg = input.evaluation?.package_angles
  if (!isFree && pkg) {
    sectionHeader(layout, 'Package Angles')
    if (pkg.director_appeal) {
      subhead(layout, 'Why a director wants this')
      if (pkg.director_appeal.hook) body(layout, pkg.director_appeal.hook)
      if (pkg.director_appeal.fit_profile) {
        labeledBlock(layout, 'Director fit profile', pkg.director_appeal.fit_profile, C.emerald)
      }
      if (pkg.director_appeal.detail) body(layout, pkg.director_appeal.detail)
    }
    if (pkg.buyer_appeal) {
      subhead(layout, 'Why a buyer wants this')
      if (pkg.buyer_appeal.tier) {
        drawWrapped(layout, pkg.buyer_appeal.tier, {
          font: fonts.bold,
          size: 10,
          color: C.muted,
          lineHeight: 13,
          spaceAfter: 4,
        })
      }
      if (pkg.buyer_appeal.lane) body(layout, pkg.buyer_appeal.lane, C.muted)
      if (pkg.buyer_appeal.detail) body(layout, pkg.buyer_appeal.detail)
    }
  }

  // ── DEVELOPMENT PRIORITIES (Full + Free first-bullet) ─────────────
  const considerations: any[] = input.evaluation?.considerations ?? []
  if (considerations.length > 0 && (input.scope === 'full' || isFree)) {
    const primary = considerations.find((c) => c.is_primary_lever === true)
    const secondary = considerations.filter((c) => c.is_primary_lever !== true)
    sectionHeader(layout, 'Development Priorities')
    if (primary) {
      subhead(layout, primary.area || 'Primary lever')
      drawWrapped(layout, 'PRIMARY LEVER', {
        font: fonts.bold,
        size: 9,
        color: C.red,
        lineHeight: 12,
        spaceAfter: 4,
      })
      if (primary.detail) body(layout, primary.detail)
    }
    if (input.scope === 'full') {
      if (input.evaluation?.craft_note) {
        labeledBlock(layout, 'Craft note', input.evaluation.craft_note, C.emerald)
      }
      secondary.forEach((c) => {
        subhead(layout, c.area || 'Note')
        if (c.detail) body(layout, c.detail)
      })
    } else if (isFree && secondary.length > 0) {
      drawWrapped(layout, `+ ${secondary.length} more development note${secondary.length === 1 ? '' : 's'} unlocked with GEM Pro.`, {
        font: fonts.oblique,
        size: 10,
        color: C.faint,
        lineHeight: 14,
        spaceAfter: 8,
      })
    }
  }

  // ── PRODUCTION PLANNING — Full only ───────────────────────────────
  const prod = input.evaluation?.production_reality
  if (input.scope === 'full' && prod) {
    sectionHeader(layout, 'Production Planning')
    if (prod.cast) {
      subhead(layout, 'Cast')
      const lines: string[] = []
      if (prod.cast.speaking_roles != null) lines.push(`Speaking roles: ${prod.cast.speaking_roles}`)
      if (prod.cast.leads != null) lines.push(`Leads: ${prod.cast.leads}`)
      if (prod.cast.series_regulars) lines.push(`Series regulars: ${prod.cast.series_regulars}`)
      if (prod.cast.child_actors) lines.push('Child actors: yes')
      if (Array.isArray(prod.cast.casting_characteristics) && prod.cast.casting_characteristics.length) {
        lines.push(`Casting: ${prod.cast.casting_characteristics.join(', ')}`)
      }
      body(layout, lines.join('\n'))
    }
    if (prod.locations) {
      subhead(layout, 'Locations & Scale')
      const lines: string[] = []
      if (prod.locations.distinct_count != null) lines.push(`Distinct locations: ${prod.locations.distinct_count}`)
      if (prod.locations.interior_exterior_ratio) lines.push(`Int / Ext: ${prod.locations.interior_exterior_ratio}`)
      if (prod.locations.period_or_contemporary) lines.push(`Era: ${prod.locations.period_or_contemporary}`)
      if (Array.isArray(prod.locations.notable_requirements) && prod.locations.notable_requirements.length) {
        lines.push(`Notable: ${prod.locations.notable_requirements.join(', ')}`)
      }
      body(layout, lines.join('\n'))
    }
    if (prod.technical) {
      subhead(layout, 'Technical')
      const lines: string[] = []
      if (prod.technical.vfx_level) {
        lines.push(`VFX: ${prod.technical.vfx_level}${prod.technical.vfx_details ? ' - ' + prod.technical.vfx_details : ''}`)
      }
      if (prod.technical.stunts_level) lines.push(`Stunts: ${prod.technical.stunts_level}`)
      if (prod.technical.sfx_needs) lines.push(`SFX: ${prod.technical.sfx_needs}`)
      if (prod.technical.night_shoots) lines.push(`Night shoots: ${prod.technical.night_shoots}`)
      if (prod.technical.animals) lines.push('Animals: yes')
      body(layout, lines.join('\n'))
    }
    if (prod.platform_fit) {
      subhead(layout, 'Platform & Content')
      const lines: string[] = []
      if (prod.platform_fit.recommended_lane) lines.push(`Lane: ${prod.platform_fit.recommended_lane}`)
      if (prod.platform_fit.content_level) lines.push(`Content: ${prod.platform_fit.content_level}`)
      if (prod.platform_fit.series_engine_or_release_model) {
        lines.push(`Model: ${prod.platform_fit.series_engine_or_release_model}`)
      }
      body(layout, lines.join('\n'))
    }
    if (Array.isArray(prod.rights_flags) && prod.rights_flags.length > 0) {
      subhead(layout, 'Rights & Clearance')
      for (const r of prod.rights_flags) {
        body(layout, `- ${r.type}: ${r.detail}`)
      }
    }
  }

  // ── NARRATIVE BREAKDOWN — Full only ───────────────────────────────
  const scores = input.evaluation?.scores
  if (input.scope === 'full' && scores && Object.keys(scores).length > 0) {
    sectionHeader(layout, 'Narrative Breakdown')
    Object.entries(scores).forEach(([key, val]: [string, any]) => {
      if (typeof val?.score !== 'number') return
      const label = key
        .replace(/_and_/g, ' & ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
      subhead(layout, `${label}  -  ${val.score}/10`)
      if (val.reasoning) body(layout, val.reasoning)
    })
  }

  // ── Footers (drawn last so we know total page count) ──────────────
  drawFooters(doc, fonts, input.title)

  const bytes = await doc.save()
  return Buffer.from(bytes)
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}
