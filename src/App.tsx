import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Avatar, Badge, Blob, Button, Card, Confirm, Dialog, DropdownMenu, Empty, ErrorNote, Field, Grid, Heading, Input,
  Navbar, Page, Row, Select, Separator, Sidebar, Split, Skeleton, Spacer, Stack, Stat, Text, Textarea, Toaster, TooltipProvider, toast,
} from './components/pouf'
import * as mongo from './mongo/api'
import type { NewPost, Post } from './types'
import { contactFromRecords, isEnsName, resolveEnsName, useEns } from './ens'
import { LIMITS, POST_LIFETIME_HOURS, ROLES } from '../shared/constants'
import Landing from './Landing'
import { DEMO_ME, DEMO_POSTS } from './demoPosts'
import { fieldErrors, filterBySkill, filterPosts, friendlyError, mostWanted, short, timeLeft } from './lib'

type Source = 'api' | 'demo'
const SOURCE_OPTIONS = [
  { value: 'api', label: 'Live (MongoDB)' },
  { value: 'demo', label: 'Demo data' },
]
const SOURCE_HINT: Record<Source, string> = {
  api: 'Shared posts, expire after 24h.',
  demo: 'Sample posts in your browser only.',
}

const ANY = 'any'
const roleOptions = ROLES.map((r) => ({ value: r, label: r }))
const filterOptions = [{ value: ANY, label: 'Anyone' }, ...roleOptions]
const emptyForm: NewPost = { role: 'frontend', lookingFor: 'contracts', name: '', skills: '', note: '', contact: '' }


const walletOff = () => {
  try {
    return localStorage.getItem('wallet') === 'off'
  } catch {
    return false
  }
}
const setWalletOff = (off: boolean) => {
  try {
    localStorage.setItem('wallet', off ? 'off' : 'on')
  } catch {
    /* storage unavailable, the choice just won't persist */
  }
}

export default function App() {
  const [view, setView] = useState<'landing' | 'app'>(location.hash === '#app' ? 'app' : 'landing')
  useEffect(() => {
    const onHash = () => setView(location.hash === '#app' ? 'app' : 'landing')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const go = (v: 'landing' | 'app') => {
    history.pushState(null, '', v === 'app' ? '#app' : location.pathname + location.search)
    setView(v)
    window.scrollTo(0, 0)
  }
  return view === 'landing' ? <Landing onLaunch={() => go('app')} /> : <Board onHome={() => go('landing')} />
}

function Board({ onHome }: { onHome: () => void }) {
  const [account, setAccount] = useState<`0x${string}` | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [source, setSource] = useState<Source>(() => {
    try {
      const saved = localStorage.getItem('source')
      return saved === 'demo' ? saved : 'api'
    } catch {
      return 'api'
    }
  })
  const demo = source === 'demo'
  const [demoPosts, setDemoPosts] = useState<Post[]>(DEMO_POSTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [need, setNeed] = useState(ANY)
  const [role, setRole] = useState(ANY)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<NewPost>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [ensSearch, setEnsSearch] = useState<{ query: string; address: string | null } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [reload, setReload] = useState(0)
  const refresh = useCallback(() => setReload((n) => n + 1), [])

  const changeSource = (next: string) => {
    setSource(next as Source)
    setLoading(true)
    try {
      localStorage.setItem('source', next)
    } catch {
      /* storage unavailable, the choice just won't persist */
    }
  }

  useEffect(() => {
    const filters = { need: need === ANY ? undefined : need, role: role === ANY ? undefined : role }
    if (demo) {
      setPosts(filterPosts(demoPosts, filters))
      setError(null)
      setLoading(false)
      return
    }
    let stale = false
    mongo
      .listPosts(filters)
      .then((result) => {
        if (stale) return
        setPosts(result)
        setError(null)
      })
      .catch((e) => {
        if (stale) return
        const f = friendlyError(e, 'loaded')
        setError(`${f.title}. ${f.description}`)
      })
      .finally(() => !stale && setLoading(false))
    return () => {
      stale = true
      setLoading(true)
    }
  }, [need, role, reload, source, demoPosts, demo])

  // Pick the wallet back up on reload, unless the person disconnected on purpose.
  useEffect(() => {
    if (walletOff()) return
    void mongo.getConnectedAccount().then((a) => a && setAccount(a))
  }, [])

  useEffect(() => {
    const eth = (window as unknown as { ethereum?: { on?: Function; removeListener?: Function } }).ethereum
    if (!eth?.on) return
    const onAccounts = (accounts: `0x${string}`[]) => {
      if (walletOff()) return
      setAccount(accounts[0] ?? null)
      if (!accounts[0]) toast.info('Wallet disconnected', { description: 'Your wallet no longer shares an account with this site.' })
    }
    eth.on('accountsChanged', onAccounts)
    return () => eth.removeListener?.('accountsChanged', onAccounts)
  }, [])

  // Typing an ENS name searches for posts by that name's owner instead of by skill.
  const ensQuery = isEnsName(search) ? search.trim().toLowerCase() : null
  useEffect(() => {
    if (!ensQuery) return
    let stale = false
    void resolveEnsName(ensQuery).then((address) => !stale && setEnsSearch({ query: ensQuery, address }))
    return () => {
      stale = true
    }
  }, [ensQuery])
  const ensResolving = !!ensQuery && ensSearch?.query !== ensQuery

  const visible = useMemo(() => {
    if (!ensQuery) return filterBySkill(posts, search)
    if (ensSearch?.query !== ensQuery) return posts
    const owner = ensSearch.address?.toLowerCase()
    return owner ? posts.filter((p) => p.author.toLowerCase() === owner) : []
  }, [posts, search, ensQuery, ensSearch])

  const connect = async (): Promise<`0x${string}` | null> => {
    setConnecting(true)
    try {
      const a = await mongo.connectAccount()
      setWalletOff(false)
      setAccount(a)
      toast.success('Wallet connected', { description: short(a) })
      return a
    } catch (e) {
      const f = friendlyError(e, 'connected')
      ;(f.cancelled ? toast.info : toast.error)(f.title, { description: f.description })
      return null
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = () => {
    setWalletOff(true)
    setAccount(null)
    toast.info('Disconnected', { description: 'You can reconnect any time. To fully revoke access, use your wallet settings.' })
  }

  const copyAddress = async () => {
    if (!account) return
    try {
      await navigator.clipboard.writeText(account)
      toast.success('Address copied')
    } catch {
      toast.warning('Could not copy', { description: account })
    }
  }

  const me = demo ? DEMO_ME : account
  const myEns = useEns(account)
  const ensName = myEns.name
  const ensContact = contactFromRecords(myEns.records)

  const closeDialog = (next: boolean) => {
    setOpen(next)
    if (!next) setAttempted(false)
  }

  const submit = async () => {
    setAttempted(true)
    if (Object.keys(fieldErrors(form)).length > 0) return
    // Publishing needs a wallet, so offer the connection instead of just refusing.
    const author = me ?? (await connect())
    if (!author) return
    const clean = { ...form, name: form.name.trim(), skills: form.skills.trim(), note: form.note.trim(), contact: form.contact.trim() }
    if (demo) {
      const post: Post = { ...clean, key: `0xdemo-${Date.now()}`, owner: author, author, secondsLeft: POST_LIFETIME_HOURS * 3600 }
      setDemoPosts((list) => [post, ...list])
      toast.success('Demo post added', { description: 'Switch the data source to publish for real.' })
      setOpen(false)
      setAttempted(false)
      setForm(emptyForm)
      return
    }
    setSaving(true)
    try {
      await mongo.createPost(author, clean)
      toast.success('Post published', { description: `It disappears in ${POST_LIFETIME_HOURS}h.` })
      setOpen(false)
      setAttempted(false)
      setForm(emptyForm)
      refresh()
    } catch (e) {
      const f = friendlyError(e, 'published')
      ;(f.cancelled ? toast.info : toast.error)(f.title, { description: f.description })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (post: Post) => {
    if (!me) return
    if (demo) {
      setDemoPosts((list) => list.filter((p) => p.key !== post.key))
      toast.success('Post deleted')
      return
    }
    setDeleting(post.key)
    try {
      await mongo.deletePost(me, post.key)
      toast.success('Post deleted', { description: 'It is gone for everyone.' })
      refresh()
    } catch (e) {
      const f = friendlyError(e, 'deleted')
      ;(f.cancelled ? toast.info : toast.error)(f.title, { description: f.description })
      if (!f.cancelled) refresh()
    } finally {
      setDeleting(null)
    }
  }

  const set = (k: keyof NewPost) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const copyContact = async (contact: string) => {
    try {
      await navigator.clipboard.writeText(contact)
      toast.success('Contact copied')
    } catch {
      toast.warning('Could not copy', { description: contact })
    }
  }

  const expiringSoon = visible.filter((p) => p.secondsLeft < 3 * 3600).length
  const wanted = mostWanted(visible)
  const filtered = need !== ANY || role !== ANY || search.trim() !== ''
  const clearFilters = () => {
    setNeed(ANY)
    setRole(ANY)
    setSearch('')
  }

  const errors = attempted ? fieldErrors(form) : {}
  const left = (k: keyof typeof LIMITS) => `${form[k].length}/${LIMITS[k]}`

  const newPostDialog = (
    <Dialog
      open={open}
      onOpenChange={closeDialog}
      title="New post"
      description={demo ? 'Demo mode: this post stays in your browser.' : 'Tell people who you are and who you need. You will sign it with your wallet.'}
      trigger={<Button tone="pink" size="sm">Post</Button>}
    >
      <Stack gap={4}>
        <Field label="Your name" hint={left('name')} error={errors.name}>
          {(id, d) => <Input id={id} describedBy={d} value={form.name} onChange={set('name')} maxLength={LIMITS.name} invalid={!!errors.name} />}
        </Field>
        <Row gap={3} wrap={false}>
          <Field label="I am a">{(id) => <Select id={id} value={form.role} onChange={set('role')} options={roleOptions} />}</Field>
          <Field label="I need a">{(id) => <Select id={id} value={form.lookingFor} onChange={set('lookingFor')} options={roleOptions} />}</Field>
        </Row>
        <Field label="Skills" hint={`Comma separated. ${left('skills')}`} error={errors.skills}>
          {(id, d) => <Input id={id} describedBy={d} value={form.skills} onChange={set('skills')} maxLength={LIMITS.skills} invalid={!!errors.skills} />}
        </Field>
        <Field label="Note" hint={left('note')} error={errors.note}>
          {(id, d) => <Textarea id={id} describedBy={d} value={form.note} onChange={set('note')} rows={3} maxLength={LIMITS.note} invalid={!!errors.note} />}
        </Field>
        <Field label="Contact" hint={`Telegram, email, etc. ${left('contact')}`} error={errors.contact}>
          {(id, d) => <Input id={id} describedBy={d} value={form.contact} onChange={set('contact')} maxLength={LIMITS.contact} invalid={!!errors.contact} />}
        </Field>
        {ensContact && !form.contact && (
          <Button variant="quiet" size="sm" onClick={() => set('contact')(ensContact)}>
            Use contact from {ensName}
          </Button>
        )}
        <Button tone="mint" block loading={saving || connecting} onClick={submit}>
          {me ? (demo ? 'Add demo post' : 'Sign and publish') : 'Connect wallet and publish'}
        </Button>
      </Stack>
    </Dialog>
  )

  return (
    <TooltipProvider>
      <Page wide>
      <Stack gap={5}>
      <Navbar
        brand={<><Blob icon="users" tone="purple" size="sm" />Teamfinder</>}
        actions={
          <Row gap={2} wrap={false}>
            {demo ? (
              <Badge tone="yellow">Demo</Badge>
            ) : account ? (
              <DropdownMenu
                label="Wallet menu"
                items={[
                  { label: 'Copy address', icon: 'card', onClick: copyAddress },
                  'separator',
                  { label: 'Disconnect', icon: 'off', tone: 'down', onClick: disconnect },
                ]}
              >
                <Button variant="quiet" size="sm">
                  <Badge tone="mint">{ensName ?? short(account)}</Badge>
                </Button>
              </DropdownMenu>
            ) : (
              <Button variant="quiet" size="sm" loading={connecting} onClick={connect}>Connect</Button>
            )}
            {newPostDialog}
          </Row>
        }
      />
      <Split>
        <Sidebar>
          <Stack gap={5}>
            <Button variant="quiet" size="sm" block onClick={onHome}>← Back to home</Button>
            <Card variant="tight">
              <Stack gap={3}>
                <Text size="sm" muted>Where posts come from</Text>
                <Select value={source} onChange={changeSource} options={SOURCE_OPTIONS} label="Data source" />
                <Text size="sm" muted>{SOURCE_HINT[source]}</Text>
              </Stack>
            </Card>

            <Card variant="tight">
              <Stack gap={4}>
                <Row justify="between">
                  <Text size="sm" muted>Filters</Text>
                  {filtered && <Button variant="quiet" size="sm" onClick={clearFilters}>Clear</Button>}
                </Row>
                <Field label="I need a">
                  {(id) => <Select id={id} value={need} onChange={setNeed} options={filterOptions} />}
                </Field>
                <Field label="Posted by a">
                  {(id) => <Select id={id} value={role} onChange={setRole} options={filterOptions} />}
                </Field>
                <Field
                  label="Skill or ENS name"
                  hint={ensResolving ? 'Looking up ENS name...' : ensQuery ? (ensSearch?.address ? `Posts by ${ensQuery}` : 'No address found for that ENS name') : 'Try solidity, or an ENS name like nick.eth'}
                >
                  {(id, d) => <Input id={id} describedBy={d} value={search} onChange={setSearch} placeholder="e.g. solidity or nick.eth" />}
                </Field>
              </Stack>
            </Card>
          </Stack>
        </Sidebar>

        <Stack gap={5}>
          <Row justify="between">
            <Stack gap={1}>
              <Heading level={1}>Find your team</Heading>
              <Text muted>Posts disappear after {POST_LIFETIME_HOURS}h, so everyone here is still looking.</Text>
            </Stack>
            <Row gap={2}>
              <Button variant="quiet" onClick={refresh}>Refresh</Button>

            </Row>
          </Row>

          <Grid cols={3} gap={4}>
            <Stat label="Open posts" value={String(visible.length)} icon="users" tone="purple" />
            <Stat label="Most wanted" value={wanted ?? '-'} icon="target" tone="pink" />
            <Stat label="Expiring in 3h" value={String(expiringSoon)} icon="clock" tone="yellow" />
          </Grid>

          {error && (
            <ErrorNote>
              <Row gap={3}>
                <Text>{error}</Text>
                <Button size="sm" variant="quiet" onClick={refresh}>Try again</Button>
                <Button size="sm" variant="quiet" onClick={() => changeSource('demo')}>Use demo data</Button>
              </Row>
            </ErrorNote>
          )}
          {loading ? (
            <Grid cols={2} gap={4}>
              <Skeleton variant="card" count={2} />
              <Skeleton variant="card" count={2} />
            </Grid>
          ) : visible.length === 0 && !error ? (
            <Card>
              <Empty title={filtered ? 'No posts match these filters' : 'No posts yet'}>
                {filtered ? 'Try loosening the filters.' : 'Be the first to post.'}
              </Empty>
              <Row justify="center">
                {filtered ? <Button variant="quiet" onClick={clearFilters}>Clear filters</Button> : null}
              </Row>
            </Card>
          ) : (
            <Grid cols={2} gap={4}>
              {visible.map((p) => (
                <PostCard
                  key={p.key}
                  post={p}
                  canDelete={!!me && p.owner.toLowerCase() === me.toLowerCase()}
                  deleting={deleting === p.key}
                  onCopy={copyContact}
                  onDelete={remove}
                />
              ))}
            </Grid>
          )}
        </Stack>
      </Split>
      </Stack>
      </Page>
      <Toaster />
    </TooltipProvider>
  )
}

function PostCard({ post: p, canDelete, deleting, onCopy, onDelete }: {
  post: Post
  canDelete: boolean
  deleting: boolean
  onCopy: (contact: string) => void
  onDelete: (post: Post) => void
}) {
  const ens = useEns(p.author)
  return (
    <Card variant="tight" motion="lift">
      <Stack gap={4} fill>
        <Row wrap={false}>
          <Avatar src={ens.avatar ?? undefined} alt={ens.name ?? p.name} fallback={p.name.slice(0, 2).toUpperCase()} tone="purple" />
          <Stack gap={1}>
            <Heading level={3}>{p.name}</Heading>
            <Text size="sm" muted mono truncate>{ens.name ?? short(p.author)}</Text>
          </Stack>
          <Spacer />
          <Badge tone="yellow">{timeLeft(p.secondsLeft)}</Badge>
        </Row>
        <Row gap={2}>
          <Badge tone="blue">{p.role}</Badge>
          <Text size="sm" muted>needs a</Text>
          <Badge tone="pink">{p.lookingFor}</Badge>
        </Row>
        {p.note && <Text>{p.note}</Text>}
        {p.skills && (
          <Row gap={2}>
            {p.skills.split(',').map((k) => k.trim()).filter(Boolean).map((k) => (
              <Badge key={k} tone="mint">{k}</Badge>
            ))}
          </Row>
        )}
        {Object.keys(ens.records).length > 0 && (
          <Row gap={2}>
            <Text size="sm" muted>ENS</Text>
            {ens.records.github && <Badge tone="blue">github: {ens.records.github}</Badge>}
            {ens.records.twitter && <Badge tone="blue">x: {ens.records.twitter}</Badge>}
            {ens.records.telegram && <Badge tone="blue">tg: {ens.records.telegram}</Badge>}
          </Row>
        )}
        <Spacer />
        <Separator />
        <Row justify="between" wrap={false}>
          <Text mono truncate>{p.contact}</Text>
          <Row gap={2} wrap={false}>
            <Button size="sm" variant="quiet" onClick={() => onCopy(p.contact)}>Copy</Button>
            {canDelete && (
              <Confirm
                title="Delete this post?"
                body="It will be removed for everyone."
                confirmLabel="Delete post"
                cancelLabel="Keep post"
                tone="orange"
                loading={deleting}
                onConfirm={() => onDelete(p)}
              >
                <Button variant="quiet" size="sm">Delete</Button>
              </Confirm>
            )}
          </Row>
        </Row>
      </Stack>
    </Card>
  )
}
