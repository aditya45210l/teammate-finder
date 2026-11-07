import {
  Avatar, Badge, Blob, Button, Card, CTA, Eyebrow, Footer, Grid, Heading, Highlight,
  Navbar, Page, Row, Section, Spacer, Stack, Text,
} from './components/pouf'

const brand = (
  <>
    <Blob icon="users" tone="purple" size="sm" />
    Teamfinder
  </>
)

const STEPS = [
  { icon: 'user', tone: 'purple', title: '1. Say who you are', body: 'Your role, your skills and who you are missing. Takes under a minute.' },
  { icon: 'search', tone: 'blue', title: '2. Find your match', body: 'Filter by the role you need and search skills like solidity or figma.' },
  { icon: 'send', tone: 'pink', title: '3. Ping them', body: 'Contact details are right on the card. Go build something together.' },
] as const

const FEATURES = [
  { icon: 'clock', tone: 'yellow', title: 'Posts expire in 24h', body: 'No stale listings. Every post disappears on its own after a day.' },
  { icon: 'lock', tone: 'mint', title: 'Only you can delete', body: 'Posts belong to your wallet. Nobody else can edit or remove them.' },
  { icon: 'database', tone: 'orange', title: 'No backend, no signup', body: 'Connect a wallet and you are in. Your wallet is your identity.' },
] as const

interface Props {
  onLaunch: () => void
}

export default function Landing({ onLaunch }: Props) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <Page>
      <Stack gap={8}>
        <Navbar
          brand={brand}
          links={[
            { label: 'How it works', href: '#how' },
            { label: 'Why it is different', href: '#why' },
          ]}
          actions={<Button size="sm" tone="pink" onClick={onLaunch}>Launch</Button>}
        />

        <Grid cols="sidebar" gap={7}>
          <Stack gap={4}>
            <Row gap={2}>
              <Badge tone="yellow">ETHGlobal Mumbai</Badge>
              <Badge tone="mint">Wallet sign-in</Badge>
            </Row>
            <Heading level={1}>
              Find your <Highlight>dream team</Highlight> before the clock runs out.
            </Heading>
            <Text muted>
              Hackers post who they are and who they need. Every post expires in 24 hours,
              so everyone you see is still looking.
            </Text>
            <Row gap={3}>
              <Button size="lg" tone="purple" onClick={onLaunch}>Find teammates</Button>
              <Button size="lg" variant="quiet" onClick={() => scrollTo('how')}>How it works</Button>
            </Row>
            <Text size="sm" muted>No signup. Just a wallet.</Text>
          </Stack>

          <Card motion="tilt-right">
            <Stack gap={3}>
              <Row>
                <Avatar fallback="AS" tone="purple" />
                <Stack gap={1}>
                  <Heading level={3}>Asha</Heading>
                  <Text size="sm" muted mono>0x1234…5678</Text>
                </Stack>
                <Spacer />
                <Badge tone="yellow">3h left</Badge>
              </Row>
              <Row gap={2}>
                <Badge tone="blue">frontend</Badge>
                <Text size="sm" muted>needs a</Text>
                <Badge tone="pink">contracts</Badge>
              </Row>
              <Text size="sm" muted>react, wagmi, tailwind</Text>
              <Text>Building a payments dapp, need a Solidity dev.</Text>
              <Text mono>tg: @asha_dev</Text>
            </Stack>
          </Card>
        </Grid>

        <Section id="how">
          <Stack gap={4}>
            <Stack gap={1}>
              <Eyebrow>How it works</Eyebrow>
              <Heading level={2}>From lonely to a full team in three steps</Heading>
            </Stack>
            <Grid cols={3}>
              {STEPS.map((s, i) => (
                <Card key={s.title} motion={i % 2 === 0 ? 'tilt-left' : 'tilt-right'}>
                  <Stack gap={3}>
                    <Blob icon={s.icon} tone={s.tone} />
                    <Heading level={3}>{s.title}</Heading>
                    <Text size="sm" muted>{s.body}</Text>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Stack>
        </Section>

        <Section id="why">
          <Stack gap={4}>
            <Stack gap={1}>
              <Eyebrow>Why it is different</Eyebrow>
              <Heading level={2}>A job board that cleans up after itself</Heading>
            </Stack>
            <Grid cols={3}>
              {FEATURES.map((f) => (
                <Card key={f.title} motion="lift">
                  <Stack gap={3}>
                    <Blob icon={f.icon} tone={f.tone} />
                    <Heading level={3}>{f.title}</Heading>
                    <Text size="sm" muted>{f.body}</Text>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Stack>
        </Section>

        <CTA
          tone="purple"
          title="Your teammate is probably posting right now."
          description="Jump in, post in a minute, and get back to building."
          action={<Button size="lg" tone="pink" onClick={onLaunch}>Launch app</Button>}
        />

        <Footer
          brand={brand}
          tagline="A tiny teammate board for hackathon people."
          columns={[
            { title: 'Built with', links: [{ label: 'MongoDB Atlas', href: 'https://www.mongodb.com/atlas' }, { label: '1st-Pouf', href: 'https://github.com/moji2002/1st-pouf' }] },
          ]}
          note="Made for ETHGlobal Mumbai."
        />
      </Stack>
    </Page>
  )
}
