// POST /api/validate-pdf
//
// Lightweight pre-check: accepts a PDF file, extracts text via pdf-parse,
// and returns whether the file is readable enough for evaluation.
// Called BEFORE start-submission so the user sees the error immediately
// while still looking at the upload UI — not after the card is already
// on their dashboard.
//
// Returns:
//   { valid: true,  word_count: number, page_estimate: number }
//   { valid: false, reason: string }

import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 15

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { valid: false, reason: "No file provided" },
        { status: 400 }
      )
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { valid: false, reason: "Only PDF files are accepted" },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { valid: false, reason: "File too large (max 10 MB)" },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let text: string
    let numPages: number
    try {
      const pdfParse = (await import("pdf-parse")).default
      const data = await pdfParse(buffer)
      text = data.text?.trim() ?? ""
      numPages = data.numpages ?? 0
    } catch (parseErr: any) {
      // pdf-parse throws on corrupt / encrypted / malformed PDFs
      const msg = parseErr?.message ?? ""
      if (msg.includes("bad XRef") || msg.includes("Invalid PDF")) {
        return NextResponse.json({
          valid: false,
          reason: "This PDF appears to be damaged or in an unsupported format. Try re-exporting it from your writing software.",
        })
      }
      return NextResponse.json({
        valid: false,
        reason: "We couldn't read this file. Make sure it's a standard PDF exported from your writing software.",
      })
    }

    // Same checks as score-submission's extractPdfText
    const words = text
      .replace(/\s+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2)
    const readableChars = text.replace(/[^a-zA-Z0-9 .,;:'"!?()\-\n]/g, "")
    const ratio = text.length > 0 ? readableChars.length / text.length : 0

    if (words.length < 500 || ratio < 0.75) {
      // Distinguish between "actually scanned" and "too short"
      if (ratio < 0.75 && words.length > 100) {
        return NextResponse.json({
          valid: false,
          reason:
            "This looks like a scanned PDF (image-based). We need a text-based PDF — export directly from Final Draft, WriterSolo, Highland, or Google Docs.",
        })
      }
      if (words.length < 500) {
        return NextResponse.json({
          valid: false,
          reason:
            "This file doesn't contain enough text for a full evaluation. Make sure you're uploading a complete screenplay or pilot script.",
        })
      }
      return NextResponse.json({
        valid: false,
        reason:
          "We couldn't extract readable text from this PDF. Try re-exporting it from your writing software as a text-based PDF.",
      })
    }

    return NextResponse.json({
      valid: true,
      word_count: words.length,
      page_estimate: numPages || Math.round(words.length / 250),
    })
  } catch (e: any) {
    console.error("validate-pdf error:", e)
    return NextResponse.json(
      { valid: false, reason: "Something went wrong checking your file. Please try again." },
      { status: 500 }
    )
  }
}
