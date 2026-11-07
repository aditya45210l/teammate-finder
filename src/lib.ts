import { LIMITS } from '../shared/constants'
import type { NewPost, Post } from './types'

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

export function timeLeft(seconds: number) {
  const m = Math.round(seconds / 60)
  if (m < 1) return 'expiring'
  if (m < 60) return `${m}m left`
  return `${Math.floor(m / 60)}h ${m % 60}m left`
}

export const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export interface FriendlyError {
  /** A cancelled wallet prompt is not a failure and should not look like one. */
  cancelled: boolean
  title: string
  description: string
}

/** Turns wallet, network and API errors into something a person can act on. */
export function friendlyError(e: unknown, action: string): FriendlyError {
  const err = e as { code?: number | string; name?: string; status?: number; message?: string }
  const text = err?.message ?? String(e)
  if (err?.code === 4001 || err?.code === 'ACTION_REJECTED' || /user (rejected|denied)|rejected the request/i.test(text)) {
    return { cancelled: true, title: 'Cancelled', description: `You cancelled the request in your wallet, so nothing was ${action}.` }
  }
  if (err?.code === -32002) {
    return { cancelled: false, title: 'Wallet is busy', description: 'A request is already open in your wallet. Open it and approve or reject it.' }
  }
  if (/No wallet found/i.test(text)) {
    return { cancelled: false, title: 'No wallet found', description: 'Install MetaMask or another browser wallet, then try again.' }
  }
  if (err?.name === 'ApiError') {
    const status = err.status ?? 0
    if (status === 0) return { cancelled: false, title: "Can't reach the server", description: 'Check your connection and try again.' }
    if (status === 401) return { cancelled: false, title: 'Signature not accepted', description: 'Sign the message again. If your clock is wrong, fix it and retry.' }
    if (status === 404 && action === 'deleted') return { cancelled: false, title: 'Post not found', description: 'It may have expired, or it belongs to another wallet.' }
    if (status === 404) return { cancelled: false, title: 'Server not available', description: 'The API is not reachable at this address. Try demo data, or come back later.' }
    if (status === 400) return { cancelled: false, title: 'Check the form', description: text }
    if (status === 429) return { cancelled: false, title: 'Slow down', description: 'Too many requests. Wait a moment and try again.' }
    if (status >= 500) return { cancelled: false, title: 'Server problem', description: 'The server had a problem. Try again in a moment.' }
  }
  return { cancelled: false, title: 'Something went wrong', description: text }
}

export function filterBySkill(posts: Post[], search: string) {
  const q = search.trim().toLowerCase()
  return q ? posts.filter((p) => p.skills.toLowerCase().includes(q)) : posts
}

const FIELDS: [keyof typeof LIMITS, string][] = [
  ['name', 'Name'],
  ['skills', 'Skills'],
  ['note', 'Note'],
  ['contact', 'Contact'],
]

/** Per-field problems for the post form. Empty when the post can be published. */
export function fieldErrors(post: NewPost): Partial<Record<keyof NewPost, string>> {
  const errors: Partial<Record<keyof NewPost, string>> = {}
  if (!post.name.trim()) errors.name = 'Tell people your name'
  if (!post.contact.trim()) errors.contact = 'Add a way to reach you'
  for (const [key, label] of FIELDS) {
    if (!errors[key] && post[key].length > LIMITS[key]) errors[key] = `${label} is too long (max ${LIMITS[key]} characters)`
  }
  return errors
}

/** Returns an error message, or null when the post can be published. */
export function validatePost(post: NewPost): string | null {
  if (!post.name.trim()) return 'Name is required'
  if (!post.contact.trim()) return 'Contact is required'
  for (const [key, label] of FIELDS) {
    if (post[key].length > LIMITS[key]) return `${label} is too long (max ${LIMITS[key]} characters)`
  }
  return null
}

export function filterPosts(posts: Post[], { need, role }: { need?: string; role?: string }) {
  return posts.filter((p) => (!need || p.lookingFor === need) && (!role || p.role === role))
}

/** The role that the most visible posts are looking for, or null when there are none. */
export function mostWanted(posts: Post[]): string | null {
  const counts = new Map<string, number>()
  for (const p of posts) counts.set(p.lookingFor, (counts.get(p.lookingFor) ?? 0) + 1)
  let best: string | null = null
  for (const [role, n] of counts) if (best === null || n > counts.get(best)!) best = role
  return best
}
