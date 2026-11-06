import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Avatar, Badge, Blob, Button, Card, Confirm, Dialog, Empty, ErrorNote, Field, Grid, Heading, Input,
  Row, Select, Separator, Shell, Sidebar, Skeleton, Spacer, Stack, Stat, Text, Textarea, Toaster, TooltipProvider, toast,
} from './components/pouf'
import * as arkiv from './arkiv/api'
import * as mongo from './mongo/api'
import type { NewPost, Post } from './types'
import { POST_LIFETIME_HOURS, ROLES } from './arkiv/schema'
import Landing from './Landing'
import { DEMO_ME, DEMO_POSTS } from './demoPosts'
import { filterBySkill, filterPosts, message, mostWanted, short, timeLeft, validatePost } from './lib'

type Source = 'api' | 'arkiv' | 'demo'
const SOURCE_OPTIONS = [
  { value: 'api', label: 'Live (MongoDB)' },
  { value: 'arkiv', label: 'Arkiv testnet' },
  { value: 'demo', label: 'Demo data' },
]
const SOURCE_HINT: Record<Source, string> = {
  api: 'Shared posts, expire after 24h.',
  arkiv: 'Posts stored on Arkiv. Needs testnet funds.',
  demo: 'Sample posts in your browser only.',
}

const ANY = 'any'
const roleOptions = ROLES.map((r) => ({ value: r, label: r }))
const filterOptions = [{ value: ANY, label: 'Anyone' }, ...roleOptions]
const emptyForm: NewPost = { role: 'frontend', lookingFor: 'contracts', name: '', skills: '', note: '', contact: '' }


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
      return saved === 'arkiv' || saved === 'demo' ? saved : 'api'
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
    ;(source === 'arkiv' ? arkiv : mongo)
      .listPosts(filters)
      .then((result) => {
        if (stale) return
        setPosts(result)
        setError(null)
      })
      .catch((e) => !stale && setError(message(e)))
      .finally(() => !stale && setLoading(false))
    return () => {
      stale = true
      setLoading(true)
    }
  }, [need, role, reload, source, demoPosts, demo])

  useEffect(() => {
    const eth = (window as unknown as { ethereum?: { on?: Function; removeListener?: Function } }).ethereum
    if (!eth?.on) return
    const onAccounts = (accounts: `0x${string}`[]) => setAccount(accounts[0] ?? null)
    eth.on('accountsChanged', onAccounts)
    return () => eth.removeListener?.('accountsChanged', onAccounts)
  }, [])

  const visible = useMemo(() => filterBySkill(posts, search), [posts, search])

  const connect = async () => {
    try {
      setAccount(await (source === 'arkiv' ? arkiv.connectWallet() : mongo.connectAccount()))
      toast.success('Wallet connected')
    } catch (e) {
      toast.error('Could not connect', { description: message(e) })
    }
  }

  const me = demo ? DEMO_ME : account

  const submit = async () => {
    if (!me) return toast.warning('Connect your wallet first')
    const problem = validatePost(form)
    if (problem) return toast.warning(problem)
    if (demo) {
      const post: Post = { ...form, name: form.name.trim(), contact: form.contact.trim(), key: `0xdemo-${Date.now()}`, owner: me, author: me, secondsLeft: POST_LIFETIME_HOURS * 3600 }
      setDemoPosts((list) => [post, ...list])
      toast.success('Demo post added', { description: 'Switch the data source to publish for real.' })
      setOpen(false)
      setForm(emptyForm)
      return
    }
    setSaving(true)
    try {
      await (source === 'arkiv' ? arkiv : mongo).createPost(me!, { ...form, name: form.name.trim(), contact: form.contact.trim() })
      toast.success('Post published', { description: `It disappears in ${POST_LIFETIME_HOURS}h.` })
      setOpen(false)
      setForm(emptyForm)
      refresh()
    } catch (e) {
      toast.error('Could not publish', { description: message(e) })
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
      await (source === 'arkiv' ? arkiv : mongo).deletePost(me, post.key)
      toast.success('Post deleted')
      refresh()
    } catch (e) {
      toast.error('Could not delete', { description: message(e) })
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

  return (
    <TooltipProvider>
      <Shell>
        <Sidebar>
          <Stack gap={5}>
            <Row gap={3} wrap={false}>
              <Blob icon="users" tone="purple" size="sm" />
              <Heading level={3}>Teamfinder</Heading>
            </Row>
            <Button variant="quiet" size="sm" onClick={onHome}>← Back to home</Button>
            <Separator />

            <Card variant="tight">
              <Stack gap={3}>
                <Text size="sm" muted>Where posts come from</Text>
                <Select value={source} onChange={changeSource} options={SOURCE_OPTIONS} label="Data source" />
                <Text size="sm" muted>{SOURCE_HINT[source]}</Text>
                {!demo &&
                  (account ? (
                    <Badge tone="mint">{short(account)}</Badge>
                  ) : (
                    <Button tone="purple" size="sm" block onClick={connect}>Connect wallet</Button>
                  ))}
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
                <Field label="Skill search">
                  {(id) => <Input id={id} value={search} onChange={setSearch} placeholder="e.g. solidity" />}
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
              <Dialog
                open={open}
                onOpenChange={setOpen}
                title="New post"
                description="Tell people who you are and who you need."
                trigger={<Button tone="pink">New post</Button>}
              >
                <Stack gap={4}>
                  <Field label="Your name">{(id) => <Input id={id} value={form.name} onChange={set('name')} />}</Field>
                  <Row gap={3} wrap={false}>
                    <Field label="I am a">{(id) => <Select id={id} value={form.role} onChange={set('role')} options={roleOptions} />}</Field>
                    <Field label="I need a">{(id) => <Select id={id} value={form.lookingFor} onChange={set('lookingFor')} options={roleOptions} />}</Field>
                  </Row>
                  <Field label="Skills" hint="Comma separated">{(id) => <Input id={id} value={form.skills} onChange={set('skills')} />}</Field>
                  <Field label="Note">{(id) => <Textarea id={id} value={form.note} onChange={set('note')} rows={3} />}</Field>
                  <Field label="Contact" hint="Telegram, email, etc.">{(id) => <Input id={id} value={form.contact} onChange={set('contact')} />}</Field>
                  <Button tone="mint" block loading={saving} onClick={submit}>
                    {me ? (demo ? 'Add demo post' : 'Publish') : 'Connect wallet to publish'}
                  </Button>
                </Stack>
              </Dialog>
            </Row>
          </Row>

          <Grid cols={3} gap={4}>
            <Stat label="Open posts" value={String(visible.length)} icon="users" tone="purple" />
            <Stat label="Most wanted" value={wanted ?? '-'} icon="target" tone="pink" />
            <Stat label="Expiring in 3h" value={String(expiringSoon)} icon="clock" tone="yellow" />
          </Grid>

          {error && <ErrorNote>{error}</ErrorNote>}
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
                <Card key={p.key} variant="tight" motion="lift">
                  <Stack gap={4}>
                    <Row wrap={false}>
                      <Avatar fallback={p.name.slice(0, 2).toUpperCase()} tone="purple" />
                      <Stack gap={1}>
                        <Heading level={3}>{p.name}</Heading>
                        <Text size="sm" muted mono truncate>{short(p.author)}</Text>
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
                    <Separator />
                    <Row justify="between" wrap={false}>
                      <Text mono truncate>{p.contact}</Text>
                      <Row gap={2} wrap={false}>
                        <Button size="sm" variant="quiet" onClick={() => copyContact(p.contact)}>Copy</Button>
                        {me && p.owner.toLowerCase() === me.toLowerCase() && (
                          <Confirm
                            title="Delete this post?"
                            body="It will be removed for everyone."
                            confirmLabel="Delete post"
                            cancelLabel="Keep post"
                            tone="orange"
                            loading={deleting === p.key}
                            onConfirm={() => remove(p)}
                          >
                            <Button variant="quiet" size="sm">Delete</Button>
                          </Confirm>
                        )}
                      </Row>
                    </Row>
                  </Stack>
                </Card>
              ))}
            </Grid>
          )}
        </Stack>
      </Shell>
      <Toaster />
    </TooltipProvider>
  )
}
