// ============================================================
// blockchain.js
// Steem blockchain interactions — pure async helpers.
// No Vue, no DOM dependencies.
// ============================================================

// ---- RPC nodes & fallback ----

const RPC_NODES = [
  "https://api.steemit.com",
  "https://api.justyy.com",
  "https://steemd.steemworld.org",
  "https://api.steem.fans"
];

let currentRPCIndex = 0;

function setRPC(index) {
  currentRPCIndex = index;
  steem.api.setOptions({
    url: RPC_NODES[index]
  });
  console.log("Switched RPC to:", RPC_NODES[index]);
}

// Safe API wrapper with automatic RPC fallback on error.
function callWithFallback(apiCall, args, callback, attempt = 0) {
  apiCall(...args, (err, result) => {
    if (!err) return callback(null, result);
    console.warn("RPC error on", RPC_NODES[currentRPCIndex], err);
    const nextIndex = currentRPCIndex + 1;
    if (nextIndex >= RPC_NODES.length) return callback(err, null);
    setRPC(nextIndex);
    callWithFallback(apiCall, args, callback, attempt + 1);
  });
}

// Promise wrapper around callWithFallback.
function callWithFallbackAsync(apiCall, args) {
  return new Promise((resolve, reject) => {
    callWithFallback(apiCall, args, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ---- Account helpers ----

// Fetch a single Steem account and extract its profile metadata.
// Returns null if the account does not exist or the request fails.
function fetchAccount(username) {
  return new Promise(resolve => {
    if (!username) return resolve(null);
    steem.api.getAccounts([username], (err, result) => {
      if (err || !result || !result.length) return resolve(null);
      const account = result[0];
      let profile = {};
      try {
        profile = JSON.parse(
          account.posting_json_metadata || account.json_metadata
        ).profile || {};
      } catch {}
      resolve({
        username: account.name,
        profileImage: profile.profile_image || "",
        displayName: profile.name || account.name,
        about: profile.about || "",
        coverImage: profile.cover_image || ""
      });
    });
  });
}

// ---- Post / comment helpers ----

// Fetch a single post by author + permlink.
function fetchPost(author, permlink) {
  return callWithFallbackAsync(steem.api.getContent, [author, permlink]);
}

// Fetch direct replies to a post.
function fetchReplies(author, permlink) {
  return callWithFallbackAsync(steem.api.getContentReplies, [author, permlink]);
}

// Recursively fetch ALL nested replies for a post.
function fetchAllReplies(author, permlink) {
  alert("fetchAllReplies");
  function recurse(author, permlink) {
    alert("recurse");
    return callWithFallbackAsync(
      steem.api.getContentReplies,
      [author, permlink]
    ).then(replies => {
      if (!replies || replies.length === 0) return [];

      return Promise.all(
        replies.map(r =>
          recurse(r.author, r.permlink).then(children => [
            { author: r.author, permlink: r.permlink },
            ...children
          ])
        )
      ).then(results => results.flat());
    }).catch(() => []);
  }

  return recurse(author, permlink).then(collected => {
    alert("then");
    if (collected.length === 0) return [];

    return Promise.all(
      collected.map(r =>
        callWithFallbackAsync(steem.api.getContent, [r.author, r.permlink])
          .catch(() => null)
      )
    ).then(enriched =>
      enriched.filter(Boolean)
    );
  });
}

// Fetch recent posts by tag (uses getDiscussionsByCreated).
function fetchPostsByTag(tag, limit = 20) {
  return callWithFallbackAsync(
    steem.api.getDiscussionsByCreated,
    [{
      tag,
      limit
    }]
  );
}

// Fetch recent posts from a user's blog.
function fetchPostsByUser(username, limit = 50) {
  return callWithFallbackAsync(
    steem.api.getDiscussionsByBlog,
    [{
      tag: username,
      limit
    }]
  );
}

// ---- Account-history twist scanner ----

// Fetch all twists posted by a single user in the given month, using the
// account history index instead of getContentReplies on the root post.
//
// Why this is faster for profile pages:
//   getContentReplies walks the entire monthly comment tree (all authors).
//   getAccountHistory only reads one user's operation log — much smaller —
//   and we stop paging the moment we reach entries older than the month.
//
// Algorithm:
//   1. Page backwards through the user's account history in batches of 100
//      (the maximum the Steem node allows per call), starting from -1
//      (the latest entry).
//   2. Keep only "comment" ops whose permlink starts with "tw-" and whose
//      parent_permlink matches the monthly root.
//   3. Stop only when an entry's timestamp predates the month start, or when
//      the node returns an empty batch (true end of history).
//   4. Enrich the filtered raw ops with fetchPost so each object has
//      net_votes, active_votes, children, etc. — same shape as the
//      objects returned by fetchTwistFeed.
//
// Returns a Promise<post[]> sorted newest-first.
function fetchTwistsByUser(username, monthlyRoot) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // -1 tells the node to start from the latest sequence number.
  // 100 is the maximum limit most Steem nodes allow per call.
  const START_FROM = -1;
  const BATCH = 100;
  const collected = [];

  function page(from) {
    return new Promise((resolve) => {
      steem.api.getAccountHistory(username, from, BATCH, (err, history) => {
        if (err) {
          console.warn("[fetchTwistsByUser] error:", err);
          return resolve();
        }

        if (!history || history.length === 0) return resolve();

        let hitOldEntry = false;

        for (let i = history.length - 1; i >= 0; i--) {
          const [, item] = history[i];
          const [type, data] = item.op;
          const ts = steemDate(item.timestamp);

          if (ts < monthStart) {
            hitOldEntry = true;
            break;
          }

          if (type !== "comment") continue;
          if (data.author !== username) continue;
          if (!data.permlink.startsWith(TWIST_CONFIG.POST_PREFIX)) continue;

          if (!collected.some(c => c.data.permlink === data.permlink)) {
            collected.push({
              data,
              timestamp: ts
            });
          }
        }

        // Stop when we've passed the month start.
        if (hitOldEntry) return resolve();

        // Continue paging if there may be more history.
        // Only stop when the batch is empty (handled above) or sequence
        // numbers reach zero.
        const lowestSeq = history[0][0];
        if (lowestSeq <= 0) return resolve();

        page(lowestSeq - 1).then(resolve);
      });
    });
  }

  return page(START_FROM).then(async () => {
    if (collected.length === 0) return [];

    // Enrich each raw op with a full getContent call to get vote counts,
    // children count, and all other fields TwistCardComponent expects.
    const enriched = await Promise.all(
      collected.map(({
          data
        }) =>
        fetchPost(data.author, data.permlink).catch(() => null)
      )
    );

    return enriched
      .filter(p => p && p.author)
      .sort((a, b) => steemDate(b.created) - steemDate(a.created));
  });
}

// ---- Keychain helpers ----

// Post a new root post or a comment via Steem Keychain.
//
// For a ROOT POST:
//   parentAuthor  = ""
//   parentPermlink = the main tag (e.g. "myapp")
//
// For a COMMENT:
//   parentAuthor  = author of the post/comment being replied to
//   parentPermlink = permlink of that post/comment
//
// jsonMetadata may be a plain object or a JSON string.
// tags (string[]) are merged into jsonMetadata before submission.
//
// callback signature: (response) => { response.success, response.message }
function keychainPost(
  username,
  title,
  body,
  parentPermlink,
  parentAuthor,
  jsonMetadata,
  permlink,
  tags,
  callback
) {
  const meta = typeof jsonMetadata === "string" ?
    JSON.parse(jsonMetadata) : {
      ...jsonMetadata
    };
  if (tags && tags.length) meta.tags = tags;

  steem_keychain.requestPost(
    username, title, body,
    parentPermlink, parentAuthor,
    JSON.stringify(meta),
    permlink, "",
    callback
  );
}

// Request a Keychain signature to verify account ownership (login).
// callback signature: (response) => { response.success, response.data.username }
function keychainLogin(username, callback) {
  steem_keychain.requestSignBuffer(
    username,
    "Login to Steem Vue App",
    "Posting",
    callback
  );
}

// ---- Utility ----

// Build a unique permlink from a title string + timestamp suffix.
// Steem permlinks: lowercase, hyphens only, max 255 chars.
function buildPermlink(title) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 241);
  return `${slug}-${Date.now()}`;
}

// Steem timestamps omit the UTC 'Z' suffix; append it to ensure correct
// Date parsing across all browsers.
function steemDate(ts) {
  if (!ts) return new Date(NaN);
  if (typeof ts === "string" && !ts.endsWith("Z")) ts += "Z";
  return new Date(ts);
}

// ============================================================
// STEEMTWIST — blockchain helpers
// ============================================================

const TWIST_CONFIG = {
  ROOT_ACCOUNT: "steemtwist",
  ROOT_PREFIX: "feed-",
  TAG: "steemtwist",
  POST_PREFIX: "tw",
  // All tags attached to every twist. First tag is the Steem category.
  TAGS: ["steemtwist", "microblog", "steem", "twist", "social", "web"],
  // Canonical dApp URL embedded as a back-link at the end of every body.
  DAPP_URL: "https://puncakbukit.github.io/steemtwist"
};

// Returns the current monthly root permlink, e.g. "feed-2026-03".
window.getMonthlyRoot = function() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${TWIST_CONFIG.ROOT_PREFIX}${y}-${m}`;
}

// Returns a deterministic, collision-free permlink for a new twist.
// Format: tw-YYYYMMDD-HHMMSS-username
function generateTwistPermlink(username) {
  const d = new Date();
  const ts =
    d.getUTCFullYear() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") + "-" +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0");
  return `${TWIST_CONFIG.POST_PREFIX}-${ts}-${username}`;
}

// Fetch all direct-reply twists for the given monthly root.
// First fetches the list via getContentReplies (fast), then enriches each
// post with getContent in parallel so active_votes is always populated —
// giving accurate upvote counts consistent with the twist-specific page.
// Resolves to an array sorted newest-first.
function fetchTwistFeed(monthlyRoot) {
  return fetchReplies(TWIST_CONFIG.ROOT_ACCOUNT, monthlyRoot).then(replies => {
    // Enrich all posts in parallel to get active_votes, net_votes, children.
    return Promise.all(
      replies.map(r => fetchPost(r.author, r.permlink).catch(() => r))
    );
  }).then(enriched =>
    enriched
    .filter(p => p && p.author)
    .sort((a, b) => steemDate(b.created) - steemDate(a.created))
  );
}

// Build a [comment, comment_options] operation pair with payouts disabled.
// max_accepted_payout = "0.000 SBD" prevents any monetary reward.
// allow_votes = true so likes still work as appreciation signals.
//
// A back-link to the dApp is appended to every body so other Steem interfaces
// (Steemit, Busy, etc.) show the origin. SteemTwist strips it before rendering.
function buildZeroPayoutOps(username, body, parentAuthor, parentPermlink, permlink, jsonMetadata) {
  const bodyWithLink =
    body.trimEnd() +
    `\n\n<sub>Posted via [SteemTwist](${TWIST_CONFIG.DAPP_URL})</sub>`;

  const comment = [
    "comment",
    {
      parent_author: parentAuthor,
      parent_permlink: parentPermlink,
      author: username,
      permlink: permlink,
      title: "",
      body: bodyWithLink,
      json_metadata: JSON.stringify(jsonMetadata)
    }
  ];

  const commentOptions = [
    "comment_options",
    {
      author: username,
      permlink: permlink,
      max_accepted_payout: "0.000 SBD",
      percent_steem_dollars: 10000,
      allow_votes: true, // likes remain active
      allow_curation_rewards: false, // no curation rewards either
      extensions: []
    }
  ];

  return [comment, commentOptions];
}

// Post a new twist via Steem Keychain.
// Broadcasts comment + comment_options atomically so payouts are disabled
// from the moment of posting (cannot be changed after the fact).
// callback: (response) => { response.success, response.error }
function postTwist(username, message, callback) {
  const root = getMonthlyRoot();
  const permlink = generateTwistPermlink(username);

  const ops = buildZeroPayoutOps(
    username,
    message,
    TWIST_CONFIG.ROOT_ACCOUNT,
    root,
    permlink, {
      app: "steemtwist/0.1",
      type: "micro",
      tags: TWIST_CONFIG.TAGS
    }
  );

  steem_keychain.requestBroadcast(username, ops, "Posting", callback);
}

// Post a reply to an existing twist via Steem Keychain.
// Also broadcasts with zero payout for consistency.
function postTwistReply(username, message, parentAuthor, parentPermlink, callback) {
  const replyPermlink = generateTwistPermlink(username);

  const ops = buildZeroPayoutOps(
    username,
    message,
    parentAuthor,
    parentPermlink,
    replyPermlink, {
      app: "steemtwist/0.1",
      type: "micro-reply",
      tags: TWIST_CONFIG.TAGS
    }
  );

  steem_keychain.requestBroadcast(username, ops, "Posting", callback);
}

// Vote on a twist via Steem Keychain.
// weight: integer 1–10000 (100% = 10000).
function voteTwist(voter, author, permlink, weight, callback) {
  steem_keychain.requestVote(voter, permlink, author, weight, callback);
}

// Retwist (resteem) a post via Steem Keychain.
// A resteem is a custom_json operation under the "follow" plugin.
// callback: (response) => { response.success, response.error }
function retwistPost(username, author, permlink, callback) {
  const json = JSON.stringify([
    "reblog",
    {
      account: username,
      author,
      permlink
    }
  ]);
  steem_keychain.requestCustomJson(
    username,
    "follow",
    "Posting",
    json,
    "Retwist",
    callback
  );
}

// ---- Client-side ranking ----

// Sum of positive vote percents — a Steem-Power-weighted upvote signal.
// Accounts with more SP cast higher-percent votes, so this naturally
// weights influential votes more than a simple count.
function voteWeight(post) {
  const votes = post.active_votes || [];
  return votes.reduce((sum, v) => sum + (v.percent > 0 ? v.percent : 0), 0);
}

// "Hot" score — gravity decay formula inspired by Hacker News.
// score = voteWeight / (ageHours + 2)^1.5
// Effect: newer posts need fewer votes to rank high;
//         older posts decay even with many votes.
function scoreHot(post) {
  const ageHours = (Date.now() - steemDate(post.created).getTime()) / 3_600_000;
  return voteWeight(post) / Math.pow(ageHours + 2, 1.5);
}

// "Top" score — pure vote weight, no time decay.
// Equivalent to Reddit's "Top of all time" within the monthly feed.
function scoreTop(post) {
  return voteWeight(post);
}

// "New" score — simple chronological, newest first.
function scoreNew(post) {
  return steemDate(post.created).getTime();
}

// Apply a named sort mode to an array of posts.
// Returns a new sorted array; never mutates the original.
function sortTwists(posts, mode) {
  const fn = mode === "hot" ? scoreHot :
    mode === "top" ? scoreTop :
    scoreNew;
  return [...posts].sort((a, b) => fn(b) - fn(a));
}

// Start streaming all operations from the blockchain.
// Start streaming all operations from the blockchain.
// Calls onTwist(post) whenever a new top-level SteemTwist post is detected.
// Calls onVote(author, permlink, voter, percent) whenever a vote lands on
// any post — HomeView uses this to update active_votes in-memory so the
// ranking computed property re-sorts without a full reload.
// Returns a stop() function — call it to cancel the stream.
function startFirehose(monthlyRoot, onTwist, onVote) {
  let active = true;

  steem.api.streamOperations((err, op) => {
    if (!active) return;
    if (err) return;

    const [type, data] = op;

    // ── Vote op: forward to caller for live ranking updates ──────────
    if (type === "vote" && typeof onVote === "function") {
      onVote(data.author, data.permlink, data.voter, data.weight);
      return;
    }

    // ── Comment op: new twist ────────────────────────────────────────
    if (type !== "comment") return;
    if (data.parent_author !== TWIST_CONFIG.ROOT_ACCOUNT) return;
    if (data.parent_permlink !== monthlyRoot) return;

    // Build a minimal post object so the card renders instantly.
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const post = {
      author: data.author,
      permlink: data.permlink,
      body: data.body,
      parent_author: data.parent_author,
      parent_permlink: data.parent_permlink,
      created: now,
      net_votes: 0,
      active_votes: [],
      children: 0,
      pending_payout_value: "0.000 SBD",
      json_metadata: data.json_metadata || "",
      _firehose: true
    };

    onTwist(post);

    // Enrich asynchronously once the node has indexed the operation.
    setTimeout(() => {
      if (!active) return;
      fetchPost(data.author, data.permlink).then(full => {
        if (!active || !full || !full.author) return;
        full._firehose = false;
        onTwist(full, true /* isUpdate */ );
      }).catch(() => {});
    }, 4000);
  });

  return {
    stop() {
      active = false;
    }
  };
}

// ============================================================
// STEEMTWIST — Pin / Unpin helpers
// ============================================================

// Broadcast a "pin" custom_json to record which twist is pinned.
// Only the latest pin/unpin entry in account history is used,
// so this safely overwrites any previous pin.
// callback: (response) => { response.success, response.error }
function pinTwist(username, author, permlink, callback) {
  steem_keychain.requestCustomJson(
    username,
    "steemtwist",
    "Posting",
    JSON.stringify({ action: "pin", author, permlink }),
    "Pin twist",
    callback
  );
}

// Broadcast an "unpin" custom_json to clear the pinned twist.
// callback: (response) => { response.success, response.error }
function unpinTwist(username, callback) {
  steem_keychain.requestCustomJson(
    username,
    "steemtwist",
    "Posting",
    JSON.stringify({ action: "unpin" }),
    "Unpin twist",
    callback
  );
}

// localStorage key for pending pin cache.
// Stores { author, permlink, ts } for up to PIN_CACHE_TTL ms after a pin,
// so the UI stays correct during the window between broadcast and indexing.
const PIN_CACHE_KEY = "steemtwist_pending_pin";
const PIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function setPinCache(username, author, permlink) {
  try {
    localStorage.setItem(PIN_CACHE_KEY + "_" + username,
      JSON.stringify({ author, permlink, ts: Date.now() }));
  } catch {}
}

function clearPinCache(username) {
  try { localStorage.removeItem(PIN_CACHE_KEY + "_" + username); } catch {}
}

function getPinCache(username) {
  try {
    const raw = localStorage.getItem(PIN_CACHE_KEY + "_" + username);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts > PIN_CACHE_TTL) {
      localStorage.removeItem(PIN_CACHE_KEY + "_" + username);
      return null;
    }
    return cached;
  } catch { return null; }
}

// Scan a user's account history for the latest "steemtwist" custom_json
// with action "pin" or "unpin", then return the pinned post object or null.
//
// If the chain result differs from a recent localStorage cache entry
// (written immediately on pin/unpin), the cache wins — this covers the
// window between broadcast and node indexing (typically a few seconds).
//
// Returns Promise<post|null>.
function fetchPinnedTwist(username) {
  const BATCH = 100;
  // Stop after scanning this many entries. Pin ops are always recent, so
  // 500 entries is more than enough. Without this cap, accounts with long
  // histories (thousands of votes/posts) would page forever.
  const MAX_SCAN = 500;
  let scanned = 0;

  function page(from) {
    return new Promise((resolve) => {
      steem.api.getAccountHistory(username, from, BATCH, (err, history) => {
        if (err || !history || history.length === 0) return resolve(null);

        // Walk newest-first
        for (let i = history.length - 1; i >= 0; i--) {
          const [, item] = history[i];
          const [type, data] = item.op;
          scanned++;

          if (type !== "custom_json") continue;
          if (data.id !== "steemtwist") continue;

          let payload;
          try { payload = JSON.parse(data.json); } catch { continue; }

          if (payload.action === "unpin") return resolve(null);
          if (payload.action === "pin" && payload.author && payload.permlink) {
            return resolve({ author: payload.author, permlink: payload.permlink });
          }
        }

        // Stop if we have scanned enough or reached the beginning of history
        const lowestSeq = history[0][0];
        if (lowestSeq <= 0 || scanned >= MAX_SCAN) return resolve(null);
        page(lowestSeq - 1).then(resolve);
      });
    });
  }

  return page(-1).then(chainResult => {
    // Check localStorage cache for a more recent pending pin/unpin
    const cached = getPinCache(username);

    // If cache exists, it was written after the last broadcast and the chain
    // may not have indexed it yet — prefer the cache.
    // Once the chain result matches the cache, clear the cache.
    let found = chainResult;
    if (cached) {
      if (cached.author === null) {
        // cached unpin — chain may still show old pin
        found = null;
      } else if (!chainResult || chainResult.permlink !== cached.permlink) {
        // cached pin not yet on chain — use cache
        found = { author: cached.author, permlink: cached.permlink };
      } else {
        // chain has caught up — safe to clear cache
        clearPinCache(username);
      }
    }

    if (!found) return null;
    return fetchPost(found.author, found.permlink)
      .then(post => (post && post.author ? post : null))
      .catch(() => null);
  });
}

// ============================================================
// STEEMTWIST — Signals (Notifications)
// ============================================================

// How many history entries to scan per Signals fetch.
// 500 covers roughly a few weeks of activity for active accounts.
const SIGNALS_SCAN_LIMIT = 500;

// Classify one account-history entry into a signal object, or return null
// if the entry is not a relevant notification for the given username.
//
// Signal shape:
//   {
//     id:         string   — unique key (sequence number as string)
//     type:       "love" | "reply" | "mention" | "follow" | "retwist"
//     actor:      string   — who triggered the signal
//     postAuthor: string   — author of the target post (for building the link)
//     permlink:   string   — permlink of the target post or actor's comment
//     body:       string   — short preview text where applicable
//     ts:         Date
//   }
function classifySignalEntry(seqNum, item, username) {
  const [type, data] = item.op;
  const ts = steemDate(item.timestamp);

  // ── Twist Love ───────────────────────────────────────────────────────────
  if (type === "vote") {
    if (data.author !== username) return null;         // vote on someone else's post
    if (data.voter === username)  return null;         // self-vote
    return {
      id: String(seqNum),
      type: "love",
      actor: data.voter,
      postAuthor: data.author,   // always username — the account being voted on
      permlink: data.permlink,
      body: "",
      ts
    };
  }

  // ── Thread Reply or Mention ──────────────────────────────────────────────
  if (type === "comment") {
    if (data.author === username) return null;         // own comment

    const bodyLower = (data.body || "").toLowerCase();
    const mentioned = bodyLower.includes("@" + username.toLowerCase());

    // Reply: actor replied directly to one of the user's posts/comments
    if (data.parent_author === username) {
      return {
        id: String(seqNum),
        type: mentioned ? "mention" : "reply",
        actor: data.author,
        postAuthor: data.author,   // link to the actor's comment
        permlink: data.permlink,
        body: stripSignalBody(data.body),
        ts
      };
    }

    // Mention without being the direct parent (e.g. replying in a thread)
    if (mentioned) {
      return {
        id: String(seqNum),
        type: "mention",
        actor: data.author,
        postAuthor: data.author,   // link to the actor's comment
        permlink: data.permlink,
        body: stripSignalBody(data.body),
        ts
      };
    }

    return null;
  }

  // ── Follow or Retwist ────────────────────────────────────────────────────
  if (type === "custom_json") {
    let payload;
    try { payload = JSON.parse(data.json); } catch { return null; }

    // Follow uses the "follow" plugin — payload is ["follow", { ... }]
    if (data.id === "follow" && Array.isArray(payload) && payload[0] === "follow") {
      const follow = payload[1];
      if (follow.following !== username) return null;
      if (!follow.what || !follow.what.includes("blog")) return null;
      return {
        id: String(seqNum),
        type: "follow",
        actor: follow.follower,
        postAuthor: "",
        permlink: "",
        body: "",
        ts
      };
    }

    // Retwist (reblog) — payload is ["reblog", { account, author, permlink }]
    if (data.id === "follow" && Array.isArray(payload) && payload[0] === "reblog") {
      const reblog = payload[1];
      if (reblog.author !== username) return null;
      return {
        id: String(seqNum),
        type: "retwist",
        actor: reblog.account,
        postAuthor: reblog.author,   // always username — their post was retwisted
        permlink: reblog.permlink,
        body: "",
        ts
      };
    }

    return null;
  }

  return null;
}

// Strip body down to a readable one-line preview for signal rows.
function stripSignalBody(body) {
  if (!body) return "";
  return body
    .replace(/\n+<sub>Posted via \[SteemTwist\][^\n]*/i, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[#*`_~>\[\]!]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

// Fetch the latest signals for a user by scanning their account history.
// Scans up to SIGNALS_SCAN_LIMIT entries newest-first and returns all
// recognised signal objects sorted newest-first.
//
// Returns Promise<signal[]>.
function fetchSignals(username) {
  const BATCH = 100;
  const collected = [];
  let scanned = 0;

  function page(from) {
    return new Promise((resolve) => {
      steem.api.getAccountHistory(username, from, BATCH, (err, history) => {
        if (err || !history || history.length === 0) return resolve();

        for (let i = history.length - 1; i >= 0; i--) {
          const [seqNum, item] = history[i];
          scanned++;

          const signal = classifySignalEntry(seqNum, item, username);
          if (signal) collected.push(signal);

          if (scanned >= SIGNALS_SCAN_LIMIT) return resolve();
        }

        const lowestSeq = history[0][0];
        if (lowestSeq <= 0 || scanned >= SIGNALS_SCAN_LIMIT) return resolve();
        page(lowestSeq - 1).then(resolve);
      });
    });
  }

  return page(-1).then(() =>
    collected.sort((a, b) => b.ts - a.ts)
  );
}

// ============================================================
// STEEMTWIST — Follow helpers
// ============================================================

// Fetch ALL followers of a user by paging through getFollowers.
// Steem allows up to 1000 per call; we keep fetching until we get
// fewer than the limit, signalling the last page.
// Returns Promise<string[]> — array of follower usernames.
function fetchFollowers(username) {
  const LIMIT = 1000;
  const collected = [];

  function page(startFrom) {
    return new Promise((resolve) => {
      steem.api.getFollowers(username, startFrom, "blog", LIMIT, (err, result) => {
        if (err || !result || result.length === 0) return resolve();
        for (const row of result) collected.push(row.follower);
        if (result.length < LIMIT) return resolve();
        // Last entry is the cursor for the next page
        page(result[result.length - 1].follower).then(resolve);
      });
    });
  }

  return page("").then(() => collected);
}

// Fetch ALL accounts that a user is following.
// Returns Promise<string[]> — array of following usernames.
function fetchFollowing(username) {
  const LIMIT = 1000;
  const collected = [];

  function page(startFrom) {
    return new Promise((resolve) => {
      steem.api.getFollowing(username, startFrom, "blog", LIMIT, (err, result) => {
        if (err || !result || result.length === 0) return resolve();
        for (const row of result) collected.push(row.following);
        if (result.length < LIMIT) return resolve();
        page(result[result.length - 1].following).then(resolve);
      });
    });
  }

  return page("").then(() => collected);
}
