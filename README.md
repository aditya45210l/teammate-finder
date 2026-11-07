# Mumbai Teammate Finder

Hackers post who they are and who they need. Posts expire after 24h and only the author's wallet can delete one.
Built for the Arkiv "Build on Arkiv (from scratch)" track on testnet `rabdi` (chain id 7794095).

UI uses only [1st-Pouf](https://github.com/moji2002/1st-pouf) components (MIT, copied into `src/components/pouf/`).

## Run
```bash
npm install
cp .env.example .env   # add VITE_ARKIV_ACCESS_KEY from https://hub.arkiv.network/access-keys
npm run dev
```
Fund a wallet at https://hub.arkiv.network/faucet to post. To seed demo posts, also set `ARKIV_ACCESS_KEY` and `PRIVATE_KEY` in `.env`, then `npm run seed`.

## Data sources
Pick one in the sidebar:
- **Live (MongoDB)**: an Express API in `server/` with a TTL index (24h expiry). Posts and deletes are signed with the wallet, and the server checks the signature. Needs `MONGODB_URI` in `.env`; run `npm run server` next to `npm run dev`, and `npm run seed:db` for sample posts.
- **Arkiv testnet**: the original on-chain version (needs funds).
- **Demo data**: sample posts in the browser only.

## Writer wallet
The seed script writes demo posts from `0xB055409516C3f78Ec57B8dd576fb5214aD57378E`.
That wallet has no testnet funds yet, so no demo posts are on Arkiv at the time of writing. Fund it at https://hub.arkiv.network/faucet and run `npm run seed`.

## Example query
```ts
publicClient.select().from(TeammatePosts)
  .where(and(eq('lookingFor', 'contracts'), eq('role', 'frontend')))
  .orderBy(desc('$expiresAt')).limit(100).fetch()
```

## AI usage
Built with Claude Code.
