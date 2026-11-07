import type { IncomingMessage, ServerResponse } from 'node:http'
import { connect, createApp } from '../server/index.js'

// Vercel runs this file as one serverless function for every /api/* request.
// The Express app and the Mongo connection are created once and reused while the function stays warm.
let app: Promise<ReturnType<typeof createApp>> | undefined

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  app ??= connect().then(({ posts }) => createApp(posts))
  try {
    ;(await app)(req, res)
  } catch (e) {
    app = undefined
    console.error(e)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Database unavailable' }))
  }
}
