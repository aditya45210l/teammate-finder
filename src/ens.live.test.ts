import { describe, expect, it } from 'vitest'
import { contactFromRecords, isEnsName, lookupEns, resolveEnsName } from './ens'

// Reads real ENS data from Ethereum mainnet through a public RPC (no keys, no writes).
describe('lookupEns (live)', () => {
  it('resolves a known address to its primary name and an https avatar', async () => {
    const profile = await lookupEns('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
    expect(profile.name).toBe('vitalik.eth')
    expect(profile.avatar?.startsWith('https://')).toBe(true)
  }, 30000)

  it('returns an empty profile for an address with no ENS name', async () => {
    expect(await lookupEns('0x000000000000000000000000000000000000dEaD')).toEqual({ name: null, avatar: null, records: {} })
  }, 30000)

  it('caches lookups so one address is only resolved once', async () => {
    const a = lookupEns('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
    const b = lookupEns('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
    expect(a).toBe(b)
  })
})

describe('ENS names and records', () => {
  it('detects ENS-looking input', () => {
    expect(isEnsName('vitalik.eth')).toBe(true)
    expect(isEnsName(' Nick.ETH ')).toBe(true)
    expect(isEnsName('solidity')).toBe(false)
    expect(isEnsName('a b.eth')).toBe(false)
  })

  it('resolves a name to its address, and an unknown name to null', async () => {
    expect(await resolveEnsName('vitalik.eth')).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
    expect(await resolveEnsName('this-name-should-not-exist-teamfinder-123456.eth')).toBeNull()
  }, 30000)

  it('reads text records from a real name', async () => {
    const { records } = await lookupEns('0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5')
    expect(records.github).toBe('arachnid')
    expect(records.twitter).toBeTruthy()
  }, 30000)

  it('picks a contact from records in priority order', () => {
    expect(contactFromRecords({ telegram: '@nick', email: 'a@b.c' })).toBe('tg: @nick')
    expect(contactFromRecords({ email: 'a@b.c', twitter: 'x' })).toBe('a@b.c')
    expect(contactFromRecords({ github: 'arachnid' })).toBe('github: arachnid')
    expect(contactFromRecords({})).toBeNull()
  })
})
