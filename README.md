# Teamfinder

A small board for hackathon people to find teammates. Post who you are and who you need. Posts expire after 24 hours, and only the wallet that created a post can delete it. Built for ETHGlobal Mumbai.

## Stack
Vite, React 19, TypeScript, Tailwind v4, and the [1st-Pouf](https://github.com/moji2002/1st-pouf) component library (MIT, copied into `src/components/pouf/`). The API is Express with MongoDB Atlas.

## How it works
- **Expiry:** posts have an `expiresAt` date and a MongoDB TTL index removes them after 24 hours. The API also hides expired posts that the TTL sweep has not removed yet.
- **Ownership:** creating or deleting a post needs a wallet signature (`personal_sign`). The server checks it with viem and only lets the author delete. Signatures older than 5 minutes are rejected.
- **Demo mode:** pick "Demo data" in the sidebar to try the UI with sample posts and no wallet or network.

## Run
```bash
npm install
cp .env.example .env   # set MONGODB_URI from MongoDB Atlas
npm run server         # API on http://localhost:8787
npm run dev            # front end on http://localhost:5173 (proxies /api)
npm run seed:db        # optional: insert sample posts
npm test
```

For one process in production, `npm start` builds the front end and the API serves it from `dist/`.

## AI usage
Built with Claude Code.
