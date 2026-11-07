# ETHGlobal Mumbai submission text

## Project name
Teamfinder (Mumbai Teammate Finder)

## Category
Data/Analytics (closest fit offered; it is a data board)

## Emoji
🤝

## Demo link
TODO: deploy first (the app has no hosted URL yet)

## Short description (max 100 characters)
Post who you are and who you need. Posts vanish after 24h, so every teammate is still looking.

## Description
Teamfinder is a small board for hackathon attendees who are missing a teammate. You post your role, your skills, a short note and how to reach you, and you say which role you need. Everyone else can filter by the role they are looking for, search by skill, and copy your contact in one click.

The point is freshness. Every post disappears after 24 hours, so the board never fills up with people who already found a team. Only the wallet that created a post can delete it, so nobody can remove or edit someone else's listing. There is no signup: you connect a wallet and you are in.

The app has a landing page, a board with live stats (open posts, most wanted role, posts expiring soon), filters, a new post form, and a demo mode with sample data so it is usable even with no wallet or network.

## How it's made
The front end is Vite, React 19, TypeScript and Tailwind v4. The whole UI is built only from the 1st-Pouf component library (a shadcn-style registry of claymorphism components): screens use variant props and never raw HTML, classNames or inline styles.

Data has three sources, switchable in the sidebar. The Arkiv source uses @arkiv-network/sdk on the rabdi testnet: posts are entities with a 24 hour expiration (ExpirationTime.fromHours(24)), role and lookingFor are indexed columns so filters are real queries, and ownership and deletion come from the chain. The Live source is an Express and MongoDB Atlas API with a TTL index for the 24 hour expiry; writes are signed with the wallet (personal_sign) and the server verifies the signature with viem, so only the author can delete. The third source is built-in demo data.

Notable details: Arkiv strings are capped at 128 bytes, so the form validates bytes, not characters. $expiresAt is a block height, so time left is computed from getBlockTiming(). Skill search runs in the browser because Arkiv has no "contains" operator. Vitest covers the helpers, a live Arkiv read smoke test, and API tests for signatures, ownership and expiry.

## GitHub repository
https://github.com/aditya45210l/teammate-finder

## Tech stack
React 19, TypeScript, Vite, Tailwind v4, 1st-Pouf, Radix UI, framer-motion, viem, @arkiv-network/sdk, Express, MongoDB Atlas, Vitest.

## Prize track
Arkiv: "Build on Arkiv (from scratch)". Honest note: Arkiv is supported and tested for reads, but no posts have been written to Arkiv yet because the seed wallet is unfunded.
