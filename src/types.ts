import type { Address } from 'viem'

export interface Post {
  key: string
  owner: Address
  author: Address
  role: string
  lookingFor: string
  name: string
  skills: string
  note: string
  contact: string
  /** Estimated seconds until the post expires. */
  secondsLeft: number
}

export interface NewPost {
  role: string
  lookingFor: string
  name: string
  skills: string
  note: string
  contact: string
}

export interface Filters {
  /** Filter on the `lookingFor` column ("I need a ..."). */
  need?: string
  /** Filter on the `role` column ("Posted by a ..."). */
  role?: string
}
