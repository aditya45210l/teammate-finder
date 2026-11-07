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

The back end is a small Express API on MongoDB Atlas. Posts carry an expiresAt date and a TTL index deletes them after 24 hours, with the API also hiding expired ones in between sweeps. There are no accounts: writes are signed with the user's wallet (personal_sign) over a message that includes the address and a timestamp, and the server verifies it with viem. Only the author's signature can delete a post, and signatures older than 5 minutes are rejected. A demo mode with built-in sample data lets the UI run with no wallet or network.

Notable details: filters are validated on the server against the allowed roles, skill search runs in the browser, and the build is served by the same Express process for a single deploy. Vitest covers the helpers and API tests for bad signatures, wrong wallet, expired signature, invalid fields, owner-only delete and expiry.

## GitHub repository
https://github.com/aditya45210l/teammate-finder

## Tech stack
React 19, TypeScript, Vite, Tailwind v4, 1st-Pouf, Radix UI, framer-motion, viem, Express, MongoDB Atlas, Vitest.

## Prize track
TODO: the Arkiv integration was removed, so the Arkiv track no longer applies. Pick another track.
