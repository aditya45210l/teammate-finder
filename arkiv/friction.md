# Friction

Things that slowed us down while building. All of them are from real use of the SDK.

1. **Strings are capped at 128 bytes** (`MAX_STRING_BYTES`). A normal sentence-length note can exceed that, and the limit is in bytes, so emoji and non-Latin text hit it sooner. We found it by reading the SDK, not from an error in the UI, and added byte-based validation before publishing.
2. **A query needs at least one filter.** `select().from(Schema)` with no `where` is fine, but an untyped `select().fetch()` throws `InvalidPredicateError` ("the language has no spelling for 'match every entity'").
3. **`$expiresAt` is a block height, not a timestamp.** Showing "3h left" needs `getBlockTiming()` and some arithmetic.
4. **`http` is not exported by `@arkiv-network/sdk`.** It comes from `viem`. Our seed script crashed at import until we fixed that.
5. **`author: addr(...)` is required.** Passing a plain `0x...` string for an address column is a type error.
6. **Writes need testnet gas.** An unfunded wallet fails with "insufficient funds", so every new wallet has to visit the faucet first. This made it hard to have demo data ready before the faucet step.
7. **No "contains" operator**, so skill search is client-side.
