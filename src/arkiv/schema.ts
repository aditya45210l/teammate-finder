import { addr, defineSchema, str } from '@arkiv-network/sdk/schema'

export const ROLES = ['frontend', 'backend', 'contracts', 'design', 'product', 'other'] as const
export type Role = (typeof ROLES)[number]

export const TeammatePosts = defineSchema('mumbai-teammate-v1', {
  author: addr().indexed(),
  role: str().indexed(),
  lookingFor: str().indexed(),
  name: str(),
  skills: str(),
  note: str(),
  contact: str(),
})

export const POST_LIFETIME_HOURS = 24
