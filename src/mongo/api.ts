import { createWalletClient, custom, type Address } from 'viem'
import { createMessage, deleteMessage } from '../../shared/auth'
import { ApiError } from '../errors'
import type { Filters, NewPost, Post } from '../types'

type Ethereum = { request(args: { method: string; params?: unknown[] }): Promise<unknown> }
const ethereum = () => (window as unknown as { ethereum?: Ethereum }).ethereum

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...init, headers: { 'Content-Type': 'application/json' } })
  } catch {
    throw new ApiError(0, 'Network error')
  }
  if (res.status === 204) return undefined as T
  // A missing API on the host returns an HTML page, not JSON.
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`)
  return data as T
}

export function listPosts({ need, role }: Filters = {}): Promise<Post[]> {
  const params = new URLSearchParams()
  if (need) params.set('need', need)
  if (role) params.set('role', role)
  const qs = params.toString()
  return call<Post[]>(`/posts${qs ? `?${qs}` : ''}`)
}

/** The account the wallet already shares with this site, without opening a prompt. */
export async function getConnectedAccount(): Promise<Address | null> {
  const eth = ethereum()
  if (!eth) return null
  try {
    const [account] = (await eth.request({ method: 'eth_accounts' })) as Address[]
    return account ?? null
  } catch {
    return null
  }
}

/** Plain account connection: posts are signed messages, so no chain switch is needed. */
export async function connectAccount(): Promise<Address> {
  const eth = ethereum()
  if (!eth) throw new Error('No wallet found. Install MetaMask or another browser wallet.')
  const [account] = (await eth.request({ method: 'eth_requestAccounts' })) as Address[]
  return account
}

function signer(account: Address) {
  const eth = ethereum()
  if (!eth) throw new Error('No wallet found.')
  return createWalletClient({ transport: custom(eth), account })
}

export async function createPost(account: Address, post: NewPost): Promise<string> {
  const timestamp = Date.now()
  const signature = await signer(account).signMessage({ message: createMessage(account, timestamp) })
  const { key } = await call<{ key: string }>('/posts', {
    method: 'POST',
    body: JSON.stringify({ ...post, address: account, timestamp, signature }),
  })
  return key
}

export async function deletePost(account: Address, id: string): Promise<void> {
  const timestamp = Date.now()
  const signature = await signer(account).signMessage({ message: deleteMessage(account, id, timestamp) })
  await call(`/posts/${id}`, { method: 'DELETE', body: JSON.stringify({ address: account, timestamp, signature }) })
}
