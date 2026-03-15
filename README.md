# SteemTwist
**Steem with a Twist** — a decentralised microblogging dApp built on the Steem blockchain.

Think Twitter, but your posts are permanent, and censorship-resistant. No backend, no build tools, no server — just four static files.

---

## How it works

Every twist is a Steem blockchain **comment** posted as a reply under a shared monthly root post owned by `@steemtwist`. All twists for a given month live under a single parent, making them cheap to query with one API call.

```
@steemtwist/feed-2026-03          ← monthly root
├── @alice/tw-20260315-091530-alice
├── @bob/tw-20260315-102244-bob
└── @alice/tw-20260315-140001-alice
```

**Permlink format:** `tw-YYYYMMDD-HHMMSS-username`
All timestamps use **UTC** to match the Steem blockchain clock.

**Monthly root format:** `feed-YYYY-MM`

---

## Features

- 📝 Post twists up to 280 characters
- 💬 Reply to any twist inline
- ❤️ Upvote twists (100% weight)
- 👤 User profile pages with avatar, bio, and monthly twist history
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
- `fetchPost(author, permlink)` — single post by author + permlink
- `fetchReplies(author, permlink)` — direct replies to a post
- `fetchAllReplies(author, permlink)` — all nested replies recursively
- `fetchPostsByTag(tag, limit)` — recent posts by tag
- `fetchPostsByUser(username, limit)` — recent posts from a user's blog

**Keychain**
- `keychainPost(...)` — generic post/comment via Keychain
- `keychainLogin(username, callback)` — sign-buffer login flow

**Utilities**
- `buildPermlink(title)` — slug + timestamp permlink
- `steemDate(ts)` — appends `Z` to Steem timestamps for correct UTC parsing

**SteemTwist-specific**
- `TWIST_CONFIG` — central config (`ROOT_ACCOUNT`, `ROOT_PREFIX`, `TAG`, `POST_PREFIX`)
- `getMonthlyRoot()` → e.g. `feed-2026-03` (UTC)
- `generateTwistPermlink(username)` → e.g. `tw-20260315-091530-alice` (UTC)
- `fetchTwistFeed(monthlyRoot)` — fetches and sorts the month's twists newest-first
- `buildZeroPayoutOps(...)` — builds a `[comment, comment_options]` operation pair with `max_accepted_payout = "0.000 SBD"` and `allow_votes = true`
- `postTwist(username, message, callback)` — broadcasts comment + comment_options atomically via `requestBroadcast`
- `postTwistReply(username, message, parentAuthor, parentPermlink, callback)` — same, for inline replies
- `voteTwist(voter, author, permlink, weight, callback)` — upvote via Keychain

### `components.js`

Reusable Vue 3 components.

- `AppNotificationComponent` — toast bar (success / info / error); auto-dismisses after 3.5 s
- `AuthComponent` — Keychain login input and logout button
- `UserProfileComponent` — cover image, avatar, display name, and bio
- `LoadingSpinnerComponent` — animated spinner with message
- `TwistCardComponent` — renders one twist with like, reply, payout, and inline error display
- `TwistComposerComponent` — textarea with 280-char counter and post button (Ctrl+Enter supported)

### `app.js`

Vue Router views and root App shell.

**Views**
- `/` → `HomeView` — monthly feed + composer; auto-refreshes after posting
- `/@:user` → `ProfileView` — profile card + user's twists for the month
- `/about` → `AboutView` — how SteemTwist works

**Root App**
- Dark green header navbar with avatar, sign-in toggle, and logout
- Keychain detection with read-only notice
- Global notification bar
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

Votes remain enabled so users can still express appreciation — the heart just doesn't move money.

---



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
author:        steemtwist
permlink:      feed-2026-03
parentPermlink: steemtwist   ← the main tag
title:         (empty)
body:          SteemTwist feed — March 2026
```

---

## License

MIT
