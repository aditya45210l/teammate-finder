import { describe, expect, it } from 'vitest'
import { listPosts } from './api'

// Read-only smoke test against the live Arkiv testnet. Skipped without an access key.
const hasKey = !!import.meta.env.VITE_ARKIV_ACCESS_KEY

describe.skipIf(!hasKey)('listPosts (live)', () => {
  it('queries with no filter', async () => {
    expect(Array.isArray(await listPosts())).toBe(true)
  }, 30000)
  it('queries with one filter', async () => {
    expect(Array.isArray(await listPosts({ need: 'contracts' }))).toBe(true)
  }, 30000)
  it('queries with both filters', async () => {
    expect(Array.isArray(await listPosts({ need: 'contracts', role: 'frontend' }))).toBe(true)
  }, 30000)
})
