/**
 * Minimal class joiner.
 *
 * Deliberately not clsx + tailwind-merge: two dependencies, ~8 kB, to solve a
 * conflict problem this codebase avoids by not passing competing utilities to
 * the same element. Later-listed classes win in the CSS, as always.
 */
export type ClassValue = string | number | null | undefined | false | ClassValue[]

export function cn(...values: ClassValue[]): string {
  const out: string[] = []
  const walk = (v: ClassValue) => {
    if (!v) return
    if (Array.isArray(v)) {
      v.forEach(walk)
      return
    }
    out.push(String(v))
  }
  values.forEach(walk)
  return out.join(' ')
}
