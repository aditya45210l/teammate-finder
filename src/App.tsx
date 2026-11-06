import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Avatar, Badge, Button, Card, Confirm, Dialog, Empty, ErrorNote, Field, Heading, Input,
  Row, Select, Shell, Sidebar, Skeleton, Spacer, Stack, Text, Textarea, Toaster, TooltipProvider, toast,
} from './components/pouf'
import { connectWallet, createPost, deletePost, listPosts, type NewPost, type Post } from './arkiv/api'
import { POST_LIFETIME_HOURS, ROLES } from './arkiv/schema'
import Landing from './Landing'

const ANY = 'any'
const roleOptions = ROLES.map((r) => ({ value: r, label: r }))
const filterOptions = [{ value: ANY, label: 'Anyone' }, ...roleOptions]
const emptyForm: NewPost = { role: 'frontend', lookingFor: 'contracts', name: '', skills: '', note: '', contact: '' }

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

function timeLeft(seconds: number) {
  const m = Math.round(seconds / 60)
  if (m < 1) return 'expiring'
  if (m < 60) return `${m}m left`
  return `${Math.floor(m / 60)}h ${m % 60}m left`
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export default function App() {
  const [view, setView] = useState<'landing' | 'app'>(location.hash === '#app' ? 'app' : 'landing')
  const go = (v: 'landing' | 'app') => {
    history.replaceState(null, '', v === 'app' ? '#app' : location.pathname + location.search)
    setView(v)
    window.scrollTo(0, 0)
  }
  return view === 'landing' ? <Landing onLaunch={() => go('app')} /> : <Board onHome={() => go('landing')} />
}

function Board({ onHome }: { onHome: () => void }) {
  const [account, setAccount] = useState<`0x${string}` | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [need, setNeed] = useState(ANY)
  const [role, setRole] = useState(ANY)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<NewPost>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPosts(await listPosts({ need: need === ANY ? undefined : need, role: role === ANY ? undefined : role }))
    } catch (e) {
      setError(message(e))
    } finally {
      setLoading(false)
    }
  }, [need, role])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? posts.filter((p) => p.skills.toLowerCase().includes(q)) : posts
  }, [posts, search])

  const connect = async () => {
    try {
      setAccount(await connectWallet())
      toast.success('Wallet connected')
    } catch (e) {
      toast.error('Could not connect', { description: message(e) })
    }
  }

  const submit = async () => {
    if (!account) return toast.warning('Connect your wallet first')
    if (!form.name.trim() || !form.contact.trim()) return toast.warning('Name and contact are required')
    setSaving(true)
    try {
      await createPost(account, { ...form, name: form.name.trim(), contact: form.contact.trim() })
      toast.success('Post published', { description: `It disappears in ${POST_LIFETIME_HOURS}h.` })
      setOpen(false)
      setForm(emptyForm)
      await refresh()
    } catch (e) {
      toast.error('Could not publish', { description: message(e) })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (post: Post) => {
    if (!account) return
    setDeleting(post.key)
    try {
      await deletePost(account, post.key)
      toast.success('Post deleted')
      await refresh()
    } catch (e) {
      toast.error('Could not delete', { description: message(e) })
    } finally {
      setDeleting(null)
    }
  }

  const set = (k: keyof NewPost) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <TooltipProvider>
      <Shell>
        <Sidebar>
          <Stack gap={5}>
            <Button variant="quiet" size="sm" onClick={onHome}>← Home</Button>
            <Heading level={2}>Teammate Finder</Heading>
            <Text size="sm" muted>ETHGlobal Mumbai. Posts vanish after {POST_LIFETIME_HOURS}h.</Text>
            {account ? (
              <Badge tone="mint">{short(account)}</Badge>
            ) : (
              <Button tone="purple" onClick={connect}>Connect wallet</Button>
            )}
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
        </Sidebar>

        <Stack gap={5}>
          <Row justify="between">
            <Heading level={1}>Find your team</Heading>
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
                  <Field label="I am a">{(id) => <Select id={id} value={form.role} onChange={set('role')} options={roleOptions} />}</Field>
                  <Field label="I need a">{(id) => <Select id={id} value={form.lookingFor} onChange={set('lookingFor')} options={roleOptions} />}</Field>
                  <Field label="Skills" hint="Comma separated">{(id) => <Input id={id} value={form.skills} onChange={set('skills')} />}</Field>
                  <Field label="Note">{(id) => <Textarea id={id} value={form.note} onChange={set('note')} rows={3} />}</Field>
                  <Field label="Contact" hint="Telegram, email, etc.">{(id) => <Input id={id} value={form.contact} onChange={set('contact')} />}</Field>
                  <Button tone="mint" block loading={saving} onClick={submit}>
                    {account ? 'Publish' : 'Connect wallet to publish'}
                  </Button>
                </Stack>
              </Dialog>
            </Row>
          </Row>

          {error && <ErrorNote>{error}</ErrorNote>}
          {loading ? (
            <Skeleton variant="card" count={3} />
          ) : visible.length === 0 && !error ? (
            <Empty title="No posts yet">Be the first to post, or loosen the filters.</Empty>
          ) : (
            visible.map((p) => (
              <Card key={p.key} variant="tight" motion="lift">
                <Stack gap={3}>
                  <Row>
                    <Avatar fallback={p.name.slice(0, 2).toUpperCase()} tone="purple" />
                    <Stack gap={1}>
                      <Heading level={3}>{p.name}</Heading>
                      <Text size="sm" muted mono>{short(p.author)}</Text>
                    </Stack>
                    <Spacer />
                    <Badge tone="yellow">{timeLeft(p.secondsLeft)}</Badge>
                  </Row>
                  <Row gap={2}>
                    <Badge tone="blue">{p.role}</Badge>
                    <Text size="sm" muted>needs a</Text>
                    <Badge tone="pink">{p.lookingFor}</Badge>
                  </Row>
                  {p.skills && <Text size="sm" muted>{p.skills}</Text>}
                  {p.note && <Text>{p.note}</Text>}
                  <Row justify="between">
                    <Text mono>{p.contact}</Text>
                    {account && p.owner.toLowerCase() === account.toLowerCase() && (
                      <Confirm
                        title="Delete this post?"
                        body="It will be removed from Arkiv for everyone."
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
                </Stack>
              </Card>
            ))
          )}
        </Stack>
      </Shell>
      <Toaster />
    </TooltipProvider>
  )
}
