import { rabdi } from '@arkiv-network/sdk/chains'

export const accessKey = import.meta.env.VITE_ARKIV_ACCESS_KEY as string | undefined

export const chain = rabdi({ accessKey: accessKey ?? '' })
