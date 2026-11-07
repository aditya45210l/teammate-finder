# How we use Arkiv

- **Chain:** testnet `rabdi` (chain id 7794095) through `@arkiv-network/sdk` 1.0.1 and `viem`.
- **Schema:** `mumbai-teammate-v1` with `author`, `role`, `lookingFor` indexed, and `name`, `skills`, `note`, `contact` as plain strings (see `schema.md`).
- **Write:** `createEntity(TeammatePosts, values, { expiration: ExpirationTime.fromHours(24) })` from the connected wallet (`src/arkiv/api.ts`).
- **Delete:** `deleteEntity({ entityKey })`. The UI only shows Delete when `$owner` matches the connected account.
- **Read:** `select().from(TeammatePosts).where(and(eq('lookingFor', ..), eq('role', ..))).orderBy(desc('$expiresAt')).limit(100).fetch()`.
- **Time left:** `$expiresAt` is a block height, so we use `getBlockTiming()` (`currentBlock`, `blockDuration`) to turn remaining blocks into seconds.
- **Skill search** runs in the browser because Arkiv has no "contains" operator and only indexed columns can be filtered.
- **Seed:** `npm run seed` writes 8 demo posts from a throwaway wallet.
