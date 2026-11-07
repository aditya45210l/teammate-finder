export const ROLES = ['frontend', 'backend', 'contracts', 'design', 'product', 'other'] as const
export type Role = (typeof ROLES)[number]

export const POST_LIFETIME_HOURS = 24

/** Maximum characters per field. The server enforces the same limits. */
export const LIMITS = { name: 80, skills: 200, note: 500, contact: 120 } as const
