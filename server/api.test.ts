import 'dotenv/config'
import request from 'supertest'
import { MongoClient } from 'mongodb'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMessage, deleteMessage } from '../shared/auth'
import { createApp, type PostDoc } from './index'

// Runs against a throwaway collection in the configured Atlas database. Skipped without MONGODB_URI.
const uri = process.env.MONGODB_URI

describe.skipIf(!uri)('posts API', () => {
  const client = new MongoClient(uri!)
  const name = `posts_test_${Date.now()}`
  const alice = privateKeyToAccount(generatePrivateKey())
  const bob = privateKeyToAccount(generatePrivateKey())
  let app: ReturnType<typeof createApp>

  beforeAll(async () => {
    await client.connect()
    app = createApp(client.db('teammate-finder').collection<PostDoc>(name))
  })
  afterAll(async () => {
    await client.db('teammate-finder').collection(name).drop().catch(() => {})
    await client.close()
  })

  const body = { role: 'frontend', lookingFor: 'contracts', name: 'Alice', skills: 'react', note: 'hi', contact: 'tg: @a' }
  const signedCreate = async (acct = alice, extra = {}) => {
    const timestamp = Date.now()
    const signature = await acct.signMessage({ message: createMessage(acct.address, timestamp) })
    return { ...body, address: acct.address, timestamp, signature, ...extra }
  }

  it('rejects an unsigned post', async () => {
    const res = await request(app).post('/api/posts').send({ ...body, address: alice.address, timestamp: Date.now(), signature: '0x00' })
    expect(res.status).toBe(401)
  })

  it('rejects a signature from another wallet', async () => {
    const payload = await signedCreate(bob, { address: alice.address })
    expect((await request(app).post('/api/posts').send(payload)).status).toBe(401)
  })

  it('rejects an expired signature', async () => {
    const timestamp = Date.now() - 10 * 60 * 1000
    const signature = await alice.signMessage({ message: createMessage(alice.address, timestamp) })
    const res = await request(app).post('/api/posts').send({ ...body, address: alice.address, timestamp, signature })
    expect(res.status).toBe(401)
  })

  it('rejects invalid fields', async () => {
    expect((await request(app).post('/api/posts').send(await signedCreate(alice, { role: 'wizard' }))).status).toBe(400)
    expect((await request(app).post('/api/posts').send(await signedCreate(alice, { name: '' }))).status).toBe(400)
  })

  it('creates, lists, filters and deletes with the right owner', async () => {
    const created = await request(app).post('/api/posts').send(await signedCreate())
    expect(created.status).toBe(201)
    const id = created.body.key as string

    const list = await request(app).get('/api/posts')
    expect(list.body).toHaveLength(1)
    expect(list.body[0]).toMatchObject({ name: 'Alice', key: id, owner: alice.address.toLowerCase() })
    expect(list.body[0].secondsLeft).toBeGreaterThan(23 * 3600)

    expect((await request(app).get('/api/posts?need=contracts&role=frontend')).body).toHaveLength(1)
    expect((await request(app).get('/api/posts?need=design')).body).toHaveLength(0)

    // Bob cannot delete Alice's post, even with a valid signature of his own.
    const t1 = Date.now()
    const bobSig = await bob.signMessage({ message: deleteMessage(bob.address, id, t1) })
    const denied = await request(app).delete(`/api/posts/${id}`).send({ address: bob.address, timestamp: t1, signature: bobSig })
    expect(denied.status).toBe(404)

    const t2 = Date.now()
    const aliceSig = await alice.signMessage({ message: deleteMessage(alice.address, id, t2) })
    const ok = await request(app).delete(`/api/posts/${id}`).send({ address: alice.address, timestamp: t2, signature: aliceSig })
    expect(ok.status).toBe(204)
    expect((await request(app).get('/api/posts')).body).toHaveLength(0)
  }, 30000)

  it('hides expired posts', async () => {
    const col = client.db('teammate-finder').collection<PostDoc>(name)
    await col.insertOne({ ...body, author: alice.address.toLowerCase(), createdAt: new Date(0), expiresAt: new Date(Date.now() - 1000) })
    expect((await request(app).get('/api/posts')).body).toHaveLength(0)
  })
})
