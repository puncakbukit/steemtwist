# SteemTwist
**Steem with a Twist** — a decentralised microblogging dApp built on the Steem blockchain.

Posts are permanent and censorship-resistant. No backend, no build tools, no server — just four static files.

---

## The Twister Community

A SteemTwist user is called a **Twister** 🌀

Just as a blog writer is a *blogger* and a YouTube creator is a *YouTuber*, every person who posts, replies, loves, and connects on SteemTwist is a **Twister**. Twisters spin ideas into twists, connect with other Twisters, and keep the stream alive.

---

## Vocabulary

| Concept | SteemTwist term | Icon |
|---|---|---|
| SteemTwist user | **Twister** | 🌀 |
| Monthly root post | Feed root / Secret root | — |
| Comment reply | **Twist** | 🌀 |
| Reply to a twist | **Thread Reply** | 💬 |
| Upvote | **Twist Love** | ❤️ |
| Resteem | **Retwist** | 🔁 |
| Personalised timeline | **Home** | 🏠 |
| Global timeline | **Explore** | 🔭 |
| Interactive JS twist | **Live Twist** | ⚡ |
| Notifications | **Signals** | 🔔 |
| Encrypted private message | **Secret Twist** | 🔒 |
| Private inbox | **Private Signals** | 🔒 |

---

## Data model

```
@steemtwist/feed-2026-03               ← monthly feed root
├── @alice/tw-20260315-091530-alice     ← twist
├── @bob/tw-20260315-102244-bob         ← twist (Live Twist)
│   └── @alice/tw-20260315-150012-alice ← thread reply
└── ...

@steemtwist/secret-2026-03             ← monthly secret root
├── @alice/st-20260315-091530-alice     ← Secret Twist to @bob
│   └── @bob/st-20260315-110000-bob    ← encrypted reply
└── ...
```

**Permlink formats:** `tw-YYYYMMDD-HHMMSS-username` (twist), `st-YYYYMMDD-HHMMSS-username` (secret)
**Monthly roots:** `feed-YYYY-MM`, `secret-YYYY-MM`

---

## Features

### Feed & navigation
- 🏠 **Home** — personalised stream of twists from Twisters you follow; Understream and Firehose supported
- 🔭 **Explore** — global Twist Stream; sort New / Hot / Top; Firehose live stream; Understream toggle
- 🌊 **Understream** — toggle between Twist Stream and full Steem data on Home, Explore, Profile, and Signals

### Twists
- 📝 **Post twists** up to 280 characters with **markdown** and live **Write / Preview** tab
- 💬 **Thread replies** — recursive; auto-expanded two levels deep; Write / Preview on reply box
- ✏️ **Edit** — re-broadcast with updated body; card updates instantly
- 🗑️ **Delete** — true `delete_comment` (no votes/children) or body-blank fallback; removed from feed instantly
- ❤️ **Twist Love** — upvote any twist or reply
- 🔁 **Retwist** — resteem
- 📌 **Pin** — pin one twist to the top of your profile
- 🔀 **Sort** — New / Hot / Top
- 🔥 **Firehose** — live stream; Home Firehose filters to followed Twisters only

### Live Twists ⚡
- Write JavaScript that runs in an **isolated iframe sandbox** when viewers click ▶ Run
- Full **Live Twist Editor** with Code tab and ▶ Preview tab (WYSIWYG — uses the same sandbox)
- **Edit** published Live Twists with the inline Live Twist editor (Card label, Body, Code fields)
- Security: `sandbox="allow-scripts"` only (no same-origin), network blocked, Keychain unreachable, DOMPurify sanitisation, 10 KB size limit
- Sandbox API: `app.render(html)`, `app.text(str)`, `app.resize(px)`, `app.log(...args)`

### Social
- 👤 **Rich profiles** — avatar, reputation (1–100), bio, location, website, join date, stats grid
- 👥 **Social pages** — paginated Followers / Following / Friends; Follow / Unfollow button per row
- 👤 **Follow / Unfollow** from the Social page using Steem's `follow` plugin

### Signals & privacy
- 🔔 **Signals** — Twist Love, Replies, Mentions, Follows, Retwists, Secret Twists; All / Unread tabs
- 🔒 **Secret Twists** — end-to-end encrypted; unlimited length; nested encrypted replies; markdown; Write / Preview; only recipient can reply

---

## Live Twists ⚡

### On-chain format

```json
{
  "type": "live_twist",
  "version": 1,
  "title": "Click Counter",
  "code": "let n=0; function draw(){ app.render('<button id=b>Clicks: '+n+'</button>'); document.getElementById('b').onclick=()=>{n++;draw();}; } draw();"
}
```

Stored in `json_metadata`. The `body` field of the Steem comment is shown on non-SteemTwist clients (Steemit etc.) — defaults to `"⚡ Live Twist — view on SteemTwist"`.

### Sandbox API

| Method | Description |
|---|---|
| `app.render(html)` | Sanitise and set `body` innerHTML |
| `app.text(str)` | Set `body` as plain text (max 2000 chars) |
| `app.resize(px)` | Resize the iframe height (max 600px) |
| `app.log(...args)` | Append a line to the built-in console panel |

### Security layers

1. `<iframe sandbox="allow-scripts">` — isolated null origin, no same-origin access
2. Network blocked: `fetch`, `XMLHttpRequest`, `WebSocket`, `window.open` all throw
3. DOMPurify sanitises every `app.render()` call (forbids `<script>`, `<iframe>`, `on*` attributes)
4. 10 KB code size limit enforced before publish
5. User must click ▶ Run — never auto-executed
6. Keychain is never accessible from inside the sandbox

### Minimum test code

```js
app.render("<b style='color:#c084fc'>Hello from Live Twist!</b> " + new Date().toLocaleTimeString());
```

### Security note on `</script>`

The sandboxDoc string (generated inside a JS template literal loaded as `<script src>`) must never contain the literal sequence `</script>`, which the HTML tokeniser would misinterpret before JS execution. The closing sandbox tag uses the template expression `${'<'}/script>` and regexes are constructed with `new RegExp(...)` to avoid this.

---

## Twist Stream vs Understream 🌊

| Page | Twist Stream (OFF) | Understream (ON) |
|---|---|---|
| **Home** | `fetchTwistsByUser` per followed Twister | `fetchPostsByUser` per followed Twister |
| **Explore** | `fetchTwistFeed` on monthly root | `fetchRecentPosts` — all recent Steem posts |
| **Profile** | `fetchTwistsByUser` (tw- this month) | `fetchPostsByUser` (full blog) |
| **Signals** | Only `tw-` permlinks (+ follows) | All Steem account history |

---

## Secret Twists 🔒

```
Sender → requestEncodeMessage (Keychain) → broadcast to @steemtwist/secret-YYYY-MM
Recipient sees 🔒 signal → requestVerifyKey (Keychain) → message revealed
```

- **Rootless from feed** — replies to `secret-YYYY-MM`, not visible in regular feed
- **Unlimited length**, **markdown**, **Write / Preview** composer
- **Nested encrypted replies** — each decrypted individually on demand
- **One-way reply** — only the recipient (non-author) can reply

---

## Edit and Delete

**Edit (✏️)** — for regular twists: textarea with updated body. For Live Twists: inline editor with Card label, Body, and Code fields. Re-broadcasts the `comment` op; card updates immediately.

**Delete (🗑️)** — `delete_comment` if no votes/replies; body-blank (`<deleted>`) fallback otherwise. Card removed from feed instantly via `@deleted` event.

---

## Tech stack

| Layer | Technology |
|---|---|
| Blockchain | [steem-js](https://github.com/steemit/steem-js) |
| Signing & encryption | [Steem Keychain](https://github.com/steem-monsters/steem-keychain) |
| UI | [Vue 3](https://vuejs.org/) CDN + [Vue Router 4](https://router.vuejs.org/) CDN |
| Markdown | [marked.js](https://marked.js.org/) CDN |
| HTML sanitisation | [DOMPurify](https://github.com/cure53/DOMPurify) CDN |
| Hosting | GitHub Pages (static) |

---

## Project structure

```
steemtwist/
├── index.html       # HTML shell — CDN scripts, CSS tokens, app mount
├── blockchain.js    # Steem API and Keychain helpers (no Vue)
├── components.js    # Vue 3 components
└── app.js           # Views, router, root App
```

---

## `blockchain.js` reference

### RPC
- `setRPC(index)`, `callWithFallback`, `callWithFallbackAsync`

### Account
- `fetchAccount(username)` → `{ username, profileImage, displayName, about, coverImage, location, website, reputation, postCount, followerCount, followingCount, created }`

### Posts
- `fetchPost(author, permlink)` — always returns populated `active_votes`
- `fetchReplies(author, permlink)` — direct replies; enrich with `fetchPost` for vote counts
- `fetchRecentPosts(limit)` — all recent Steem posts, no tag filter (Explore Understream)
- `fetchPostsByTag(tag, limit)` — by tag
- `fetchPostsByUser(username, limit)` — full blog (Profile / Home Understream)

### SteemTwist feed
- `TWIST_CONFIG` — `ROOT_ACCOUNT`, `ROOT_PREFIX`, `SECRET_ROOT_PREFIX`, `TAG`, `POST_PREFIX`, `TAGS`, `DAPP_URL`
- `getMonthlyRoot()` → `feed-YYYY-MM` · `getSecretMonthlyRoot()` → `secret-YYYY-MM`
- `generateTwistPermlink(username)` → `tw-YYYYMMDD-HHMMSS-username`
- `generateSecretTwistPermlink(username)` → `st-YYYYMMDD-HHMMSS-username`
- `fetchTwistFeed(monthlyRoot)` — `getContentReplies` + parallel `fetchPost` enrichment
- `fetchTwistsByUser(username, monthlyRoot)` — account history scan, stops at month boundary
- `buildZeroPayoutOps(...)` — `[comment, comment_options]` with payouts disabled
- `postTwist(username, message, callback)` — post new twist
- `postTwistReply(username, message, parentAuthor, parentPermlink, callback)`
- `postLiveTwist(username, title, body, code, callback)` — post Live Twist; stores `{ type:"live_twist", version:1, title, code }` in `json_metadata`
- `voteTwist(voter, author, permlink, weight, callback)`
- `retwistPost(username, author, permlink, callback)`
- `followUser(follower, following, callback)` — `custom_json` follow plugin `what:["blog"]`
- `unfollowUser(follower, following, callback)` — `what:[]`
- `editTwist(username, post, newBody, callback)` — re-broadcast `comment` op
- `deleteTwist(username, post, callback)` — `delete_comment` or body-blank fallback; `res._deleted` indicates path

### Sorting, Firehose, Pin
- `sortTwists(posts, mode)` — new / hot / top
- `startFirehose(monthlyRoot, onTwist, onVote, options)` — options: `{ understream, followingSet }`; Understream mode streams root posts instead of monthly-root replies
- `pinTwist / unpinTwist / fetchPinnedTwist / setPinCache / clearPinCache / getPinCache`

### Signals
- `classifySignalEntry(seqNum, item, username)` → `love | reply | mention | follow | retwist | secret_twist`
- `fetchSignals(username)` — latest 500 history entries
- `stripSignalBody(body)`

### Follow lists
- `fetchFollowersPage(username, startFrom, limit)` → `{ users, nextCursor, hasMore }` — single page
- `fetchFollowingPage(username, startFrom, limit)` → single page
- `fetchFollowers(username)` → full list (used for Friends)
- `fetchFollowing(username)` → full list

### Secret Twists
- `sendSecretTwist(sender, recipient, message, callback)` — encrypt + broadcast to secret monthly root
- `replySecretTwist(sender, recipient, message, parentAuthor, parentPermlink, callback)`
- `decryptSecretTwist(recipient, sender, encodedPayload, callback)` — `requestVerifyKey("Memo")`
- `fetchSecretTwists(username)` — `getContentReplies` on secret root, filtered to `meta.type === "secret_twist"`

---

## `components.js` reference

| Component | Description |
|---|---|
| `AppNotificationComponent` | Toast; auto-dismiss 3.5 s for non-errors |
| `AuthComponent` | Keychain login / logout |
| `UserProfileComponent` | Profile card: avatar, reputation badge, bio, meta row, stats grid; no cover (shown in header) |
| `LoadingSpinnerComponent` | Animated spinner |
| `ReplyCardComponent` | Reply: Love / Retwist / Reply / Edit / Delete; Write/Preview on reply box |
| `ThreadComponent` | Lazy-loads replies; enriches `active_votes` |
| `LiveTwistComponent` | Renders a Live Twist card: header, ▶ Run / ■ Stop, sandboxed iframe, security notice |
| `TwistCardComponent` | Full twist card: action bar; Live Twist or markdown body; Edit (regular textarea or Live Twist editor); Delete |
| `LiveTwistComposerComponent` | Live Twist editor: Card label, Body, Code textarea, ▶ Preview sandbox, Publish ⚡ |
| `TwistComposerComponent` | 🌀 Twist / ⚡ Live Twist tabs; Write/Preview on twist pane |
| `SignalItemComponent` | Signal row: icon, label, preview, timestamp, View link |
| `UserRowComponent` | Twister row with optional Follow/Unfollow button |
| `SecretTwistComposerComponent` | Secret Twist composer: recipient, unlimited textarea, Write/Preview, Send 🔒 |
| `SecretTwistCardComponent` | Secret Twist card: Decrypt, Reply (non-author only), recursive nested replies |

---

## `app.js` reference

### Routes

| Route | View | Description |
|---|---|---|
| `/` | `HomeView` | Personalised feed — followed Twisters; Understream; Firehose |
| `/explore` | `ExploreView` | Global Twist Stream; Firehose; Understream; sort tabs; composer |
| `/signals` | `SignalsView` | Signals feed; All / Unread |
| `/secret-twists` | `SecretTwistView` | Inbox / Sent / Compose |
| `/about` | `AboutView` | README via marked.js |
| `/@:user/social` | `SocialView` | Paginated Followers / Following / Friends; Follow buttons |
| `/@:user/:permlink` | `TwistView` | Single twist; parent context |
| `/@:user` | `ProfileView` | Profile card; twist list |

### Global provided state

| Key | Type |
|---|---|
| `username` | `ref<string>` |
| `hasKeychain` | `ref<boolean>` |
| `notify` | `function(msg, type)` |
| `unreadSignals` | `ref<number>` |
| `refreshUnreadSignals` | `function(user)` |
| `understreamOn` | `ref<boolean>` persisted in `localStorage` |
| `toggleUnderstream` | `function()` |

---

## No payouts by design

All twists broadcast with `max_accepted_payout = "0.000 SBD"`, `allow_votes = true`, `allow_curation_rewards = false`. Twist Love works as appreciation without moving money.

---

## RPC fallback nodes

1. `https://api.steemit.com`
2. `https://api.justyy.com`
3. `https://steemd.steemworld.org`
4. `https://api.steem.fans`

---

## Monthly setup for `@steemtwist`

At the start of each month publish two root posts:

```
permlink: feed-2026-04       body: SteemTwist feed — April 2026
permlink: secret-2026-04     body: SteemTwist secret feed — April 2026
```

Both use `parent_permlink: steemtwist`, `title: ""`, `parent_author: ""`.

---

## Hosting on GitHub Pages

Push the four files, enable Pages on the `main` branch root. The hash router (`createWebHashHistory`) makes all routes work without server configuration.

---

## License

MIT
