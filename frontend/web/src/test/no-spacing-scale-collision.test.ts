import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// tailwind.config.ts's theme.extend.spacing defines xs/sm/md/lg/xl. Tailwind
// merges the `spacing` scale into width/height/maxWidth/minWidth/inset/
// top/right/bottom/left, so an un-arbitrary w-sm/max-w-lg/inset-md/etc.
// silently resolves to our tiny space-* token instead of Tailwind's own
// (much larger) named scale for that utility — e.g. `max-w-sm` became 8px
// instead of Tailwind's default 24rem. Bracket/arbitrary values
// (`max-w-[24rem]`) are unaffected and stay allowed.
const COLLIDING_PATTERN =
  /\b(?:w|h|min-w|min-h|max-w|max-h|inset|top|right|bottom|left|size)-(?:xs|sm|md|lg|xl)\b/

describe('no width/height/inset utilities collide with the custom spacing scale', () => {
  const files = globSync('src/**/*.{ts,tsx}', { cwd: path.resolve(__dirname, '../..') }).filter(
    (f) => !f.endsWith('no-spacing-scale-collision.test.ts'),
  )

  it.each(files)('%s has no colliding utility class', (relativePath) => {
    const fullPath = path.resolve(__dirname, '../..', relativePath)
    const content = readFileSync(fullPath, 'utf-8')
    const match = content.match(COLLIDING_PATTERN)
    expect(match, `${relativePath} uses "${match?.[0]}" — use an arbitrary value instead`).toBeNull()
  })
})
