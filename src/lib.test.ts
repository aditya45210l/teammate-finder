import { describe, expect, it } from 'vitest'
import type { NewPost, Post } from './types'
import { DEMO_POSTS } from './demoPosts'
import { filterBySkill, filterPosts, mostWanted, short, timeLeft, validatePost } from './lib'

const valid: NewPost = { role: 'frontend', lookingFor: 'contracts', name: 'Asha', skills: 'react', note: 'hi', contact: 'tg: @a' }
const post = (skills: string) => ({ skills }) as Post

describe('timeLeft', () => {
  it('formats minutes and hours', () => {
    expect(timeLeft(10)).toBe('expiring')
    expect(timeLeft(600)).toBe('10m left')
    expect(timeLeft(7320)).toBe('2h 2m left')
  })
})

describe('short', () => {
  it('shortens an address', () => {
    expect(short('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678')
  })
})

describe('filterBySkill', () => {
  const posts = [post('Solidity, foundry'), post('figma')]
  it('matches case-insensitively', () => expect(filterBySkill(posts, ' SOLID ')).toHaveLength(1))
  it('returns everything for an empty search', () => expect(filterBySkill(posts, '  ')).toHaveLength(2))
})

describe('validatePost', () => {
  it('accepts a valid post', () => expect(validatePost(valid)).toBeNull())
  it('requires name and contact', () => {
    expect(validatePost({ ...valid, name: ' ' })).toMatch(/Name/)
    expect(validatePost({ ...valid, contact: '' })).toMatch(/Contact/)
  })
  it('enforces character limits', () => {
    expect(validatePost({ ...valid, note: 'a'.repeat(501) })).toMatch(/Note is too long/)
    expect(validatePost({ ...valid, note: 'a'.repeat(500) })).toBeNull()
  })
})

describe('filterPosts', () => {
  it('returns all demo posts without filters', () => expect(filterPosts(DEMO_POSTS, {})).toHaveLength(DEMO_POSTS.length))
  it('filters by need and role together', () => {
    const r = filterPosts(DEMO_POSTS, { need: 'contracts', role: 'frontend' })
    expect(r.map((p) => p.name)).toEqual(['Asha'])
  })
  it('demo posts are all live and have unique keys', () => {
    expect(DEMO_POSTS.every((p) => p.secondsLeft > 0)).toBe(true)
    expect(new Set(DEMO_POSTS.map((p) => p.key)).size).toBe(DEMO_POSTS.length)
  })
})

describe('mostWanted', () => {
  it('returns the most requested role', () => {
    expect(mostWanted(DEMO_POSTS)).toBe('contracts')
  })
  it('returns null for no posts', () => expect(mostWanted([])).toBeNull())
})
