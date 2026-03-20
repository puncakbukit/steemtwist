# SteemTwist
**Steem with a Twist** — a decentralised microblogging dApp built on the Steem blockchain.

Your posts are permanent and censorship-resistant. No backend, no build tools, no server — just four static files.

---

## Vocabulary

SteemTwist uses its own vocabulary. The blockchain object names are never shown in the UI.

| Concept | SteemTwist term | Icon |
|---|---|---|
| Root monthly post | Feed root | — |
| Comment reply | **Twist** | 🌀 |
| Reply to twist | **Thread Reply** | 💬 |
| Comment tree | Thread | — |
| Upvote | **Twist Love** | ❤️ |
| Resteem | **Retwist** | 🔁 |
| Timeline | **Twist Stream** | — |
| Notifications | **Signals** | 🔔 |
| Mention | Mention | 📣 |
| Follow | Follow | 👤 |

---

## Data model

Every twist is a Steem blockchain **comment** posted as a reply under a shared monthly root post owned by `@steemtwist`. All twists for a given month live under a single parent, making them cheap to query with one API call.

```
@steemtwist/feed-2026-03               ← monthly root
├── @alice/tw-20260315-091530-alice     ← twist
├── @bob/tw-20260315-102244-bob         ← twist
│   └── @alice/tw-20260315-150012-alice ← thread reply
│       └── @bob/tw-20260315-160300-bob ← reply to reply
└── @alice/tw-20260315-140001-alice     ← another twist
```

**Permlink format:** `tw-YYYYMMDD-HHMMSS-username` (UTC)

**Monthly root format:** `feed-YYYY-MM`

---

## Features

- 📝 Post twists up to 280 characters
- 💬 Thread replies — reply to any twist inline; reply to replies recursively; auto-expanded two levels deep
- ❤️ Twist Love — upvote any twist or reply
- 🔁 Retwist — resteem any other user's twist
- 📌 Pin — pin one of your own twists to the top of your profile and the home feed
- 🔀 Sort feed by **New**, **Hot** (time-decayed votes), or **Top** (pure vote weight)
- 🔥 Firehose — streams live twists and votes in real time without polling
- 📖 Thread expansion — long twists and busy threads collapse to a 280-char preview; click to expand
- 🧵 Twist page — dedicated permalink page for every twist, with a quoted parent snippet when it is a reply
- 👤 Profile pages — cover image, avatar, bio, and monthly twist history per user
- 👥 Social pages — Followers, Following, and Friends (mutual follows) for any user
- 🔔 Signals — notification feed showing Twist Love, Thread Replies, Mentions, Follows, and Retwists; read/unread tracking; All / Unread filter tabs
- 🌊 Understream — toggle between **Twist Stream** (SteemTwist-only data) and **Understream** (full Steem data) on Home, Profile, and Signals pages
- 🔄 RPC fallback across four nodes
- 🔒 Read-only mode when Steem Keychain is not installed
- ⚠️ Blockchain error messages surfaced on failed transactions

---

## Twist Stream vs Understream

SteemTwist has two data modes, switchable via the 🌊 toggle. The preference is persisted in `localStorage`.

| Page | Twist Stream (OFF) | Understream (ON) |
|---|---|---|
| **Home** | `getContentReplies` on monthly root — SteemTwist twists only | `getDiscussionsByCreated` for tag `steemtwist` — any Steem post using the tag |
| **Profile** | Account history scan for `tw-` permlinks this month | `getDiscussionsByBlog` — full Steem blog (all post types) |
| **Signals** | Only signals where `permlink` starts with `tw-` (plus follows) | All Steem activity — votes, replies, mentions on any post |

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

---

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
- `fetchReplies(author, permlink)` — direct replies via `getContentReplies`; note `active_votes` is always empty from this API — callers must enrich with `fetchPost` per reply for correct vote counts
- `fetchPostsByTag(tag, limit)` — recent posts by tag via `getDiscussionsByCreated`; used by HomeView Understream mode
- `fetchPostsByUser(username, limit)` — recent posts from a user's blog via `getDiscussionsByBlog`; used by ProfileView Understream mode

**SteemTwist feed**
- `TWIST_CONFIG` — central config: `ROOT_ACCOUNT`, `ROOT_PREFIX`, `TAG`, `POST_PREFIX`, `TAGS`, `DAPP_URL`
- `getMonthlyRoot()` → e.g. `feed-2026-03` (UTC)
- `generateTwistPermlink(username)` → e.g. `tw-20260315-091530-alice` (UTC)
- `fetchTwistFeed(monthlyRoot)` — fetches the month's twists via `getContentReplies` on the monthly root; enriches each in parallel with `fetchPost` (required: `getContentReplies` always returns empty `active_votes`)
- `fetchTwistsByUser(username, monthlyRoot)` — scans account history backwards in batches of 100; keeps only `comment` ops where `author === username` and `permlink` starts with `tw-`; stops at the month boundary; used by ProfileView Twist Stream mode
- `buildZeroPayoutOps(...)` — builds a `[comment, comment_options]` pair with `max_accepted_payout = "0.000 SBD"` and `allow_votes = true`; appends a `Posted via SteemTwist` back-link to the body
- `postTwist(username, message, callback)` — broadcasts comment + comment_options atomically via `requestBroadcast`
- `postTwistReply(username, message, parentAuthor, parentPermlink, callback)` — same, for replies to twists or other replies
- `voteTwist(voter, author, permlink, weight, callback)` — upvote via Keychain
- `retwistPost(username, author, permlink, callback)` — resteem via `custom_json` under the `follow` plugin

**Sorting**
- `sortTwists(posts, mode)` — returns a new sorted array without mutating the original:
  - `"new"` — chronological, newest first
  - `"hot"` — Hacker News gravity decay: `voteWeight / (ageHours + 2)^1.5`
  - `"top"` — pure sum of positive vote percents (SP-weighted, no time decay)

**Firehose**
- `startFirehose(monthlyRoot, onTwist, onVote)` — streams live blockchain ops:
  - `onTwist(post, isUpdate)` — new top-level twists; called again 4 s later with enriched post
  - `onVote(author, permlink, voter, weight)` — every vote; allows HomeView to re-rank in memory
  - Returns `{ stop() }` to cancel the stream

**Pin / Unpin**
- `pinTwist(username, author, permlink, callback)` — broadcasts `{ action: "pin", author, permlink }` as `custom_json` with `id = "steemtwist"`
- `unpinTwist(username, callback)` — broadcasts `{ action: "unpin" }`
- `fetchPinnedTwist(username)` — scans account history newest-first (capped at 500 entries); finds the latest `custom_json` with `id = "steemtwist"` and action `"pin"` or `"unpin"`; checks localStorage cache first to bridge the broadcast-to-indexing delay (TTL 5 min); returns the post object or `null`
- `setPinCache(username, author, permlink)` — writes the pending pin/unpin to localStorage immediately after broadcast
- `clearPinCache(username)` — removes the cache entry once chain has caught up
- `getPinCache(username)` — returns the cached entry if within TTL, otherwise removes it and returns `null`

**Signals (Notifications)**
- `classifySignalEntry(seqNum, item, username)` — classifies one account history entry into a typed signal object or `null`:

  | Type | Trigger | `postAuthor` | `permlink` |
  |---|---|---|---|
  | `love` | `vote` op on user's post | the user (post author) | the voted post |
  | `reply` | `comment` with `parent_author === username` | the actor | the actor's comment |
  | `mention` | `comment` body contains `@username` | the actor | the actor's comment |
  | `follow` | `custom_json` follow op targeting username | `""` | `""` |
  | `retwist` | `custom_json` reblog op for user's post | the user (post author) | the retwisted post |

- `fetchSignals(username)` — pages through the latest 500 account history entries; classifies each; returns all signals sorted newest-first
- `stripSignalBody(body)` — strips back-links, HTML, and markdown for one-line signal previews

**Follow**
- `fetchFollowers(username)` — pages through all followers via `getFollowers` (up to 1000 per call, cursor-based); returns `string[]`
- `fetchFollowing(username)` — pages through all following via `getFollowing`; returns `string[]`

**Keychain**
- `keychainLogin(username, callback)` — sign-buffer login flow

**Utilities**
- `steemDate(ts)` — appends `Z` to Steem timestamps for correct UTC parsing
- `stripBackLink(text)` — removes the `Posted via SteemTwist` footer before rendering

---

## Data source architecture

| Context | API | Note |
|---|---|---|
| Home — Twist Stream | `getContentReplies` on monthly root + `fetchPost` per twist | Enrichment required: `getContentReplies` returns empty `active_votes` |
| Home — Understream | `getDiscussionsByCreated` for tag `steemtwist` | Any Steem post tagged `steemtwist` |
| Profile — Twist Stream | `getAccountHistory` + author/permlink filter + `fetchPost` | Stops at month boundary |
| Profile — Understream | `getDiscussionsByBlog` | Full blog; up to 50 most recent posts |
| Reply threads | `getContentReplies` + `fetchPost` per reply | Same `active_votes` enrichment needed |
| Pinned twist | `getAccountHistory` + localStorage cache | Capped at 500 entries; cache bridges broadcast delay |
| Signals — Twist Stream | `getAccountHistory` filtered to `tw-` permlinks | Classifies vote, comment, follow, reblog ops |
| Signals — Understream | `getAccountHistory` unfiltered | All Steem activity |
| Followers / Following | `getFollowers` / `getFollowing` | Cursor-based; pages until fewer than 1000 returned |
| Friends | client-side `followers ∩ following` | No extra API call |
| Real-time | `streamOperations` (firehose) | New block every ~3 s |

---

### `components.js`

Reusable Vue 3 components.

- `AppNotificationComponent` — toast bar (success / info / error); auto-dismisses non-errors after 3.5 s
- `AuthComponent` — Keychain login input and logout button; Enter submits, Escape cancels
- `UserProfileComponent` — cover image, avatar, display name, and bio
- `LoadingSpinnerComponent` — animated spinner with message
- `ReplyCardComponent` — renders a single reply with Love, Retwist, and Reply actions; auto-expands nested children at depth 0 and 1 (`showChildren = depth < 2`)
- `ThreadComponent` — lazy-loads direct replies via `getContentReplies`; enriches `active_votes` via parallel `fetchPost`; renders each as a `ReplyCardComponent`; used recursively
- `TwistCardComponent` — renders one twist; action bar (Love / Retwist / Reply / Pin / Permalink) always sits directly below the body, independent of thread expansion; 📌 pin button visible only to the post's own author when Keychain is available; emits `pin` / `unpin` events to parent views
- `TwistComposerComponent` — 280-char textarea with character counter and post button (Ctrl+Enter supported)
- `SignalItemComponent` — signal row: actor avatar, type icon, label, body preview, relative timestamp with absolute on hover, "View →" link for types that have a target post, unread dot on left border
- `UserRowComponent` — compact user row: avatar, display name, `@username`, bio snippet; full row is a hover-highlighted link to `#/@username`

**Thread expansion constants**

| Constant | Default | Meaning |
|---|---|---|
| `PREVIEW_LENGTH` | `280` | Body chars before collapse triggers |
| `THREAD_REPLY_THRESHOLD` | `3` | Reply count before collapse triggers |

---

### `app.js`

Vue Router views and root App shell.

**Routes**

| Route | View | Description |
|---|---|---|
| `/` | `HomeView` | Feed + composer; sort tabs; firehose; pinned twist; 🌊 toggle |
| `/signals` | `SignalsView` | Signals; All / Unread tabs; 🌊 toggle; marks all read on open |
| `/about` | `AboutView` | Renders `README.md` via marked.js |
| `/@:user/social` | `SocialView` | Followers / Following / Friends tabs |
| `/@:user/:permlink` | `TwistView` | Single twist permalink; parent context for replies |
| `/@:user` | `ProfileView` | Profile; social link; pinned twist; post list; 🌊 toggle |

`/@:user/social` is declared before `/@:user/:permlink` so Vue Router does not treat `"social"` as a permlink.

**Global provided state**

| Key | Type | Description |
|---|---|---|
| `username` | `ref<string>` | Logged-in username; `""` when not logged in |
| `hasKeychain` | `ref<boolean>` | Steem Keychain detected |
| `notify` | `function(msg, type)` | Show a global toast |
| `unreadSignals` | `ref<number>` | Unread signal count; shown as badge on 🔔 nav link |
| `refreshUnreadSignals` | `function(user)` | Recomputes the unread count |
| `understreamOn` | `ref<boolean>` | Current Understream mode; persisted in `localStorage` |
| `toggleUnderstream` | `function()` | Flips `understreamOn` and persists |

**HomeView**

`loadFeed(refreshPin = false)`:
- `loadFeed(true)` — initial mount and manual Refresh; reads pin from chain
- `loadFeed()` — vote-triggered reloads; keeps `pinnedTwist` in memory to avoid overwriting a just-broadcast pin

**ProfileView**

Header label and data source both switch on `understreamOn`: "🌀 Twists this month" / `fetchTwistsByUser` vs "🌊 All posts" / `fetchPostsByUser`.

**SignalsView**

Signals are fetched once in full (`fetchSignals`). The Understream toggle filters client-side — switching is instant with no re-fetch. All signals are marked read on mount; the nav badge is refreshed immediately.

**SocialView** (`/@:user/social`)

Followers and following fetched in parallel. Friends is the client-side intersection. Profile data (display names, bios) enriched lazily in batches of 50 as each tab is opened.

**TwistView** (`/@:user/:permlink`)

If `parent_permlink` does not start with `TWIST_CONFIG.ROOT_PREFIX` (`feed-`), the parent post is fetched and a context box is shown: parent author's avatar, body preview (max 160 chars, stripped of markdown and back-links), and link to parent's twist page.

**Pinned twist**

Shown above the feed / profile list with a 📌 label; deduplicated from the regular list. Updated immediately in memory on pin/unpin. localStorage cache bridges the broadcast-to-indexing delay (5-minute TTL per username).

**Root App**

- Full-bleed header with user's cover image; falls back to `@steemtwist` profile when logged out
- 🔔 Signals nav link with unread badge (capped at 99+); badge cleared on visit
- Keychain detection with read-only notice
- Global notification bar (auto-dismiss for success/info; manual dismiss for errors)

---

## No payouts by design

SteemTwist deliberately disables monetary rewards on all twists and replies. This is enforced at the **protocol level** by broadcasting `comment_options` atomically with every `comment`:

```
max_accepted_payout    = "0.000 SBD"
allow_votes            = true    ← Twist Love still works as appreciation
allow_curation_rewards = false
```

Both operations are in the same transaction, so the payout limit is set at posting time and cannot be changed retroactively.

**Why:**
- Prevents reward farming bots (no financial incentive for spam)
- Keeps the Steem reward pool for long-form content
- Removes payout timers and reward calculations from the UI
- Reduces vote-buying and trending manipulation

Twist Love remains enabled — the heart expresses appreciation without moving money.

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

The monthly root posts (`feed-YYYY-MM`) must exist on-chain before any twists can be posted. Create each month's root post from the `@steemtwist` account at the start of the month:

```
author:         steemtwist
permlink:       feed-2026-03
parentPermlink: steemtwist   ← the main tag / category
title:          (empty)
body:           SteemTwist feed — March 2026
```

---

## License

MIT
