import { useEffect, useState } from 'react'
import { createPublicClient, fallback, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

/** Text records people commonly publish on their ENS name. */
export interface EnsRecords {
  github?: string
  twitter?: string
  telegram?: string
  email?: string
  url?: string
}

export interface EnsProfile {
  name: string | null
  avatar: string | null
  records: EnsRecords
}

const NONE: EnsProfile = { name: null, avatar: null, records: {} }

const RECORD_KEYS: Record<keyof EnsRecords, string> = {
  github: 'com.github',
  twitter: 'com.twitter',
  telegram: 'org.telegram',
  email: 'email',
  url: 'url',
}

/** True for something that looks like an ENS name, such as `vitalik.eth`. */
export const isEnsName = (q: string) => /^[^\s@/]+\.eth$/i.test(q.trim())

/** Picks the best way to reach someone from their ENS records, or null when they list none. */
export function contactFromRecords(r: EnsRecords): string | null {
  if (r.telegram) return `tg: @${r.telegram.replace(/^@/, '')}`
  if (r.email) return r.email
  if (r.twitter) return `x: @${r.twitter.replace(/^@/, '')}`
  if (r.github) return `github: ${r.github}`
  return null
}

/** Resolves an ENS name to the address that owns it, or null when it does not resolve. */
export async function resolveEnsName(name: string): Promise<`0x${string}` | null> {
  try {
    return await client.getEnsAddress({ name: normalize(name.trim()) })
  } catch {
    return null
  }
}

async function readRecords(name: string): Promise<EnsRecords> {
  const entries = await Promise.all(
    (Object.entries(RECORD_KEYS) as [keyof EnsRecords, string][]).map(async ([field, key]) => {
      const value = await client.getEnsText({ name, key }).catch(() => null)
      return [field, value] as const
    }),
  )
  const records: EnsRecords = {}
  for (const [field, value] of entries) if (value) records[field] = value
  return records
}

// ENS lives on Ethereum mainnet, so lookups go through a read-only mainnet client.
// The second transport is a fallback in case the default public RPC is rate limited.
const client = createPublicClient({
  chain: mainnet,
  transport: fallback([http(), http('https://ethereum-rpc.publicnode.com')]),
})

const cache = new Map<string, Promise<EnsProfile>>()

/** Reverse-resolves an address to its primary ENS name and avatar. Never throws: no name means no profile. */
export function lookupEns(address: string): Promise<EnsProfile> {
  const key = address.toLowerCase()
  let hit = cache.get(key)
  if (!hit) {
    hit = resolve(address as `0x${string}`)
    cache.set(key, hit)
  }
  return hit
}

async function resolve(address: `0x${string}`): Promise<EnsProfile> {
  try {
    const name = await client.getEnsName({ address })
    if (!name) return NONE
    const [avatar, records] = await Promise.all([client.getEnsAvatar({ name }).catch(() => null), readRecords(name)])
    // Only https images are shown. ipfs:// and data: avatars are skipped.
    return { name, avatar: avatar?.startsWith('https://') ? avatar : null, records }
  } catch {
    return NONE
  }
}

/** The ENS profile for an address, filled in once the lookup finishes. */
export function useEns(address?: string | null): EnsProfile {
  const [state, setState] = useState<{ address?: string | null; profile: EnsProfile }>({ profile: NONE })
  useEffect(() => {
    if (!address) return
    let stale = false
    void lookupEns(address).then((profile) => !stale && setState({ address, profile }))
    return () => {
      stale = true
    }
  }, [address])
  return state.address === address ? state.profile : NONE
}
