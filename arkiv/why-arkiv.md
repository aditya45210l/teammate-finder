# Why Arkiv

A teammate board is the kind of data that should disappear. A post is only useful for a day, and stale listings are what make hackathon boards feel dead.

Arkiv gives us that without writing any cleanup code:

- **Expiry is a property of the data.** Each post is created with `ExpirationTime.fromHours(24)`. There is no cron job, no TTL index to forget, and no "is this still valid" check in the UI.
- **Ownership comes from the chain.** Only the wallet that created a post can delete it. The app never runs its own auth.
- **No backend to host.** The browser reads and writes straight to the testnet, so the whole app deploys as static files.
- **Indexed queries.** `role` and `lookingFor` are indexed columns, so "I need a contracts dev" is a real query, not a scan.
