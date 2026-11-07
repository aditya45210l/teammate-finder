import { useEffect, useState } from 'react'
import { createPublicClient, fallback, http } from 'viem'
import { mainnet } from 'viem/chains'

export interface EnsProfile {
  name: string | null
  avatar: string | null
}

const NONE: EnsProfile = { name: null, avatar: null }

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
    const avatar = await client.getEnsAvatar({ name }).catch(() => null)
    // Only https images are shown. ipfs:// and data: avatars are skipped.
    return { name, avatar: avatar?.startsWith('https://') ? avatar : null }
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
