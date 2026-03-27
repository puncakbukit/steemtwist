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
| Downvote / flag | **Flag** | 🚩 |
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
│   ├── @alice/tw-20260315-150012-alice ← thread reply
│   └── @carol/tw-20260315-160000-carol ← flag reply (type: live_twist_flag)
└── ...

@steemtwist/secret-2026-03             ← monthly secret root
├── @alice/st-20260315-091530-alice     ← Secret Twist to @bob
│   └── @bob/st-20260315-110000-bob    ← encrypted reply
└── ...
```

**Permlink formats:** `tw-YYYYMMDD-HHMMSS-username` (twist / flag reply), `st-YYYYMMDD-HHMMSS-username` (secret)
**Monthly roots:** `feed-YYYY-MM`, `secret-YYYY-MM`

---

## Features

### Feed & navigation
- 🏠 **Home** — personalised stream of twists from Twisters you follow; Understream and Firehose supported
- 🔭 **Explore** — global Twist Stream; sort New / Hot / Top; Firehose real-time stream; Understream toggle
- 🌊 **Understream** — toggle between Twist Stream and full Steem data on Home, Explore, Profile, and Signals

### Twists
- 📝 **Post twists** up to 280 characters with **markdown** and real-time **Write / Preview** tab
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
- Full **Live Twist Editor** with Code tab, ▶ Preview tab (WYSIWYG, auto-resizing), and Templates gallery
- **Templates gallery** — 40 ready-to-use examples across four categories: Simple (interactive widgets), Greetings (animated cards), Queries (read-only blockchain data), and Actions (Keychain operations)
- **Edit** published Live Twists with the inline Live Twist editor (Card label, Body, Code fields)
- **Blockchain queries** — call read-only Steem API methods from inside the sandbox via `app.query()`
- **Blockchain actions** — trigger Keychain-signed operations (vote, reply, follow, transfer, etc.) via `app.action()`, each requiring explicit user confirmation
- **Flag system** — users can downvote and flag a Live Twist as harmful; reason is selected from a fixed list and stored on-chain as a reply
- Security: `sandbox="allow-scripts"` only (no same-origin), network blocked, Keychain unreachable from sandbox, DOMPurify sanitisation on every `app.render()`, 10 KB code size limit, user-initiated execution only

### Social
- 👤 **Rich profiles** — avatar, reputation (1–100), bio, location, website (https only), join date, stats grid
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
| `app.render(html)` | Sanitise and set `body` innerHTML; automatically resizes the iframe to fit the new content |
| `app.text(str)` | Set `body` as plain text (max 2000 chars) |
| `app.resize(px)` | Manually resize the iframe height (40–600 px) |
| `app.log(...args)` | Append a line to the built-in console panel |
| `app.query(type, params)` | Call a read-only Steem API method; result delivered via `app.onResult()` |
| `app.action(type, params)` | Request a Keychain-signed blockchain operation; requires explicit user confirmation; result delivered via `app.onResult()` |
| `app.onResult(callback)` | Register `callback(success, data)` to receive results from `app.query()` and `app.action()` calls. Each call replaces any previously registered callback — only one listener is active at a time |

> **Auto-resize:** `app.render()` fires an automatic resize postMessage after every call so the iframe always grows to show the full output. This means query templates that update their UI after receiving results will resize correctly without any manual `app.resize()` call.

#### Supported `app.query()` types

Read-only Steem API calls. Pass parameters as a plain object matching the steem-js argument names. All `limit` parameters are capped to a maximum of 100; all string parameters are capped to 256 characters to prevent oversized RPC payloads.

**Discussions:** `getDiscussionsByCreated`, `getDiscussionsByTrending30`, `getDiscussionsByActive`, `getDiscussionsByHot`, `getDiscussionsByVotes`, `getDiscussionsByChildren`, `getDiscussionsByCashout`, `getDiscussionsByPayout`, `getDiscussionsByFeed`, `getDiscussionsByBlog`, `getDiscussionsByComments`, `getDiscussionsByPromoted`, `getCommentDiscussionsByPayout`, `getPostDiscussionsByPayout`, `getDiscussionsByAuthorBeforeDate`

**Content:** `getContent`, `getContentReplies`, `getRepliesByLastUpdate`, `getRebloggedBy`

**Accounts:** `getAccounts`, `getAccountHistory`, `getAccountReferences`, `getAccountBandwidth`, `getAccountVotes`, `getAccountCount`, `getAccountReputations`, `lookupAccountNames`, `lookupAccounts`, `getConversionRequests`, `getOwnerHistory`, `getRecoveryRequest`, `findChangeRecoveryAccountRequests`

**Follow:** `getFollowers`, `getFollowing`, `getFollowCount`, `getWithdrawRoutes`

**Blog:** `getBlog`, `getBlogAuthors`, `getBlogEntries`, `getFeedEntries`

**Chain globals:** `getConfig`, `getDynamicGlobalProperties`, `getChainProperties`, `getFeedHistory`, `getCurrentMedianHistoryPrice`, `getTicker`, `getTradeHistory`, `getVolume`, `getVersion`, `getHardforkVersion`, `getNextScheduledHardfork`, `getRewardFund`, `getVestingDelegations`

**Blocks:** `getBlockHeader`, `getBlock`, `getOpsInBlock`, `getStateWithPath` (uses `params.path`), `getStateWithOptions` (uses `params.options`)

**Market:** `getOrderBook`, `getMarketOrderBook`, `getOpenOrders`, `getLiquidityQueue`, `getMarketHistoryBuckets`, `getRecentTrades`, `getSavingsWithdrawFrom`, `getSavingsWithdrawTo`

**Witnesses:** `getWitnesses`, `getWitnessByAccount`, `getWitnessesByVote`, `lookupWitnessAccounts`, `getWitnessCount`, `getActiveWitnesses`, `getWitnessSchedule`, `getMinerQueue`, `getApiByName`

**Authority:** `getTransactionHex`, `getTransaction`, `getRequiredSignatures`, `getPotentialSignatures`, `verifyAuthority`, `verifyAccountAuthority`, `getTagsUsedByAuthor`, `getActiveVotes`

**Categories:** `getTrendingCategories`, `getBestCategories`, `getActiveCategories`, `getRecentCategories`

**Formatter / utils:** `amount`, `vestingSteem`, `numberWithCommas`, `estimateAccountValue`, `createSuggestedPassword`, `commentPermlink`, `reputation`, `vestToSteem`, `validateAccountName`, `camelCase`

#### Supported `app.action()` types

Each action triggers a Keychain confirmation popup. The user must approve before the operation is broadcast.

| Action | Key parameters |
|---|---|
| `vote` | `author`, `permlink`, `weight` (-10000 to 10000) |
| `reply` | `parentAuthor`, `parentPermlink`, `message` |
| `retwist` | `author`, `permlink` |
| `follow` | `following` |
| `unfollow` | `following` |
| `transfer` | `to`, `amount`, `memo`, `currency` |
| `delegate` | `delegatee`, `amount`, `unit` |
| `voteWitness` | `witness`, `vote` (true/false) |
| `powerUp` | `to`, `amount` |
| `powerDown` | `amount` |

### Templates gallery

The Live Twist composer includes a built-in gallery of 40 templates organised into four tabs. Selecting a template always replaces the current Title, Body, and Code fields.

| Tab | Count | Contents |
|---|---|---|
| **Simple** | 10 | Poll, Quiz, Clicker, Calculator, Chart, Expandable, Story, Demo, Explorer, Prototype |
| **Greetings** | 10 | Birthday, New Year, Congratulations, Wedding, Graduation, Eid, Christmas, Thank You, Get Well, Anniversary |
| **Queries** | 10 | Account Info, Trending Tags, STEEM Price, Hot Posts, Follower Count, Top Witnesses, Chain Stats, Post Viewer, Order Book, Reward Pool |
| **Actions** | 10 | Vote on a Post, Reply to a Post, Follow Account, Transfer STEEM, Delegate SP, Power Up, Vote for Witness, Retwist, Query then Vote, Query then Follow |

The **Preview** tab in the composer runs the current code in a live sandbox. The preview iframe auto-resizes to show all output — including results that arrive asynchronously after blockchain queries resolve — and resets to a minimal height each time a new preview is started.

### Security layers

1. `<iframe sandbox="allow-scripts">` — isolated null origin, no same-origin access
2. Network blocked: `fetch`, `XMLHttpRequest`, `WebSocket`, `window.open` all throw inside the sandbox
3. DOMPurify sanitises every `app.render()` call (loaded from CDN via a `<script src>` tag in the sandbox `<head>`; the parent page's CSP already includes `cdnjs.cloudflare.com` in `script-src`); forbidden tags: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<frame>`; forbidden attributes: all `on*` event handlers
4. 10 KB code size limit enforced before publish
5. User must click ▶ Run — never auto-executed
6. Keychain is never accessible from inside the sandbox — all `app.action()` calls route through the parent page with an explicit `confirm()` firewall before reaching Keychain
7. `postMessage` from sandbox to parent uses the hardcoded `PARENT_ORIGIN` constant; the parent validates `e.origin === "null"` and `e.source === iframe.contentWindow` on every inbound message
8. All `app.query()` parameters are sanitised before reaching `steem.api`: string values capped to 256 chars (`safeStr`), limit values clamped to 1–100 (`safeLimit`), integers coerced with a safe fallback (`safeInt`), array inputs validated with `Array.isArray` and sliced to 10 entries

### Minimum test code

```js
app.render("<b style='color:#c084fc'>Hello from Live Twist!</b> " + new Date().toLocaleTimeString());
```

### Security note on `</script>`

The `sandboxDoc` string (generated inside a JS template literal loaded as `<script src>`) must never contain the literal sequence `</script>`, which the HTML tokeniser would misinterpret before JS execution. The closing sandbox tag uses the template expression `${'<'}/script>` and regexes are constructed with `new RegExp(...)` to avoid this.

---

## Live Twist flag system 🚩

Users can flag a Live Twist they believe is harmful. Flagging is only available on Live Twists authored by others — you cannot flag your own Live Twist.

### How it works

1. The viewer clicks 🚩 on a Live Twist card to open the flag panel.
2. They select one reason from the fixed list below.
3. Clicking **Confirm flag** triggers two sequential Keychain operations:
   - A `-10000` weight downvote on the Live Twist (via `requestVote`).
   - A reply comment posted under the Live Twist (via `requestBroadcast`) whose `json_metadata` records the reason and whose `body` provides a human-readable description for non-SteemTwist clients.
4. The 🚩 button turns red and shows the cumulative downvote count.

### Flag reasons

| ID | Label | Emoji |
|---|---|---|
| `spam` | Spam | 🗑️ |
| `scam` | Scam | 💸 |
| `phishing` | Phishing | 🎣 |
| `spoofing` | Spoofing | 🎭 |
| `hacking` | Hacking | 💀 |
| `malware` | Malware | 🦠 |
| `harassment` | Harassment | 🚫 |
| `other` | Other | ⚠️ |

### Flag reply on-chain format

```json
{
  "app": "steemtwist/0.1",
  "type": "live_twist_flag",
  "reason": "malware",
  "tags": ["steemtwist", "microblog", "steem", "twist", "social", "web"]
}
```

The flag reply is posted with `max_accepted_payout: "0.000 SBD"` and `allow_votes: false`.

### Why two separate Keychain calls

Steem Keychain's `requestBroadcast` rejects `vote` operations bundled with other op types — it validates op types against the key tier differently for broadcast versus the dedicated vote endpoint. The flag therefore uses `requestVote` for the downvote and a separate `requestBroadcast` for the reply. A downvote landing without the reply comment is harmless; a reply without the downvote cannot happen because the second call only runs on the first succeeding.

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
├── index.html       # HTML shell — CDN scripts with SRI hashes, CSS tokens, app mount
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
  - `profileImage` and `coverImage` are sanitised to `http://` or `https://` URLs only; anything else is returned as `""`
  - `website` is validated to `https://` only in `UserProfileComponent.safeWebsite`

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
- `voteTwist(voter, author, permlink, weight, callback)` — weight 1–10000 (upvote); use `flagLiveTwist` for downvotes
- `retwistPost(username, author, permlink, callback)`
- `followUser(follower, following, callback)` — `custom_json` follow plugin `what:["blog"]`
- `unfollowUser(follower, following, callback)` — `what:[]`
- `editTwist(username, post, newBody, callback)` — re-broadcast `comment` op
- `deleteTwist(username, post, callback)` — `delete_comment` or body-blank fallback; `res._deleted` indicates path

### Live Twist flag
- `LIVE_TWIST_FLAG_REASONS` — array of `{ id, label, emoji }` objects; the authoritative reason list shared by both `blockchain.js` and the UI
- `flagLiveTwist(voter, author, permlink, reasonId, callback)` — step 1: `requestVote` at weight `-10000`; step 2 on success: `requestBroadcast` with `[comment, comment_options]` whose `json_metadata.type === "live_twist_flag"` and `json_metadata.reason === reasonId`

### Sorting, Firehose, Pin
- `sortTwists(posts, mode)` — new / hot / top
- `startFirehose(monthlyRoot, onTwist, onVote, options)` — options: `{ understream, followingSet }`; Understream mode streams root posts instead of monthly-root replies
- `pinTwist / unpinTwist / fetchPinnedTwist` — on-chain pin via `custom_json`
- `setPinCache / clearPinCache / getPinCache` — localStorage cache with 5-minute TTL; `getPinCache` validates `author` and `permlink` against Steem format regexes before returning

### Signals
- `classifySignalEntry(seqNum, item, username)` → `love | reply | mention | follow | retwist | secret_twist`
- `fetchSignals(username)` — latest 500 history entries
- `stripSignalBody(body)` — caps input at 10 000 chars before regex processing to prevent ReDoS; truncates output to 100 chars

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

### Architecture note

`handleQueryRequest` and `handleActionRequest` are defined once in `LIVE_TWIST_HANDLER_MIXIN` and spread into both `LiveTwistComponent` and `LiveTwistComposerComponent`. This ensures query/action behaviour is identical between the live viewer and the composer preview. The mixin resolves the active iframe via `this.$refs.sandbox || this.$refs.previewSandbox` so it works with either component's ref name.

| Component | Description |
|---|---|
| `AppNotificationComponent` | Toast; auto-dismiss 3.5 s for non-errors |
| `AuthComponent` | Keychain login / logout |
| `UserProfileComponent` | Profile card: avatar, reputation badge, bio, meta row, stats grid; website validated to https only |
| `LoadingSpinnerComponent` | Animated spinner |
| `ReplyCardComponent` | Reply: Love / Retwist / Reply / Edit / Delete; Write/Preview on reply box |
| `ThreadComponent` | Lazy-loads replies; enriches `active_votes` |
| `LiveTwistComponent` | Renders a Live Twist card: ▶ Run / ■ Stop, sandboxed iframe (`ref="sandbox"`), blockchain query/action bridge via `LIVE_TWIST_HANDLER_MIXIN`, security notice |
| `TwistCardComponent` | Full twist card: action bar (Love, Retwist, Replies, **Flag** for Live Twists); body; Edit; Delete; inline flag panel with reason selector |
| `LiveTwistComposerComponent` | Live Twist editor: Card label, Body, Code textarea, ▶ Preview sandbox (`ref="previewSandbox"`), auto-resizing preview iframe, Templates gallery (Simple / Greetings / Queries / Actions), Publish ⚡ |
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

| Key | Type | Notes |
|---|---|---|
| `username` | `ref<string>` | Persisted in `localStorage` |
| `hasKeychain` | `ref<boolean>` | Detected on mount via polling |
| `notify` | `function(msg, type)` | type: `"error"` \| `"success"` \| `"info"` |
| `unreadSignals` | `ref<number>` | Recomputed on nav to Signals |
| `refreshUnreadSignals` | `function(user)` | Called on login and nav |
| `understreamOn` | `ref<boolean>` | Persisted in `localStorage` |
| `toggleUnderstream` | `function()` | Flips and persists `understreamOn` |

The following are also provided and injected by `LiveTwistComposerComponent` (in addition to `LiveTwistComponent`) so that blockchain actions work correctly in the composer preview:

`voteTwist`, `postTwistReply`, `retwistPost`, `followUser`, `unfollowUser`

---

## Security

### Supply chain
All CDN scripts (`steem-js`, `vue`, `vue-router`, `marked`, `DOMPurify`) load with `integrity` (SRI) and `crossorigin="anonymous"` attributes. A tampered CDN file will be rejected by the browser before execution.

### Content
- All user-supplied markdown and HTML rendered via `v-html` is passed through `DOMPurify.sanitize()` before insertion.
- Profile `coverImage` and `profileImage` URLs are validated to `http://` or `https://` only inside `fetchAccount`; `coverImage` is additionally passed through `encodeURI()` before being interpolated into a CSS `url(...)` value in the header.
- User-supplied `website` URLs are validated to `https://` only in `UserProfileComponent.safeWebsite`.

### Live Twist sandbox
- Sandboxed iframe uses `sandbox="allow-scripts"` only — null origin, no same-origin, no form submission, no top navigation.
- `fetch`, `XMLHttpRequest`, `WebSocket`, and `window.open` are all overridden to throw inside the sandbox.
- DOMPurify is loaded inside the sandbox from CDN via a `<script src>` tag in the sandbox `<head>`. The parent page's CSP includes `cdnjs.cloudflare.com` in `script-src`, and sandboxed iframes inherit the parent CSP.
- `postMessage` from sandbox to parent uses the hardcoded `PARENT_ORIGIN` constant; from parent to sandbox uses target origin `"*"` (required because the sandbox's null origin cannot be addressed with `"null"` as a postMessage target).
- The parent validates `e.origin === "null"` and additionally checks `e.source === liveRef.contentWindow` before acting on any message. The source window reference is captured immediately from the event object to avoid stale-closure bugs in async callbacks.
- All `app.query()` parameters are sanitised: strings capped to 256 chars, limits clamped to 1–100, integers coerced with safe fallbacks, array inputs sliced to 10 entries.

### localStorage
- The pending-pin cache (`getPinCache`) validates `author` against `/^[a-z0-9\-.]{3,16}$/` and `permlink` against `/^[a-z0-9-]{1,255}$/` before use. Tampered or injected cache values are silently discarded.

### Signals
- `stripSignalBody` caps its input to 10 000 characters before applying regex patterns, preventing potential ReDoS from crafted post bodies with deeply nested or unclosed HTML tags.

---

## No payouts by design

All twists broadcast with `max_accepted_payout = "0.000 SBD"`, `allow_votes = true`, `allow_curation_rewards = false`. Twist Love works as appreciation without moving money. Flag replies additionally set `allow_votes = false`.

---

## RPC fallback nodes

1. `https://api.steemit.com`
2. `https://api.justyy.com`
3. `https://steemd.steemworld.org`
4. `https://api.steem.fans`

On error the app automatically advances to the next node in the list for the remainder of the session.

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
