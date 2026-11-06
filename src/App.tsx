import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Avatar, Badge, Button, Card, Confirm, Dialog, Empty, ErrorNote, Field, Heading, Input,
  Row, Select, Shell, Sidebar, Skeleton, Spacer, Stack, Text, Textarea, Toaster, TooltipProvider, toast,
} from './components/pouf'
import { connectWallet, createPost, deletePost, listPosts, type NewPost, type Post } from './arkiv/api'
import { POST_LIFETIME_HOURS, ROLES } from './arkiv/schema'
import Landing from './Landing'
import { filterBySkill, message, short, timeLeft, validatePost } from './lib'

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

  useEffect(() => {
    let stale = false
    listPosts({ need: need === ANY ? undefined : need, role: role === ANY ? undefined : role })
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
  }, [need, role, reload])

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
      setAccount(await connectWallet())
      toast.success('Wallet connected')
    } catch (e) {
      toast.error('Could not connect', { description: message(e) })
    }
  }

  const submit = async () => {
    if (!account) return toast.warning('Connect your wallet first')
    const problem = validatePost(form)
    if (problem) return toast.warning(problem)
    setSaving(true)
    try {
      await createPost(account, { ...form, name: form.name.trim(), contact: form.contact.trim() })
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
    if (!account) return
    setDeleting(post.key)
    try {
      await deletePost(account, post.key)
      toast.success('Post deleted')
      refresh()
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
