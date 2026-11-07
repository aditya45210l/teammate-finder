import { describe, expect, it } from 'vitest'
import { lookupEns } from './ens'

// Reads real ENS data from Ethereum mainnet through a public RPC (no keys, no writes).
describe('lookupEns (live)', () => {
  it('resolves a known address to its primary name and an https avatar', async () => {
    const profile = await lookupEns('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
    expect(profile.name).toBe('vitalik.eth')
    expect(profile.avatar?.startsWith('https://')).toBe(true)
  }, 30000)

  it('returns an empty profile for an address with no ENS name', async () => {
    expect(await lookupEns('0x000000000000000000000000000000000000dEaD')).toEqual({ name: null, avatar: null })
  }, 30000)

  it('caches lookups so one address is only resolved once', async () => {
    const a = lookupEns('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
    const b = lookupEns('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
    expect(a).toBe(b)
  })
})
