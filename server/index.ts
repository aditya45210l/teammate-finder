import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { MongoClient, ObjectId, type Collection } from 'mongodb'
import { isAddress, verifyMessage, type Hex } from 'viem'
import { AUTH_WINDOW_MS, createMessage, deleteMessage } from '../shared/auth'
import { POST_LIFETIME_HOURS, ROLES } from '../src/arkiv/schema'

export interface PostDoc {
  author: string
  role: string
  lookingFor: string
  name: string
  skills: string
  note: string
  contact: string
  createdAt: Date
  expiresAt: Date
}

const MAX = { name: 80, skills: 200, note: 500, contact: 120 } as const
const isRole = (v: unknown): v is string => typeof v === 'string' && (ROLES as readonly string[]).includes(v)

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : null)

async function authorized(address: unknown, timestamp: unknown, signature: unknown, message: (a: string, t: number) => string) {
  if (typeof address !== 'string' || !isAddress(address)) return false
  if (typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > AUTH_WINDOW_MS) return false
  if (typeof signature !== 'string') return false
  try {
    return await verifyMessage({ address, message: message(address, timestamp), signature: signature as Hex })
  } catch {
    return false
  }
}

export function createApp(posts: Collection<PostDoc>) {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '20kb' }))

  app.get('/api/posts', async (req, res) => {
    const filter: Partial<Pick<PostDoc, 'role' | 'lookingFor'>> = {}
    if (req.query.need !== undefined) {
      if (!isRole(req.query.need)) return res.status(400).json({ error: 'Invalid need' })
      filter.lookingFor = req.query.need
    }
    if (req.query.role !== undefined) {
      if (!isRole(req.query.role)) return res.status(400).json({ error: 'Invalid role' })
      filter.role = req.query.role
    }
    const now = Date.now()
    const docs = await posts.find({ ...filter, expiresAt: { $gt: new Date(now) } }).sort({ expiresAt: -1 }).limit(100).toArray()
    res.json(
      docs.map(({ _id, createdAt: _c, expiresAt, ...d }) => ({
        ...d,
        key: _id.toString(),
        owner: d.author,
        secondsLeft: Math.max(0, Math.round((expiresAt.getTime() - now) / 1000)),
      })),
    )
  })

  app.post('/api/posts', async (req, res) => {
    const { address, timestamp, signature, role, lookingFor } = req.body ?? {}
    const name = text(req.body?.name, MAX.name)
    const contact = text(req.body?.contact, MAX.contact)
    const skills = typeof req.body?.skills === 'string' && req.body.skills.length <= MAX.skills ? req.body.skills.trim() : null
    const note = typeof req.body?.note === 'string' && req.body.note.length <= MAX.note ? req.body.note.trim() : null
    if (!name || !contact || skills === null || note === null || !isRole(role) || !isRole(lookingFor)) {
      return res.status(400).json({ error: 'Invalid post' })
    }
    if (!(await authorized(address, timestamp, signature, createMessage))) return res.status(401).json({ error: 'Bad signature' })
    const now = Date.now()
    const doc: PostDoc = {
      author: address.toLowerCase(),
      role,
      lookingFor,
      name,
      skills,
      note,
      contact,
      createdAt: new Date(now),
      expiresAt: new Date(now + POST_LIFETIME_HOURS * 3600 * 1000),
    }
    const { insertedId } = await posts.insertOne(doc)
    res.status(201).json({ key: insertedId.toString() })
  })

  app.delete('/api/posts/:id', async (req, res) => {
    const { id } = req.params
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' })
    const { address, timestamp, signature } = req.body ?? {}
    if (!(await authorized(address, timestamp, signature, (a, t) => deleteMessage(a, id, t)))) {
      return res.status(401).json({ error: 'Bad signature' })
    }
    const { deletedCount } = await posts.deleteOne({ _id: new ObjectId(id), author: address.toLowerCase() })
    if (!deletedCount) return res.status(404).json({ error: 'Not found or not yours' })
    res.status(204).end()
  })

  return app
}

export async function connect() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('Set MONGODB_URI in .env')
  const client = new MongoClient(uri)
  await client.connect()
  const posts = client.db('teammate-finder').collection<PostDoc>('posts')
  // Mongo deletes a document once its expiresAt has passed, which gives the 24h lifetime.
  await posts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  await posts.createIndex({ role: 1, lookingFor: 1 })
  return { client, posts }
}

if (process.argv[1]?.endsWith('server/index.ts')) {
  const { posts } = await connect()
  const port = Number(process.env.PORT ?? 8787)
  createApp(posts).listen(port, () => console.log(`API listening on http://localhost:${port}`))
}
