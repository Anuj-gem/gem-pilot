// Simple client-side store for passing a File across client-side navigation.
// Works because Next.js router.push() doesn't do a full page reload —
// the module state persists in the same JS context.

let pendingFile: File | null = null

export function setPendingFile(file: File) {
  pendingFile = file
}

export function getPendingFile(): File | null {
  const f = pendingFile
  pendingFile = null // consume once
  return f
}
