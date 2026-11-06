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

## Writer wallet
TODO: paste the address printed by `npm run seed`.

## Example query
```ts
publicClient.select().from(TeammatePosts)
  .where(and(eq('lookingFor', 'contracts'), eq('role', 'frontend')))
  .orderBy(desc('$expiresAt')).limit(100).fetch()
```

## AI usage
Built with Claude Code.
