import 'dotenv/config'
import { DEMO_POSTS } from '../src/demoPosts'
import { connect } from './index'

const { client, posts } = await connect()
const now = Date.now()
// Re-running replaces the previous demo posts instead of piling up duplicates.
await posts.deleteMany({ author: { $in: DEMO_POSTS.map((p) => p.author.toLowerCase()) } })
await posts.insertMany(
  DEMO_POSTS.map(({ key: _k, owner: _o, secondsLeft, author, ...p }) => ({
    ...p,
    author: author.toLowerCase(),
    createdAt: new Date(now),
    expiresAt: new Date(now + secondsLeft * 1000),
  })),
)
console.log(`Seeded ${DEMO_POSTS.length} demo posts`)
await client.close()
