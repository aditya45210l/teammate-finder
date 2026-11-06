import { MAX_STRING_BYTES } from '@arkiv-network/sdk'
import type { NewPost, Post } from './arkiv/api'

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

export function timeLeft(seconds: number) {
  const m = Math.round(seconds / 60)
  if (m < 1) return 'expiring'
  if (m < 60) return `${m}m left`
  return `${Math.floor(m / 60)}h ${m % 60}m left`
}

export const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function filterBySkill(posts: Post[], search: string) {
  const q = search.trim().toLowerCase()
  return q ? posts.filter((p) => p.skills.toLowerCase().includes(q)) : posts
}

/** Arkiv strings are capped in bytes, not characters. */
export const byteLength = (s: string) => new TextEncoder().encode(s).length

const FIELDS: [keyof NewPost, string][] = [
  ['name', 'Name'],
  ['skills', 'Skills'],
  ['note', 'Note'],
  ['contact', 'Contact'],
]

/** Returns an error message, or null when the post can be published. */
export function validatePost(post: NewPost): string | null {
  if (!post.name.trim()) return 'Name is required'
  if (!post.contact.trim()) return 'Contact is required'
  for (const [key, label] of FIELDS) {
    if (byteLength(post[key]) > MAX_STRING_BYTES) return `${label} is too long (max ${MAX_STRING_BYTES} bytes)`
  }
  return null
}

export function filterPosts(posts: Post[], { need, role }: { need?: string; role?: string }) {
  return posts.filter((p) => (!need || p.lookingFor === need) && (!role || p.role === role))
}
