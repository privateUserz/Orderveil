import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../src/app/i18n.js'
import App from '../src/App.jsx'

function renderAt(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  window.sessionStorage.clear()
  window.localStorage.clear()
  await act(() => i18n.changeLanguage('en'))
})

describe('routes', () => {
  it('renders the home page with brand, hero and disclaimer', async () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: 'A fairer transaction layer.' })).toBeInTheDocument()
    expect(screen.getAllByText(/not affiliated with or endorsed by BNB Chain/).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Explore Gateway Lab/ })).toHaveAttribute('href', '/playground')
  })

  it.each([
    ['/technology', 'Exploring the BNB Chain NewL1 vision'],
    ['/playground', 'Run the same trade under three ordering models'],
    ['/network', 'Gateway topology, driven by the engine'],
    ['/docs', 'Introduction'],
    ['/docs/amm-math', 'AMM Mathematics'],
    ['/does-not-exist', "This route isn't part of the experiment."],
  ])('renders %s', async (path, heading) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('links official NewL1 references', async () => {
    renderAt('/technology')
    await screen.findByRole('heading', { level: 1, name: 'Exploring the BNB Chain NewL1 vision' })
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(links).toContain('https://forum.bnbchain.org/t/introducing-newl1-mev-solution-tee-gateway/5589')
    expect(links).toContain('https://forum.bnbchain.org/t/about-the-bnbchain-newl1-category/5437')
  })
})

describe('header', () => {
  it('navigates between pages', async () => {
    renderAt('/')
    const nav = screen.getAllByRole('navigation', { name: 'Primary' })[0]
    await userEvent.click(within(nav).getByRole('link', { name: 'Docs' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Introduction' })).toBeInTheDocument()
  })

  it('wallet button opens the wallet picker (no fake connection)', async () => {
    renderAt('/')
    await userEvent.click(screen.getAllByRole('button', { name: /Connect Wallet/ })[0])
    expect(await screen.findByText('Connect a Wallet', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByText('MetaMask')).toBeInTheDocument()
  })

  it('mobile menu toggles', async () => {
    renderAt('/')
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(document.getElementById('mobile-nav')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }))
  })
})

describe('i18n', () => {
  it('switches language without losing route or parameters, and persists it', async () => {
    renderAt('/playground')
    await screen.findByRole('heading', { level: 1, name: 'Run the same trade under three ordering models' })
    const input = screen.getByRole('textbox', { name: 'Trade amount' })
    fireEvent.change(input, { target: { value: '7000' } })
    await userEvent.click(screen.getAllByRole('button', { name: '中文' })[0])
    expect(await screen.findByRole('heading', { level: 1, name: '同一笔交易，三种排序模型' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '交易数量' })).toHaveValue('7000')
    expect(window.localStorage.getItem('orderveil.lang')).toBe('zh-CN')
    expect(document.documentElement.lang).toBe('zh-CN')
  })
})

describe('playground', () => {
  it('recomputes results when inputs change', async () => {
    renderAt('/playground')
    await screen.findByRole('heading', { level: 1, name: 'Run the same trade under three ordering models' })
    const card = () => screen.getByText('User output').parentElement.textContent
    const before = card()
    fireEvent.change(screen.getByRole('textbox', { name: 'Trade amount' }), { target: { value: '12000' } })
    expect(card()).not.toBe(before)
  })

  it('shows a coded validation error for invalid input', async () => {
    renderAt('/playground')
    await screen.findByRole('heading', { level: 1, name: 'Run the same trade under three ordering models' })
    fireEvent.change(screen.getByRole('textbox', { name: 'Trade amount' }), { target: { value: '0' } })
    expect(screen.getAllByText('Amount must be greater than zero.').length).toBeGreaterThan(0)
  })

  it('switches execution mode and updates the outcome title', async () => {
    renderAt('/playground')
    await screen.findByText('Outcome · Public')
    await userEvent.click(screen.getAllByRole('radio', { name: 'Opt-in' })[0])
    expect(screen.getByText('Outcome · Opt-in')).toBeInTheDocument()
    expect(screen.getByText('Opt-in refund')).toBeInTheDocument()
  })

  it('replays the current experiment and reports Replay Passed', async () => {
    renderAt('/playground')
    await screen.findByText('Outcome · Public')
    await userEvent.click(screen.getByRole('tab', { name: 'Audit & Replay' }))
    await userEvent.click(screen.getByRole('button', { name: 'Replay current' }))
    expect(await screen.findByText('Replay Passed')).toBeInTheDocument()
    expect(screen.getByText('On-chain commitment')).toBeInTheDocument()
  })

  it('reports Replay Failed for a tampered pasted record', async () => {
    renderAt('/playground')
    await screen.findByText('Outcome · Public')
    await userEvent.click(screen.getAllByRole('radio', { name: 'Protected' })[0])
    await userEvent.click(screen.getByRole('tab', { name: 'Audit & Replay' }))
    const { runScenario } = await import('../src/simulation/mev/scenario.js')
    const { normalizeParams, DEFAULT_PARAMS } = await import('../src/simulation/mev/params.js')
    const { buildExperimentRecord } = await import('../src/simulation/replay/record.js')
    const rec = buildExperimentRecord(runScenario(normalizeParams({ ...DEFAULT_PARAMS, mode: 'protected' })))
    rec.outputs.ordering.ticks[1].inputCommitment = '0x' + 'ab'.repeat(32)
    fireEvent.change(screen.getByLabelText('…or paste JSON'), { target: { value: JSON.stringify(rec) } })
    await userEvent.click(screen.getByRole('button', { name: 'Verify pasted record' }))
    expect(await screen.findByText('Replay Failed')).toBeInTheDocument()
  })

  it('shows tick and SubBlock data for gateway modes', async () => {
    renderAt('/playground')
    await screen.findByText('Outcome · Public')
    await userEvent.click(screen.getAllByRole('radio', { name: 'Protected' })[0])
    await userEvent.click(screen.getByRole('tab', { name: 'Ordering & Ticks' }))
    expect(screen.getByText('SubBlock header')).toBeInTheDocument()
    expect(screen.getByText('not produced (no TEE)')).toBeInTheDocument()
  })
})

describe('network topology', () => {
  it('renders nodes, opens node details on click and runs stages from engine data', async () => {
    renderAt('/network')
    await screen.findByRole('heading', { level: 1, name: 'Gateway topology, driven by the engine' })
    const node = await screen.findByText('Protected Queue', { selector: '.react-flow__node *' }, { timeout: 5000 }).catch(() => null)
    const el = node ?? document.querySelector('.react-flow__node[data-id="protectedQueue"]')
    expect(el).toBeTruthy()
    fireEvent.click(el.closest('.react-flow__node'))
    expect(await screen.findByText(/Default path. Contents are never disclosed/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole('button', { name: 'Step' }))
    expect(screen.getByText(/Executed on the simulated AMM/)).toBeInTheDocument()
  })
})
