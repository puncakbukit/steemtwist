# SteemTwist
**Steem with a Twist** — a decentralised microblogging dApp built on the Steem blockchain.

Posts are permanent and censorship-resistant. No backend, no build tools, no server — just four static files.

---

## The Twister Community

A SteemTwist user is called a **Twister** 🌀

Just as a Hive user is a *Hiver* and a YouTube creator is a *YouTuber*, every person who posts, replies, loves, and connects on SteemTwist is a **Twister**. The name fits perfectly — Twisters spin ideas into twists, connect with other Twisters, and keep the stream alive.

---

## Vocabulary

SteemTwist uses its own vocabulary. The blockchain object names are never shown in the UI.

| Concept | SteemTwist term | Icon |
|---|---|---|
| SteemTwist user | **Twister** | 🌀 |
| Root monthly post | Feed root | — |
| Comment reply | **Twist** | 🌀 |
| Reply to twist | **Thread Reply** | 💬 |
| Comment tree | Thread | — |
| Upvote | **Twist Love** | ❤️ |
| Resteem | **Retwist** | 🔁 |
| Timeline | **Twist Stream** | — |
| Notifications | **Signals** | 🔔 |
| Encrypted private message | **Secret Twist** | 🔒 |
| Private inbox | **Private Signals** | 🔒 |
| Mention | Mention | 📣 |
| Follow | Follow | 👤 |

---

## Data model

Every twist is a Steem blockchain **comment** posted as a reply under a shared monthly root post owned by `@steemtwist`.

```
@steemtwist/feed-2026-03               ← monthly feed root
├── @alice/tw-20260315-091530-alice     ← twist
├── @bob/tw-20260315-102244-bob         ← twist
│   └── @alice/tw-20260315-150012-alice ← thread reply
│       └── @bob/tw-20260315-160300-bob ← reply to reply
└── @alice/tw-20260315-140001-alice     ← another twist

@steemtwist/secret-2026-03             ← monthly secret root
├── @alice/st-20260315-091530-alice     ← Secret Twist to @bob
└── @bob/st-20260315-102244-bob        ← Secret Twist to @alice
    └── @alice/st-20260315-150012-alice ← encrypted reply
```

**Twist permlink format:** `tw-YYYYMMDD-HHMMSS-username` (UTC)

**Secret Twist permlink format:** `st-YYYYMMDD-HHMMSS-username` (UTC)

**Monthly feed root format:** `feed-YYYY-MM`

**Monthly secret root format:** `secret-YYYY-MM`

---

## Features

- 📝 Post twists up to 280 characters
- 💬 Thread replies — reply to any twist inline; reply to replies recursively; auto-expanded two levels deep
- ❤️ Twist Love — upvote any twist or reply
- 🔁 Retwist — resteem any other Twister's twist
- 📌 Pin — pin one of your own twists to the top of your profile and the home feed
- 🔀 Sort feed by **New**, **Hot** (time-decayed votes), or **Top** (pure vote weight)
- 🔥 Firehose — streams live twists and votes in real time without polling
- 📖 Thread expansion — long twists and busy threads collapse to a 280-char preview; click to expand
- 🧵 Twist page — dedicated permalink page for every twist, with a quoted parent snippet when it is a reply
- 👤 Profile pages — cover image, avatar, bio, and monthly twist history per Twister
- 👥 Social pages — Followers, Following, and Friends (mutual follows) for any Twister
- 🔔 Signals — notification feed showing Twist Love, Thread Replies, Mentions, Follows, and Retwists; read/unread tracking; All / Unread filter tabs
- 🔒 Secret Twists — end-to-end encrypted private messages between Twisters; unlimited length; nested encrypted replies; uses Steem's native memo-key scheme via Keychain
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

## Secret Twists

Secret Twists are end-to-end encrypted private messages between Twisters. They use Steem's native memo-key encryption scheme via Keychain — no servers, no key exchange, no coordination required.

### Architecture

```
Twister A composes a secret message
   ↓
requestEncodeMessage (Keychain) — encrypts with A's memo key + B's memo public key
   ↓
Broadcast: reply to @steemtwist/secret-YYYY-MM
   body: "@bob [encrypted]"   ← mention triggers Signals 🔔
   json_metadata: { type: "secret_twist", to: "bob", payload: "#<encoded>" }
   ↓
Twister B sees 🔒 signal in Signals feed
   ↓
requestVerifyKey (Keychain) — decrypts with B's memo key
   ↓
🔒 Secret message revealed
```

### Key design properties

- **Rootless structure** — Secret Twists reply to `@steemtwist/secret-YYYY-MM`, keeping them off Steemit's regular post view and out of the public feed
- **Discovery** — the mention `@recipient [encrypted]` in the post body surfaces in the recipient's Signals feed
- **Unlimited length** — no artificial character limit; the blockchain's ~65 KB post size is the only cap
- **Nested encrypted replies** — replies to Secret Twists are themselves Secret Twists, using Steem's native comment nesting; each reply is individually encrypted and decrypted on demand
- **Reply direction** — only the recipient (non-author) of a Secret Twist can reply; you cannot reply to your own message

### Important tradeoffs

Secret Twists provide **content privacy**, not communication anonymity:

- The sender, recipient, and timestamp are visible on the public blockchain
- The message body is encrypted and unreadable without the memo key
- Keychain handles encryption/decryption — the private key never leaves the browser extension

### Monthly secret root

`@steemtwist` must publish a new `secret-YYYY-MM` root post at the start of each month before Secret Twists can be sent. See Setup section below.

---

## Tech stack

| Layer | Technology |
|---|---|
| Blockchain API | [steem-js](https://github.com/steemit/steem-js) |
| Signing & encryption | [Steem Keychain](https://github.com/steem-monsters/steem-keychain) |
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
- `fetchReplies(author, permlink)` — direct replies via `getContentReplies`; `active_votes` is always empty — callers must enrich with `fetchPost` per reply for correct vote counts
- `fetchPostsByTag(tag, limit)` — recent posts by tag via `getDiscussionsByCreated`; used by HomeView Understream mode
- `fetchPostsByUser(username, limit)` — recent posts from a Twister's blog via `getDiscussionsByBlog`; used by ProfileView Understream mode

**SteemTwist feed**
- `TWIST_CONFIG` — central config: `ROOT_ACCOUNT`, `ROOT_PREFIX`, `SECRET_ROOT_PREFIX`, `TAG`, `POST_PREFIX`, `TAGS`, `DAPP_URL`
- `getMonthlyRoot()` → e.g. `feed-2026-03` (UTC)
- `getSecretMonthlyRoot()` → e.g. `secret-2026-03` (UTC)
- `generateTwistPermlink(username)` → e.g. `tw-20260315-091530-alice`
- `generateSecretTwistPermlink(username)` → e.g. `st-20260315-091530-alice`
- `fetchTwistFeed(monthlyRoot)` — fetches the month's twists via `getContentReplies` on the monthly root; enriches each in parallel with `fetchPost` (required: `getContentReplies` always returns empty `active_votes`)
- `fetchTwistsByUser(username, monthlyRoot)` — scans account history backwards in batches of 100; keeps only `comment` ops where `author === username` and `permlink` starts with `tw-`; stops at the month boundary
- `buildZeroPayoutOps(...)` — builds a `[comment, comment_options]` pair with `max_accepted_payout = "0.000 SBD"` and `allow_votes = true`; appends a `Posted via SteemTwist` back-link to the body
- `postTwist(username, message, callback)` — broadcasts comment + comment_options atomically
- `postTwistReply(username, message, parentAuthor, parentPermlink, callback)` — same, for thread replies
- `voteTwist(voter, author, permlink, weight, callback)` — upvote via Keychain
- `retwistPost(username, author, permlink, callback)` — resteem via `custom_json` under the `follow` plugin

**Sorting**
- `sortTwists(posts, mode)` — new (chronological) / hot (Hacker News gravity) / top (pure vote weight)

**Firehose**
- `startFirehose(monthlyRoot, onTwist, onVote)` — streams live blockchain ops; returns `{ stop() }`

**Pin / Unpin**
- `pinTwist(username, author, permlink, callback)` — broadcasts `{ action: "pin" }` as `custom_json`
- `unpinTwist(username, callback)` — broadcasts `{ action: "unpin" }`
- `fetchPinnedTwist(username)` — scans account history (max 500 entries); checks localStorage cache first (TTL 5 min)
- `setPinCache / clearPinCache / getPinCache` — localStorage bridge for broadcast-to-indexing delay

**Signals**
- `classifySignalEntry(seqNum, item, username)` — classifies one history entry into a signal type:
  `love` / `reply` / `mention` / `follow` / `retwist` / `secret_twist`
- `fetchSignals(username)` — scans latest 500 history entries; returns signals sorted newest-first
- `stripSignalBody(body)` — strips back-links, HTML, and markdown for one-line previews

**Follow**
- `fetchFollowers(username)` — all followers via `getFollowers` (cursor-based, up to 1000 per page)
- `fetchFollowing(username)` — all following via `getFollowing`

**Secret Twists**
- `sendSecretTwist(sender, recipient, message, callback)` — encrypts via `requestEncodeMessage("Memo")`, then broadcasts as a reply to `@steemtwist/secret-YYYY-MM` with `json_metadata: { type: "secret_twist", to, version, payload }`
- `replySecretTwist(sender, recipient, message, parentAuthor, parentPermlink, callback)` — same encryption flow, broadcast as a nested Steem comment under the parent Secret Twist
- `decryptSecretTwist(recipient, sender, encodedPayload, callback)` — decrypts via `requestVerifyKey("Memo")`
- `fetchSecretTwists(username)` — fetches all replies to `@steemtwist/secret-YYYY-MM` via `getContentReplies`, enriches with `fetchPost`, filters to `meta.type === "secret_twist"`; does NOT use account history (mentions by other Twisters do not appear in the recipient's history)

**Keychain**
- `keychainLogin(username, callback)` — sign-buffer login flow

**Utilities**
- `steemDate(ts)` — appends `Z` for correct UTC parsing
- `stripBackLink(text)` — removes `Posted via SteemTwist` footer before rendering

---

## Data source architecture

| Context | API | Note |
|---|---|---|
| Home — Twist Stream | `getContentReplies` on monthly root + `fetchPost` per twist | Enrichment required: `getContentReplies` always returns empty `active_votes` |
| Home — Understream | `getDiscussionsByCreated` for tag `steemtwist` | Any Steem post tagged `steemtwist` |
| Profile — Twist Stream | `getAccountHistory` + author/permlink filter + `fetchPost` | Stops at month boundary |
| Profile — Understream | `getDiscussionsByBlog` | Full blog; up to 50 most recent posts |
| Reply threads | `getContentReplies` + `fetchPost` per reply | Same `active_votes` enrichment needed |
| Pinned twist | `getAccountHistory` (max 500) + localStorage cache | Cache bridges broadcast delay (5-min TTL) |
| Signals — Twist Stream | `getAccountHistory` filtered to `tw-` permlinks | vote / comment / follow / reblog ops |
| Signals — Understream | `getAccountHistory` unfiltered | All Steem activity |
| Followers / Following | `getFollowers` / `getFollowing` | Cursor-based; pages until < 1000 returned |
| Friends | client-side `followers ∩ following` | No extra API call |
| Secret Twists | `getContentReplies` on secret monthly root + `fetchPost` | Filtered to `meta.type === "secret_twist"` |
| Real-time | `streamOperations` (firehose) | New block every ~3 s |

---

### `components.js`

Reusable Vue 3 components.

- `AppNotificationComponent` — toast bar; auto-dismisses non-errors after 3.5 s
- `AuthComponent` — Keychain login input and logout button
- `UserProfileComponent` — cover image, avatar, display name, and bio
- `LoadingSpinnerComponent` — animated spinner with message
- `ReplyCardComponent` — single reply with Love, Retwist, and Reply actions; auto-expands children at depth 0 and 1
- `ThreadComponent` — lazy-loads direct replies; enriches `active_votes` via parallel `fetchPost`; renders as `ReplyCardComponent`; used recursively
- `TwistCardComponent` — renders one twist; action bar (Love / Retwist / Reply / Pin / Permalink) always sits below the body; 📌 pin button for own posts only; Secret Twists surfaced in the feed are redacted to `🔒 Secret Twist — view in Private Signals`
- `TwistComposerComponent` — 280-char textarea with counter and post button (Ctrl+Enter)
- `SignalItemComponent` — signal row: actor avatar, type icon (`❤️ 💬 📣 👤 🔁 🔒`), label, body preview, timestamp, "View →" link; unread dot on left border
- `UserRowComponent` — compact Twister row: avatar, display name, `@username`, bio; full row is a link to `#/@username`
- `SecretTwistComposerComponent` — Secret Twist composer: recipient `@` field, unlimited textarea (no character cap), `Send 🔒` button (Ctrl+Enter)
- `SecretTwistCardComponent` — Secret Twist card; shows locked state to non-participants; Decrypt button via `requestVerifyKey`; Reply button shown only after decrypt and only to the non-author (recipient) to prevent replying to your own message; nested encrypted replies rendered recursively via self-referencing `SecretTwistCardComponent` instances

**Thread expansion constants**

| Constant | Default | Meaning |
|---|---|---|
| `PREVIEW_LENGTH` | `280` | Twist body chars before collapse triggers |
| `THREAD_REPLY_THRESHOLD` | `3` | Reply count before collapse triggers |

---

### `app.js`

Vue Router views and root App shell.

**Routes**

| Route | View | Description |
|---|---|---|
| `/` | `HomeView` | Feed + composer; sort tabs; firehose; pinned twist; 🌊 toggle |
| `/signals` | `SignalsView` | Signals feed; All / Unread tabs; 🌊 toggle; marks all read on open |
| `/secret-twists` | `SecretTwistView` | Private inbox: Inbox / Sent / Compose tabs |
| `/about` | `AboutView` | Renders `README.md` via marked.js |
| `/@:user/social` | `SocialView` | Followers / Following / Friends tabs |
| `/@:user/:permlink` | `TwistView` | Single twist permalink; parent context for replies |
| `/@:user` | `ProfileView` | Profile; social link; pinned twist; post list; 🌊 toggle |

`/@:user/social` is declared before `/@:user/:permlink` so Vue Router does not treat `"social"` as a permlink.

**Global provided state**

| Key | Type | Description |
|---|---|---|
| `username` | `ref<string>` | Logged-in Twister's username; `""` when not logged in |
| `hasKeychain` | `ref<boolean>` | Steem Keychain detected |
| `notify` | `function(msg, type)` | Show a global toast |
| `unreadSignals` | `ref<number>` | Unread signal count; shown as badge on 🔔 nav link |
| `refreshUnreadSignals` | `function(user)` | Recomputes the unread count |
| `understreamOn` | `ref<boolean>` | Current Understream mode; persisted in `localStorage` |
| `toggleUnderstream` | `function()` | Flips `understreamOn` and persists |

**SecretTwistView**

Three tabs: Inbox / Sent / Compose.

- **Inbox** — Secret Twists where `meta.to === username` (case-insensitive)
- **Sent** — Secret Twists where `post.author === username`
- **Compose** — `SecretTwistComposerComponent`; after send, waits 3 s for node indexing then reloads

The `username` watcher re-fetches when the logged-in Twister changes (login / logout / account switch), clearing stale data from the previous session.

**SocialView** (`/@:user/social`)

Followers and following fetched in parallel. Friends = client-side intersection. Twister profiles enriched lazily in batches of 50.

**TwistView** (`/@:user/:permlink`)

Parent context shown when `parent_permlink` does not start with `feed-` (the monthly root prefix).

**Pinned twist**

Shown above feed/profile with 📌 label; deduplicated from the regular list; updated immediately in memory; localStorage cache bridges the 5-minute broadcast-to-indexing window.

---

## No payouts by design

SteemTwist deliberately disables monetary rewards on all twists and replies. Enforced at the **protocol level** by broadcasting `comment_options` atomically with every `comment`:

```
max_accepted_payout    = "0.000 SBD"
allow_votes            = true    ← Twist Love still works as appreciation
allow_curation_rewards = false
```

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

At the start of each month, `@steemtwist` must create two root posts before Twisters can post:

**Monthly feed root:**
```
author:         steemtwist
permlink:       feed-2026-03
parentPermlink: steemtwist
title:          (empty)
body:           SteemTwist feed — March 2026
```

**Monthly secret root:**
```
author:         steemtwist
permlink:       secret-2026-03
parentPermlink: steemtwist
title:          (empty)
body:           SteemTwist secret feed — March 2026
```

---

## License

MIT
