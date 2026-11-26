# cache-bar

A Claude Code mod that adds one bar above the prompt box.

- **Prompt cache:** `warm` with the minutes left, or `cold`. The lifetime (5 minutes or 1 hour) comes from what the API reports for your last main request. If none is reported it shows "5 min assumed". The bar makes no model calls.
- **Master prompt:** rewrites the draft in your prompt box and puts it back so you can read it. It never sends it. **Undo** restores your draft.

In the terminal, click a button, or press `ctrl+x tab` and then `m` (rewrite) or `u` (undo).

## Install

At the prompt of a terminal session:

```
/plugin install cache-bar --marketplace ai-rio/cache-bar
```

Answer `y` to add the marketplace, then choose a scope.

From a shell:

```
claude plugin install cache-bar --marketplace ai-rio/cache-bar
```

From a clone:

```
git clone https://github.com/ai-rio/cache-bar
claude plugin marketplace add ./cache-bar
claude plugin install cache-bar@cache-bar
```

In the desktop app, click + next to the prompt box, then Plugins, Add marketplace with `ai-rio/cache-bar`, then Add plugin.

To remove it: `claude plugin uninstall cache-bar@cache-bar`.

## What it accesses

| Access | When | Why |
|---|---|---|
| Reads your prompt draft | On a Master prompt press | To rewrite it |
| Reads `HOME` or `USERPROFILE`, then `~/.claude/skills/be-ambitious/SKILL.md` | On a press | Rewrite guidance |
| **Sends your draft and that skill file to a Claude Sonnet model** | On a press only | The rewrite. It counts toward your usage |
| Writes the prompt box | On a press, or Undo | To show the rewrite or restore your draft |
| Writes the clipboard | Only if you typed during the rewrite, or the box could not be filled | So the rewrite is not lost |
| Observes each model request (`turn.step`) and keeps only its start time and cache lifetime, for the main conversation | While loaded | The cache countdown |
| Is notified of each prompt you send (`prompt.submit`), passes it on unchanged and reads none of it; it only clears the Undo draft | While loaded | Undo |
| Keeps session state (including the pre-rewrite draft for Undo); runs a 15 second timer | While loaded | Countdown and Undo |

It writes no files, starts no processes and contacts no service other than the model call above, which goes through Claude Code's own client.

## The be-ambitious skill

Optional and not included. If it is installed at `~/.claude/skills/be-ambitious`, the rewrite follows it. Otherwise a short built-in instruction is used and a notice says so.

## Limits

- After `/model` or a compaction the bar can say warm until your next request.
- A new or resumed session starts as cold.
- Drafts starting with `/` or `!` are left alone.
- Built and tested on Claude Code 2.1.332 under Linux (WSL2). The Desktop app has not been tried by hand.
- Mods are an early-access API and may change between releases.

## Test

```
claude plugin validate .
claude plugin test .
```

The tests fake the model, so they do not judge rewrite quality.

## License

MIT
