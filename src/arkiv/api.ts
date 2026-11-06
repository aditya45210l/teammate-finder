import { createPublicClient, createWalletClient, ExpirationTime } from '@arkiv-network/sdk'
import { and, desc, eq } from '@arkiv-network/sdk/query'
import { addr } from '@arkiv-network/sdk/schema'
import { custom, http, type Address, type Hex } from 'viem'
import { chain, accessKey } from './chain'
import { POST_LIFETIME_HOURS, TeammatePosts } from './schema'

export interface Post {
  key: Hex
  owner: Address
  author: Address
  role: string
  lookingFor: string
  name: string
  skills: string
  note: string
  contact: string
  /** Estimated seconds until the post expires. */
  secondsLeft: number
}

export interface NewPost {
  role: string
  lookingFor: string
  name: string
  skills: string
  note: string
  contact: string
}

export interface Filters {
  /** Filter on the `lookingFor` column ("I need a ..."). */
  need?: string
  /** Filter on the `role` column ("Posted by a ..."). */
  role?: string
}

const publicClient = createPublicClient({ chain, transport: http() })

type Ethereum = { request(args: { method: string; params?: unknown[] }): Promise<unknown> }
const ethereum = () => (window as unknown as { ethereum?: Ethereum }).ethereum

export async function listPosts({ need, role }: Filters = {}): Promise<Post[]> {
  if (!accessKey) throw new Error('Missing VITE_ARKIV_ACCESS_KEY. Copy .env.example to .env and add your key.')

  const terms = []
  if (need) terms.push(eq('lookingFor', need))
  if (role) terms.push(eq('role', role))

  let query = publicClient.select().from(TeammatePosts)
  if (terms.length === 1) query = query.where(terms[0])
  else if (terms.length > 1) query = query.where(and(...terms))

  const [result, timing] = await Promise.all([
    query.orderBy(desc('$expiresAt')).limit(100).fetch(),
    publicClient.getBlockTiming(),
  ])

  return result.entities.map((row) => ({
    key: row.$key,
    owner: row.$owner,
    author: row.author.value as Address,
    role: row.role.value,
    lookingFor: row.lookingFor.value,
    name: row.name.value,
    skills: row.skills.value,
    note: row.note.value,
    contact: row.contact.value,
    // $expiresAt is a block height, so convert the remaining blocks to seconds.
    secondsLeft: Math.max(0, Number(row.$expiresAt - timing.currentBlock) * timing.blockDuration),
  }))
}

export async function connectWallet(): Promise<Address> {
  const eth = ethereum()
  if (!eth) throw new Error('No wallet found. Install MetaMask or another browser wallet.')
  const [account] = (await eth.request({ method: 'eth_requestAccounts' })) as Address[]
  const chainIdHex = `0x${chain.id.toString(16)}`
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] })
  } catch {
    await eth.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: chainIdHex,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: chain.rpcUrls.default.http,
          blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : undefined,
        },
      ],
    })
  }
  return account
}

function walletFor(account: Address) {
  const eth = ethereum()
  if (!eth) throw new Error('No wallet found.')
  return createWalletClient({ chain, transport: custom(eth), account })
}

export async function createPost(account: Address, post: NewPost): Promise<Hex> {
  const { entityKey } = await walletFor(account).createEntity(
    TeammatePosts,
    { author: addr(account), ...post },
    { expiration: ExpirationTime.fromHours(POST_LIFETIME_HOURS) },
  )
  return entityKey
}

export async function deletePost(account: Address, entityKey: Hex): Promise<void> {
  await walletFor(account).deleteEntity({ entityKey })
}
