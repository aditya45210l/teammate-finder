/** Messages a wallet signs to prove it owns a post. The server rebuilds the same text and checks the signature. */
export const AUTH_WINDOW_MS = 5 * 60 * 1000

export const createMessage = (address: string, timestamp: number) =>
  `Teammate Finder: create post\nAddress: ${address.toLowerCase()}\nTimestamp: ${timestamp}`

export const deleteMessage = (address: string, id: string, timestamp: number) =>
  `Teammate Finder: delete post ${id}\nAddress: ${address.toLowerCase()}\nTimestamp: ${timestamp}`
