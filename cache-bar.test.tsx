import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'cache-bar',
  component: 'AbovePrompt',
  requestId: 'band',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 100, model: 'm' }

// The countdown tests redraw every 15 mocked seconds, which is slow on a loaded machine.
const SLOW = { timeoutMs: 180_000 }

// Stands for the engine beneath the plugin and counts what the mod asks of it.
const world = (on: any, { draft = 'fix the bug', reply = '<prompt>BETTER</prompt>', during }: { draft?: string; reply?: string; during?: string } = {}) => {
  const seen = { models: 0, submits: 0, copies: 0, fills: [] as string[], box: draft, usage: null as any }
  const clock = mock.clock(on, { now: 1_000 })
  mock.env(on, { HOME: '/home/u' })
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('fs.read', () => ({ value: 'SKILL' }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.copy', () => { seen.copies += 1; return { value: { isCopied: true } } })
  on('prompt.read', () => ({ value: { text: seen.box, cursor: 0 } }))
  on('prompt.fill', (_: any, e: any) => { seen.fills.push(e.text); seen.box = e.text; return { isFilled: true, text: e.text, cursor: 0 } })
  on('prompt.submit', () => { seen.submits += 1; return {} })
  on('model.complete', () => {
    seen.models += 1
    if (during !== undefined) seen.box = during
    return { value: { isAnswered: true, text: reply, usage: USAGE } }
  })
  on('turn.step', async function* (_: any, e: any) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: seen.usage }
  })
  return { seen, clock }
}

const step = async ($: any, agentId?: string) => {
  for await (const _ of $.turn.step({ turnId: 't', index: 0, model: 'm', messageCount: 1, agentId })) void _
}

const start = ($: any) => $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
const line = async (ui: any) => (await ui.find({ type: 'Text', text: /cache/ }))?.text

for (const [name, field, minutes] of [['5m', 'ephemeral_5m_input_tokens', 5], ['1h', 'ephemeral_1h_input_tokens', 60]] as const) {
  test(`${name} cache counts down to cold with no model call`, SLOW, async ($, on) => {
    const { seen, clock } = world(on)
    await start($)
    const ui = await $.ui.mount({ ...BAND, surface: minutes === 5 ? 'desktop' : 'terminal' })
    expect(await line(ui)).toMatch(/cold/)
    seen.usage = { ...USAGE, ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0, [field]: 100 }
    await step($)
    expect(await line(ui)).toMatch(new RegExp(`warm · ${minutes} min`))
    await clock.advance((minutes - 1) * 60_000)
    expect(await line(ui)).toMatch(/warm · 1 min/)
    await clock.advance(60_000)
    expect(await line(ui)).toMatch(/cold/)
    expect(seen.models).toBe(0)
    await ui.unmount()
  })
}

test('a read-only request keeps the lifetime; a subagent request is ignored', SLOW, async ($, on) => {
  const { seen, clock } = world(on)
  await start($)
  seen.usage = { ...USAGE, ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 100 }
  await step($, 'sub')
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await line(ui)).toMatch(/cold/)
  await step($)
  await clock.advance(600_000)
  seen.usage = { ...USAGE, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
  await step($)
  expect(await line(ui)).toMatch(/warm · 60 min/)
  await ui.unmount()
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: a press rewrites the draft once, never sends it, and Undo restores`, SLOW, async ($, on) => {
    const { seen } = world(on)
    await start($)
    const ui = await $.ui.mount({ ...BAND, surface })
    await ui.press({ key: 'master' })
    expect(seen.models).toBe(1)
    expect(seen.fills).toEqual(['BETTER'])
    await ui.press({ key: 'undo' })
    expect(seen.box).toBe('fix the bug')
    expect(seen.submits).toBe(0)
    expect(seen.models).toBe(1)
    await ui.unmount()
  })
}

for (const [name, draft] of [['empty', '  '], ['slash command', '/clear']] as const) {
  test(`${name} draft makes no model call`, SLOW, async ($, on) => {
    const { seen } = world(on, { draft })
    await start($)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    await ui.press({ key: 'master' })
    expect(seen.models).toBe(0)
    expect(seen.fills).toEqual([])
    await ui.unmount()
  })
}

test('a cut-off reply leaves the draft alone', SLOW, async ($, on) => {
  const { seen } = world(on, { reply: '<prompt>half' })
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'master' })
  expect(seen.fills).toEqual([])
  await ui.unmount()
})

test('typing during the call is not overwritten', SLOW, async ($, on) => {
  const { seen } = world(on, { during: 'new typing' })
  await start($)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'master' })
  expect(seen.box).toBe('new typing')
  expect(seen.fills).toEqual([])
  expect(seen.copies).toBe(1)
  await ui.unmount()
})
