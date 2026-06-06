// FREE_MODE: when true, every user is treated as Pro — opens all gates and
// hides all upgrade CTAs. Flip to false to restore the paid model.
export const FREE_MODE = true

export function isProStatus(status?: string | null): boolean {
  return FREE_MODE || status === 'active' || status === 'trialing'
}
