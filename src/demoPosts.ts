import type { Address, Hex } from 'viem'
import type { Post } from './arkiv/api'

/** The "wallet" that owns posts created in demo mode. */
export const DEMO_ME = '0x000000000000000000000000000000000000dEaD' as Address

const addr = (n: number) => `0x${n.toString(16).padStart(4, '0')}a1b2c3d4e5f60718293a4b5c6d7e8f9012${n.toString(16).padStart(4, '0')}` as Address

const base = [
  { role: 'frontend', lookingFor: 'contracts', name: 'Asha', skills: 'react, wagmi, tailwind', note: 'Building a payments dapp, need a Solidity dev.', contact: 'tg: @asha_dev', hours: 21 },
  { role: 'contracts', lookingFor: 'design', name: 'Rohan', skills: 'solidity, foundry, zk', note: 'Have an L2 idea, need someone who can make it look good.', contact: 'tg: @rohan_sol', hours: 18 },
  { role: 'design', lookingFor: 'backend', name: 'Meera', skills: 'figma, motion, branding', note: 'Looking for a backend dev for an indexer.', contact: 'meera@example.com', hours: 15 },
  { role: 'backend', lookingFor: 'frontend', name: 'Kabir', skills: 'node, postgres, subgraphs', note: 'Indexer and API are done, need a UI person.', contact: 'tg: @kabir_be', hours: 12 },
  { role: 'product', lookingFor: 'contracts', name: 'Ananya', skills: 'user research, pitching, ops', note: 'Strong idea on on-chain payroll. Need a contracts dev.', contact: 'tg: @ananya_pm', hours: 9 },
  { role: 'contracts', lookingFor: 'frontend', name: 'Vikram', skills: 'solidity, huff, auditing', note: 'Gas-optimised NFT ticketing. Need a React dev.', contact: 'tg: @vikram_evm', hours: 6 },
  { role: 'frontend', lookingFor: 'design', name: 'Priya', skills: 'next.js, viem, three.js', note: 'Can ship fast, want a designer for the demo.', contact: 'priya@example.com', hours: 3 },
  { role: 'other', lookingFor: 'backend', name: 'Dev', skills: 'ai agents, python, rag', note: 'Building an AI agent that trades. Need a backend dev.', contact: 'tg: @dev_agents', hours: 1 },
]

export const DEMO_POSTS: Post[] = base.map(({ hours, ...p }, i) => ({
  ...p,
  key: `0xdemo${i}` as Hex,
  owner: addr(i + 1),
  author: addr(i + 1),
  secondsLeft: hours * 3600,
}))
