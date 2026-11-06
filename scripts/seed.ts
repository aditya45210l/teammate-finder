import 'dotenv/config'
import { createWalletClient, ExpirationTime } from '@arkiv-network/sdk'
import { http } from 'viem'
import { rabdi } from '@arkiv-network/sdk/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { addr } from '@arkiv-network/sdk/schema'
import { POST_LIFETIME_HOURS, TeammatePosts } from '../src/arkiv/schema'

const accessKey = process.env.ARKIV_ACCESS_KEY
const pk = process.env.PRIVATE_KEY as `0x${string}` | undefined
if (!accessKey || !pk) throw new Error('Set ARKIV_ACCESS_KEY and PRIVATE_KEY in .env')

const account = privateKeyToAccount(pk)
const wallet = createWalletClient({ chain: rabdi({ accessKey }), transport: http(), account })
console.log('Writer wallet:', account.address)

const demo = [
  { role: 'frontend', lookingFor: 'contracts', name: 'Asha', skills: 'react, wagmi, tailwind', note: 'Building a payments dapp, need a Solidity dev.', contact: 'tg: @asha_dev' },
  { role: 'contracts', lookingFor: 'design', name: 'Rohan', skills: 'solidity, foundry, zk', note: 'Have an L2 idea, need someone who can make it look good.', contact: 'tg: @rohan_sol' },
  { role: 'design', lookingFor: 'backend', name: 'Meera', skills: 'figma, motion, branding', note: 'Looking for a backend dev for an indexer.', contact: 'meera@example.com' },
]

for (const d of demo) {
  const { entityKey } = await wallet.createEntity(
    TeammatePosts,
    { author: addr(account.address), ...d },
    { expiration: ExpirationTime.fromHours(POST_LIFETIME_HOURS) },
  )
  console.log('created', d.name, entityKey)
}
