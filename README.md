# SteemTwist
**Steem with a Twist** — a decentralised microblogging dApp built on the Steem blockchain.

Your posts are permanent and censorship-resistant. No backend, no build tools, no server — just four static files.

---

## Terminology

SteemTwist uses its own vocabulary. The blockchain object names are never shown in the UI.

| Blockchain object | SteemTwist term |
|---|---|
| Root monthly post | Feed root |
| Comment reply | **Twist** |
| Reply to twist | Reply |
| Comment tree | Thread |
| Upvote | **Twist love** ❤️ |
| Resteem | **Retwist** 🔁 |

---

Every twist is a Steem blockchain **comment** posted as a reply under a shared monthly root post owned by `@steemtwist`. All twists for a given month live under a single parent, making them cheap to query with one API call.

```
@steemtwist/feed-2026-03          ← monthly root
├── @alice/tw-20260315-091530-alice
├── @bob/tw-20260315-102244-bob
└── @alice/tw-20260315-140001-alice
    └── @bob/tw-20260315-150012-bob       ← reply to a twist
        └── @alice/tw-20260315-160300-alice  ← reply to reply
```

**Permlink format:** `tw-YYYYMMDD-HHMMSS-username`
All timestamps use **UTC** to match the Steem blockchain clock.

**Monthly root format:** `feed-YYYY-MM`

---

## Features

- 📝 Post twists up to 280 characters
- 💬 Reply to any twist inline, with recursive nested replies auto-expanded two levels deep
- ❤️ Give twist love (upvote) to any twist or reply
- 🔁 Retwist (resteem) any other user's twist
- 🔀 Sort feed by **New**, **Hot** (time-decayed votes), or **Top** (pure vote weight)
- 🔥 Firehose live mode — streams new twists and votes in real time without polling
- 📖 Thread expansion — long twists and busy threads collapse to a 280-char preview; click to expand
- 🧵 Twist-specific page — dedicated permalink page for every twist, showing a quoted parent snippet when the twist is a reply
- 👤 User profile pages — avatar, bio, cover image, and monthly twist history filtered to that user only
- 📌 Pin a twist — pin one of your own twists to the top of your profile and the home feed
- 🔄 RPC fallback across multiple nodes
- 🔒 Read-only mode when Steem Keychain is not installed
- ⚠️ Actual blockchain error messages surfaced on failed transactions

---

## Tech stack

| Layer | Technology |
|---|---|
| Blockchain API | [steem-js](https://github.com/steemit/steem-js) |
| Signing | [Steem Keychain](https://github.com/steem-monsters/steem-keychain) |
| UI framework | [Vue 3](https://vuejs.org/) (CDN) |
| Routing | [Vue Router 4](https://router.vuejs.org/) (CDN) |
| Markdown | [marked.js](https://marked.js.org/) (CDN) |
| Hosting | GitHub Pages (static) |

No npm, no bundler, no backend.

---

## Project structure

```
steemtwist/
├── index.html       # HTML shell — loads CDN scripts and mounts #app
├── blockchain.js    # All Steem API and Keychain helpers (no Vue)
├── components.js    # Reusable Vue 3 components
└── app.js           # Vue app entry point — views, router, root App
```

### `blockchain.js`

Pure async helpers with no Vue or DOM dependencies.

**RPC & fallback**
- `setRPC(index)` — switch active RPC node
- `callWithFallback(...)` — retries across the node list on error
- `callWithFallbackAsync(...)` — Promise wrapper for the above

**Account**
- `fetchAccount(username)` — returns `{ username, profileImage, displayName, about, coverImage }`

**Posts**
- `fetchPost(author, permlink)` — single post via `getContent`; always returns populated `active_votes`
- `fetchReplies(author, permlink)` — direct replies via `getContentReplies`; note that `active_votes` is always empty from this API regardless of the post — callers must enrich with `fetchPost` if vote counts are needed
- `fetchPostsByTag(tag, limit)` — recent posts by tag
- `fetchPostsByUser(username, limit)` — recent posts from a user's blog

**SteemTwist feed helpers**
- `TWIST_CONFIG` — central config (`ROOT_ACCOUNT`, `ROOT_PREFIX`, `TAG`, `POST_PREFIX`, `TAGS`, `DAPP_URL`)
- `getMonthlyRoot()` → e.g. `feed-2026-03` (UTC)
- `generateTwistPermlink(username)` → e.g. `tw-20260315-091530-alice` (UTC)
- `fetchTwistFeed(monthlyRoot)` — fetches the month's twists via `getContentReplies` on the monthly root, then enriches each with `fetchPost` in parallel (required because `getContentReplies` always returns empty `active_votes`)
- `fetchTwistsByUser(username, monthlyRoot)` — scans the user's account history in reverse-chronological batches of 100, filtering to ops where `author === username` and `permlink` starts with `tw-`; used by `ProfileView` instead of loading the full feed; stops paging once entries predate the current month
- `buildZeroPayoutOps(...)` — builds a `[comment, comment_options]` operation pair with `max_accepted_payout = "0.000 SBD"` and `allow_votes = true`; appends a `Posted via SteemTwist` back-link to the body
- `postTwist(username, message, callback)` — broadcasts comment + comment_options atomically via `requestBroadcast`
- `postTwistReply(username, message, parentAuthor, parentPermlink, callback)` — same, for inline replies to twists or other replies
- `voteTwist(voter, author, permlink, weight, callback)` — upvote via Keychain
- `retwistPost(username, author, permlink, callback)` — resteem via `custom_json` under the `follow` plugin

**Sorting**
- `sortTwists(posts, mode)` — returns a new sorted array; never mutates. Modes:
  - `"new"` — chronological, newest first
  - `"hot"` — Hacker News gravity decay: `voteWeight / (ageHours + 2)^1.5`
  - `"top"` — pure sum of positive vote percents (SP-weighted, no time decay)

**Firehose**
- `startFirehose(monthlyRoot, onTwist, onVote)` — streams live blockchain operations:
  - `onTwist(post, isUpdate)` — called on new top-level twists, then again 4 s later with the enriched post
  - `onVote(author, permlink, voter, weight)` — called on every vote so `HomeView` can re-rank in memory without a full reload
  - Returns `{ stop() }` to cancel the stream

**Pin / Unpin**
- `pinTwist(username, author, permlink, callback)` — broadcasts `{ action: "pin", author, permlink }` as a `custom_json` with `id = "steemtwist"`
- `unpinTwist(username, callback)` — broadcasts `{ action: "unpin" }`
- `fetchPinnedTwist(username)` — walks account history newest-first, finds the latest `custom_json` with `id = "steemtwist"` and action `"pin"` or `"unpin"`, then fetches and returns the pinned post or `null`; checks a `localStorage` cache first to bridge the window between broadcast and node indexing (TTL: 5 minutes per username)
- `setPinCache(username, author, permlink)` — writes the pending pin to localStorage immediately after a successful broadcast
- `clearPinCache(username)` — removes the cache entry once the chain has caught up
- `getPinCache(username)` — returns the cached entry if within TTL, otherwise removes it and returns `null`

**Keychain**
- `keychainLogin(username, callback)` — sign-buffer login flow

**Utilities**
- `steemDate(ts)` — appends `Z` to Steem timestamps for correct UTC parsing
- `stripBackLink(text)` — removes the `Posted via SteemTwist` footer before rendering

---

## Data source architecture

| Context | API used | Why |
|---|---|---|
| Home feed (all authors) | `getContentReplies` on monthly root + `fetchPost` per twist | One call for the list; parallel enrichment required for `active_votes` (node quirk: `getContentReplies` always returns empty `active_votes`) |
| Profile page (one author) | `getAccountHistory` + `fetchPost` per twist | Scans one user's op log with an `author` filter; stops at month boundary — much faster than loading the full feed |
| Reply threads | `getContentReplies` on the twist + `fetchPost` per reply | Same enrichment required for correct Love counts |
| Pinned twist | `getAccountHistory` scan + localStorage cache | Latest `custom_json` pin/unpin action; cache covers the broadcast-to-indexing delay |
| Real-time updates | `streamOperations` (firehose) | Pushed by the node on every new block (~3 s) |

---

### `components.js`

Reusable Vue 3 components.

- `AppNotificationComponent` — toast bar (success / info / error); auto-dismisses non-errors after 3.5 s
- `AuthComponent` — Keychain login input and logout button; Enter submits, Escape cancels
- `UserProfileComponent` — cover image, avatar, display name, and bio
- `LoadingSpinnerComponent` — animated spinner with message
- `ReplyCardComponent` — renders a single reply with love, retwist, and reply actions; auto-expands nested children for the first two depth levels (`depth < 2`)
- `ThreadComponent` — lazy-loads direct replies via `getContentReplies`, enriches `active_votes` via parallel `fetchPost` calls, renders each as a `ReplyCardComponent`
- `TwistCardComponent` — renders one twist; collapses long/busy posts with a preview and "Expand thread" button; action bar (Love / Retwist / Reply / Pin) is always positioned directly below the body, independent of thread expansion; emits `pin` and `unpin` events to parent views
- `TwistComposerComponent` — textarea with 280-char counter and post button (Ctrl+Enter supported)

**Thread expansion constants** (top of `components.js`)

| Constant | Default | Meaning |
|---|---|---|
| `PREVIEW_LENGTH` | `280` | Body chars before collapse triggers |
| `THREAD_REPLY_THRESHOLD` | `3` | Reply count before collapse triggers |

**Auto-expansion depth**

Replies expand automatically for the first two nesting levels. `ReplyCardComponent` initialises `showChildren = depth < 2`, so depth-0 and depth-1 replies expand on mount; depth-2 and beyond stay collapsed and require a manual click.

**Action bar position**

`TwistCardComponent` renders its footer actions (Love / Retwist / Reply / Pin) before `ThreadComponent` in the DOM, so expanding replies appends below the action bar rather than pushing it down.

---

### `app.js`

Vue Router views and root App shell.

**Views**

| Route | View | Description |
|---|---|---|
| `/` | `HomeView` | Monthly feed + composer; sort tabs (New / Hot / Top); firehose toggle; pinned twist banner at top |
| `/@:user` | `ProfileView` | Cover image, avatar, bio; pinned twist banner; user's twists for the month (filtered to that user only via account history scan) |
| `/@:user/:permlink` | `TwistView` | Single twist permalink page; shows a quoted parent snippet (author avatar, body preview, and link) when the twist is a reply to another twist; parent identified by `parent_permlink` not starting with `feed-` |
| `/about` | `AboutView` | Renders `README.md` via marked.js |

**HomeView — feed loading**

`loadFeed(refreshPin = false)` fetches the feed and optionally re-fetches the pinned twist from chain:
- `loadFeed(true)` — on initial page mount and manual Refresh; reads the pin from chain
- `loadFeed()` — on vote-triggered reloads; preserves the current `pinnedTwist` in memory to avoid overwriting a just-broadcast pin before the node has indexed it

**Pinned twist**

A user can pin one of their own twists. The pinned twist is:
- Fetched on page load via `fetchPinnedTwist`, which checks a localStorage cache before reading chain history
- Displayed above the feed / profile twist list with a 📌 label
- Deduplicated from the regular list so it never appears twice
- Updated immediately in memory when the user pins or unpins (no reload required)
- Persisted correctly across page reloads via the localStorage cache, bridging the delay between Keychain broadcast and node indexing

**Parent twist context (TwistView)**

When viewing a reply's permalink page, a context box is shown above the card if `parent_permlink` does not start with `feed-` (the monthly root prefix). The box shows the parent author's avatar, a plain-text snippet of the parent body (stripped of markdown and back-links, truncated to 160 chars), and a link to the parent's own twist page.

**Root App**
- Full-bleed header with the user's cover image, avatar, display name, and bio (falls back to `@steemtwist` when no one is logged in)
- Gradient overlay for nav legibility over any cover image
- Keychain detection with read-only notice
- Global notification bar (auto-dismiss for success/info; manual dismiss for errors)
- Shared state (`username`, `hasKeychain`, `notify`) provided to all views via `provide`/`inject`

---

## No payouts by design

SteemTwist deliberately disables monetary rewards on all twists and replies. This is enforced at the **protocol level**, not just the UI, by broadcasting a `comment_options` operation atomically alongside every `comment`:

```
max_accepted_payout    = "0.000 SBD"
allow_votes            = true    ← likes still work as appreciation signals
allow_curation_rewards = false
```

Because both operations are sent in the same transaction, the payout limit is set from the moment of posting and cannot be changed retroactively.

**Why:**
- Prevents reward farming bots (no financial incentive for spam)
- Keeps the Steem reward pool for long-form content
- Removes payout timers and reward calculations from the UI
- Reduces vote-buying and trending manipulation
- Keeps the ecosystem community-driven

Twist love remains enabled so users can still express appreciation — the heart just doesn't move money.

---

## RPC nodes

Requests fall back automatically across this list if a node fails:

1. `https://api.steemit.com`
2. `https://api.justyy.com`
3. `https://steemd.steemworld.org`
4. `https://api.steem.fans`

---

## Hosting on GitHub Pages

1. Push the four files to a GitHub repository.
2. Go to **Settings → Pages** and set the source to the `main` branch root.
3. Your dApp will be live at `https://<your-username>.github.io/<repo-name>/`.

The `#`-based hash router (`createWebHashHistory`) ensures all routes work without server-side configuration.

---

## Setup for `@steemtwist`

The monthly root posts (`feed-YYYY-MM`) must exist on-chain before any twists can be posted against them. Create each month's root post from the `@steemtwist` account at the start of the month:

```
author:         steemtwist
permlink:       feed-2026-03
parentPermlink: steemtwist   ← the main tag
title:          (empty)
body:           SteemTwist feed — March 2026
```

---

## License

MIT
