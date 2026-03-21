# SteemTwist
**Steem with a Twist** — a decentralised microblogging dApp built on the Steem blockchain.

Posts are permanent and censorship-resistant. No backend, no build tools, no server — just four static files.

---

## The Twister Community

A SteemTwist user is called a **Twister** 🌀

Just as a Hive user is a *Hiver* and a YouTube creator is a *YouTuber*, every person who posts, replies, loves, and connects on SteemTwist is a **Twister**. The name fits perfectly — Twisters spin ideas into twists, connect with other Twisters, and keep the stream alive.

---

## Vocabulary

SteemTwist uses its own vocabulary. The underlying blockchain object names are never shown in the UI.

| Concept | SteemTwist term | Icon |
|---|---|---|
| SteemTwist user | **Twister** | 🌀 |
| Monthly root post | Feed root / Secret root | — |
| Comment reply | **Twist** | 🌀 |
| Reply to a twist | **Thread Reply** | 💬 |
| Comment tree | Thread | — |
| Upvote | **Twist Love** | ❤️ |
| Resteem | **Retwist** | 🔁 |
| Personalised timeline | **Home** | 🏠 |
| Global timeline | **Explore** | 🔭 |
| Notifications | **Signals** | 🔔 |
| Encrypted private message | **Secret Twist** | 🔒 |
| Private inbox | **Private Signals** | 🔒 |

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
│   └── @bob/st-20260315-110000-bob    ← encrypted reply
└── @bob/st-20260315-102244-bob        ← Secret Twist to @alice
```

**Twist permlink:** `tw-YYYYMMDD-HHMMSS-username`
**Secret Twist permlink:** `st-YYYYMMDD-HHMMSS-username`
**Monthly feed root:** `feed-YYYY-MM`
**Monthly secret root:** `secret-YYYY-MM`

---

## Features

- 🏠 **Home feed** — personalised stream of twists from Twisters you follow; Understream and Firehose supported
- 🔭 **Explore feed** — global Twist Stream of all twists this month; sort by New / Hot / Top; Firehose live stream; Understream toggle
- 📝 **Post twists** up to 280 characters
- 💬 **Thread replies** — reply to any twist inline; reply to replies recursively; auto-expanded two levels deep
- ✏️ **Edit** — re-broadcast a twist or reply with updated body; reflected immediately without reload
- 🗑️ **Delete** — true `delete_comment` for posts with no votes/replies; body-blank fallback otherwise; card removed from feed instantly
- ❤️ **Twist Love** — upvote any twist or reply
- 🔁 **Retwist** — resteem any other Twister's twist
- 👤 **Follow / Unfollow** — follow or unfollow any Twister directly from the Social page
- 📌 **Pin** — pin one of your own twists to the top of your profile
- 🔀 **Sort** — New (chronological) / Hot (time-decayed votes) / Top (pure vote weight)
- 🔥 **Firehose** — streams live twists and votes in real time without polling; Home Firehose filtered to followed Twisters only
- 🌊 **Understream** — toggle between Twist Stream and full Steem data on Home, Explore, Profile, and Signals
- 👤 **Rich profile pages** — cover image (shown globally in header), avatar, reputation score, bio, location, website, join date, stats (followers, following, posts, twists this month)
- 👥 **Social pages** — paginated Followers / Following / Friends tabs; Follow button on each row; Friends computed on demand
- 🔔 **Signals** — notifications for Twist Love, Thread Replies, Mentions, Follows, Retwists, and Secret Twists; read/unread tracking; All / Unread tabs
- 🔒 **Secret Twists** — end-to-end encrypted private messages; unlimited length; nested encrypted replies; only recipient can reply (not sender); uses Steem memo-key scheme via Keychain
- 🔄 **RPC fallback** across four nodes
- 🔒 **Read-only mode** when Steem Keychain is not installed

---

## Twist Stream vs Understream 🌊

A global toggle (persisted in `localStorage`) switches between two data modes.

| Page | Twist Stream (OFF) | Understream (ON) |
|---|---|---|
| **Home** | `fetchTwistsByUser` per followed Twister (tw- permlinks this month) | `fetchPostsByUser` per followed Twister (full Steem blog) |
| **Explore** | `fetchTwistFeed` on monthly root | `fetchRecentPosts` — all recent Steem posts regardless of tag |
| **Profile** | `fetchTwistsByUser` (tw- this month) | `fetchPostsByUser` (full blog, 50 posts) |
| **Signals** | Only signals where permlink starts with `tw-` (plus follows) | All Steem account history ops |

---

## Home vs Explore

| | Home 🏠 | Explore 🔭 |
|---|---|---|
| **Route** | `/` | `/explore` |
| **Content** | Twists from followed Twisters only | All twists from all Twisters this month |
| **Firehose** | ✅ filtered to followed Twisters | ✅ all Twisters |
| **Understream** | ✅ full blogs of followed Twisters | ✅ all recent Steem posts |
| **Pinned twist** | — | — |
| **Composer** | ✅ | ✅ |
| **Logged-out** | Welcome card + link to Explore | Full feed visible |

---

## Secret Twists

End-to-end encrypted private messages between two Twisters using Steem's native memo-key scheme via Keychain.

### Architecture

```
Sender composes message
   ↓
requestEncodeMessage (Keychain) — encrypts with sender memo key + recipient memo public key
   ↓
Broadcast: reply to @steemtwist/secret-YYYY-MM
   body: "@recipient [encrypted]"  ← triggers Signals 🔔
   json_metadata: { type:"secret_twist", to:"recipient", payload:"#<encoded>" }
   ↓
Recipient sees 🔒 signal in Signals feed
   ↓
requestVerifyKey (Keychain) — decrypts with recipient memo key
   ↓
Message revealed
```

### Key properties

- **Anchored to secret monthly root** — replies to `@steemtwist/secret-YYYY-MM`, not visible in the regular feed or on Steemit's post view
- **Unlimited length** — no character cap; blockchain ~65 KB limit applies
- **Nested encrypted replies** — replies are themselves Secret Twists under the parent comment; each decrypted individually on demand
- **One-way reply rule** — only the recipient (non-author) of a Secret Twist can reply; prevents replying to your own message
- **Content private, metadata public** — sender, recipient, and timestamp are visible on-chain; body is unreadable without the memo key

### Monthly secret root

`@steemtwist` must publish a new `secret-YYYY-MM` root post at the start of each month.

---

## Edit and Delete

Both twists and thread replies support editing and deletion for the author.

**Edit (✏️):** Re-broadcasts the `comment` op with updated body and the same permlink. The chain overwrites the post. The card re-renders immediately from local state without a feed reload.

**Delete (🗑️):** Two paths depending on post activity:
- **True delete** — `delete_comment` op if `net_votes === 0` and `children === 0`. Permanently removes the post from the chain.
- **Body-blank fallback** — if the post has votes or replies, overwrites body with `<deleted>` (the Steemit UX convention). The post still exists on-chain.

In both cases the card is removed from the feed immediately via the `@deleted` event.

---

## Follow / Unfollow

Twisters can follow or unfollow directly from the Social page (Followers, Following, and Friends tabs). The Follow button shows the current state and updates optimistically on click using Steem's `follow` plugin `custom_json` operation.

---

## Profile page

Each Twister's profile shows a rich card:

| Field | Source |
|---|---|
| Avatar | Steemit CDN |
| Display name | `posting_json_metadata.profile.name` |
| @username | `account.name` |
| ⭐ Reputation | `account.reputation` (converted to 1–100 scale) |
| Bio | `profile.about` |
| 📍 Location | `profile.location` |
| 🔗 Website | `profile.website` (sanitised, opens in new tab) |
| 📅 Joined | `account.created` |
| Followers | `getFollowCount` |
| Following | `getFollowCount` |
| Posts | `account.post_count` |
| Twists | Count of loaded twists (this month or full blog) |

The cover image is displayed globally in the site header and is not repeated on the profile card.

---

## Social page — pagination

Followers and Following lists load **50 users at a time** for instant rendering. A "Load more" button appends the next page. Profile enrichment (display name, bio) is fetched per page in batches of 50.

**Friends tab** is computed lazily — clicking it fetches the full followers and following lists and computes the intersection client-side. Result is cached for the session.

**Tab counts** show e.g. `Followers (50+)` while more pages remain, and exact counts once fully loaded.

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
└── app.js           # Vue app — views, router, root App
```

---

## `blockchain.js`

### RPC & fallback
- `setRPC(index)` — switch active node
- `callWithFallback / callWithFallbackAsync` — retry across node list

### Account
- `fetchAccount(username)` — returns full profile object including reputation (1–100 scale), follower/following counts, location, website, join date

### Posts
- `fetchPost(author, permlink)` — single post; always returns populated `active_votes`
- `fetchReplies(author, permlink)` — direct replies; `active_votes` always empty — enrich with `fetchPost`
- `fetchRecentPosts(limit)` — all recent Steem posts via `getDiscussionsByCreated` with no tag filter; used by Explore Understream
- `fetchPostsByTag(tag, limit)` — recent posts by tag
- `fetchPostsByUser(username, limit)` — recent posts from a Twister's blog; used by Profile/Home Understream

### SteemTwist feed
- `TWIST_CONFIG` — `ROOT_ACCOUNT`, `ROOT_PREFIX`, `SECRET_ROOT_PREFIX`, `TAG`, `POST_PREFIX`, `TAGS`, `DAPP_URL`
- `getMonthlyRoot()` → `feed-YYYY-MM`
- `getSecretMonthlyRoot()` → `secret-YYYY-MM`
- `generateTwistPermlink(username)` → `tw-YYYYMMDD-HHMMSS-username`
- `generateSecretTwistPermlink(username)` → `st-YYYYMMDD-HHMMSS-username`
- `fetchTwistFeed(monthlyRoot)` — all twists via `getContentReplies` + parallel `fetchPost` enrichment
- `fetchTwistsByUser(username, monthlyRoot)` — account history scan; stops at month boundary
- `buildZeroPayoutOps(...)` — builds `[comment, comment_options]` with payouts disabled
- `postTwist(username, message, callback)` — post new twist
- `postTwistReply(username, message, parentAuthor, parentPermlink, callback)` — post thread reply
- `voteTwist(voter, author, permlink, weight, callback)` — upvote
- `retwistPost(username, author, permlink, callback)` — resteem via `custom_json`
- `followUser(follower, following, callback)` — follow via `custom_json` follow plugin (`what: ["blog"]`)
- `unfollowUser(follower, following, callback)` — unfollow (`what: []`)
- `editTwist(username, post, newBody, callback)` — re-broadcast `comment` op with updated body
- `deleteTwist(username, post, callback)` — `delete_comment` if no activity; body-blank fallback otherwise; `res._deleted` indicates which path was taken

### Sorting & ranking
- `sortTwists(posts, mode)` — new / hot (Hacker News gravity) / top

### Firehose
- `startFirehose(monthlyRoot, onTwist, onVote)` — live stream; returns `{ stop() }`

### Pin
- `pinTwist / unpinTwist` — `custom_json` pin ops
- `fetchPinnedTwist(username)` — scans history (max 500); localStorage cache (5-min TTL)
- `setPinCache / clearPinCache / getPinCache`

### Signals
- `classifySignalEntry(seqNum, item, username)` → `love | reply | mention | follow | retwist | secret_twist`
- `fetchSignals(username)` — latest 500 history entries
- `stripSignalBody(body)` — one-line preview

### Follow lists
- `fetchFollowersPage(username, startFrom, limit)` → `{ users, nextCursor, hasMore }` — single page
- `fetchFollowingPage(username, startFrom, limit)` → `{ users, nextCursor, hasMore }` — single page
- `fetchFollowers(username)` → `string[]` — full list (used for Friends and myFollowing)
- `fetchFollowing(username)` → `string[]` — full list

### Secret Twists
- `sendSecretTwist(sender, recipient, message, callback)` — encrypt + broadcast to secret monthly root
- `replySecretTwist(sender, recipient, message, parentAuthor, parentPermlink, callback)` — encrypted nested reply
- `decryptSecretTwist(recipient, sender, encodedPayload, callback)` — `requestVerifyKey("Memo")`
- `fetchSecretTwists(username)` — `getContentReplies` on secret monthly root, filtered to `meta.type === "secret_twist"`

---

## `components.js`

- `AppNotificationComponent` — toast; auto-dismiss 3.5 s for non-errors
- `AuthComponent` — Keychain login / logout
- `UserProfileComponent` — profile card: avatar, reputation badge, display name, bio, meta row (location, website, joined), stats grid (Followers / Following / Posts / Twists); no cover image (shown in global header)
- `LoadingSpinnerComponent` — animated spinner
- `ReplyCardComponent` — single reply: Love / Retwist / Reply / ✏️ Edit / 🗑️ Delete (own replies only); auto-expands children at depth 0–1; inline edit box; inline delete confirmation
- `ThreadComponent` — lazy-loads replies; enriches `active_votes` via `fetchPost`
- `TwistCardComponent` — full twist card: action bar (Love / Retwist / Reply / 🔗 / 📌 / ✏️ Edit / 🗑️ Delete); edit and delete own posts only; inline edit box; inline delete confirmation; emits `deleted` for parent list removal; `editedBody` local override after edit
- `TwistComposerComponent` — 280-char composer
- `SignalItemComponent` — signal row: icon, label, body preview, timestamp, view link
- `UserRowComponent` — compact Twister row with optional Follow / Following button (shown when `loggedInUser` is set and differs from the row's user)
- `SecretTwistComposerComponent` — unlimited textarea, recipient field, `Send 🔒`
- `SecretTwistCardComponent` — locked card; Decrypt via `requestVerifyKey`; Reply button shown only after decrypt and only to non-author; recursive nested replies via self-referencing `SecretTwistCardComponent`

---

## `app.js`

### Routes

| Route | View | Description |
|---|---|---|
| `/` | `HomeView` | Personalised feed — followed Twisters only |
| `/explore` | `ExploreView` | Global Twist Stream — all Twisters |
| `/signals` | `SignalsView` | Signals feed; marks read on open |
| `/secret-twists` | `SecretTwistView` | Private inbox: Inbox / Sent / Compose |
| `/about` | `AboutView` | Renders README.md via marked.js |
| `/@:user/social` | `SocialView` | Paginated Followers / Following / Friends |
| `/@:user/:permlink` | `TwistView` | Single twist permalink |
| `/@:user` | `ProfileView` | Profile card + twists |

`/@:user/social` is declared before `/@:user/:permlink` so Vue Router does not treat `"social"` as a permlink.

### Global provided state

| Key | Type | Description |
|---|---|---|
| `username` | `ref<string>` | Logged-in Twister; `""` when not logged in |
| `hasKeychain` | `ref<boolean>` | Keychain detected |
| `notify` | `function(msg, type)` | Global toast |
| `unreadSignals` | `ref<number>` | Badge count on 🔔 |
| `refreshUnreadSignals` | `function(user)` | Recomputes unread count |
| `understreamOn` | `ref<boolean>` | Persisted in `localStorage` |
| `toggleUnderstream` | `function()` | Flips and persists |

### HomeView (`/`)

Personalised feed. On load: fetches `following` list, then fires `fetchTwistsByUser` (or `fetchPostsByUser` in Understream mode) for each followed user in parallel, capped at 10 posts per user. Results are merged, deduplicated by permlink, and sorted by the selected mode.

Firehose filters live posts to `followingSet` (a `Set` built during `loadFeed`). Stops on unmount and on username change.

Logged-out visitors see a welcome card with a link to Explore. Empty following list shows a prompt to discover Twisters.

### ExploreView (`/explore`)

Global Twist Stream. Same as the previous Home: all twists from the monthly root, full Firehose, Understream toggle, sort tabs, composer.

### SocialView (`/@:user/social`)

Paginated 50 per page. Followers and Following load first page on mount. "Load more" button fetches the next page and enriches profiles. Friends tab fetches full lists on demand and computes intersection client-side. `myFollowing` (logged-in user's following list) loaded concurrently for Follow button state.

### SecretTwistView (`/secret-twists`)

Inbox / Sent / Compose tabs. `username` watcher re-fetches on account switch. Inbox filters `meta.to === username`; Sent filters `post.author === username` (both normalised to lowercase). After send, waits 3 s for node indexing then reloads.

### ProfileView (`/@:user`)

Always shows `UserProfileComponent` (own profile or others). Passes `twistCount = userTwists.length` to the card.

### TwistView (`/@:user/:permlink`)

Shows parent context when `parent_permlink` does not start with `feed-`.

---

## No payouts by design

All twists and replies are broadcast with:
```
max_accepted_payout    = "0.000 SBD"
allow_votes            = true    ← Twist Love still works
allow_curation_rewards = false
```

Twist Love remains — the heart expresses appreciation without moving money.

---

## RPC nodes

Auto-fallback order:
1. `https://api.steemit.com`
2. `https://api.justyy.com`
3. `https://steemd.steemworld.org`
4. `https://api.steem.fans`

---

## Hosting on GitHub Pages

1. Push the four files to a GitHub repository.
2. Go to **Settings → Pages**, set source to the `main` branch root.
3. Live at `https://<your-username>.github.io/<repo-name>/`.

The hash router (`createWebHashHistory`) means all routes work without server configuration.

---

## Monthly setup for `@steemtwist`

At the start of each month, publish two root posts before Twisters can post:

**Feed root:**
```
author:          steemtwist
permlink:        feed-2026-04
parent_permlink: steemtwist
body:            SteemTwist feed — April 2026
```

**Secret root:**
```
author:          steemtwist
permlink:        secret-2026-04
parent_permlink: steemtwist
body:            SteemTwist secret feed — April 2026
```

---

## License

MIT
