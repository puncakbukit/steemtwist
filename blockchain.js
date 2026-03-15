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
  steem.api.setOptions({ url: RPC_NODES[index] });
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
        username:     account.name,
        profileImage: profile.profile_image || "",
        displayName:  profile.name || account.name,
        about:        profile.about || "",
        coverImage:   profile.cover_image || ""
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
  return new Promise(resolve => {
    const collected = [];

    function recurse(author, permlink, done) {
      callWithFallback(
        steem.api.getContentReplies,
        [author, permlink],
        (err, replies) => {
          if (err || !replies || replies.length === 0) return done();
          let pending = replies.length;
          replies.forEach(reply => {
            collected.push(reply);
            recurse(reply.author, reply.permlink, () => {
              pending--;
              if (pending === 0) done();
            });
          });
        }
      );
    }

    recurse(author, permlink, () => resolve(collected));
  });
}

// Fetch recent posts by tag (uses getDiscussionsByCreated).
function fetchPostsByTag(tag, limit = 20) {
  return callWithFallbackAsync(
    steem.api.getDiscussionsByCreated,
    [{ tag, limit }]
  );
}

// Fetch recent posts from a user's blog.
function fetchPostsByUser(username, limit = 50) {
  return callWithFallbackAsync(
    steem.api.getDiscussionsByBlog,
    [{ tag: username, limit }]
  );
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
  const meta = typeof jsonMetadata === "string"
    ? JSON.parse(jsonMetadata)
    : { ...jsonMetadata };
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
  ROOT_PREFIX:  "feed-",
  TAG:          "steemtwist",
  POST_PREFIX:  "tw"
};

// Returns the current monthly root permlink, e.g. "feed-2026-03".
function getMonthlyRoot() {
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
// Resolves to an array sorted newest-first.
function fetchTwistFeed(monthlyRoot) {
  return fetchReplies(TWIST_CONFIG.ROOT_ACCOUNT, monthlyRoot).then(replies =>
    [...replies].sort(
      (a, b) => steemDate(b.created) - steemDate(a.created)
    )
  );
}

// Build a [comment, comment_options] operation pair with payouts disabled.
// max_accepted_payout = "0.000 SBD" prevents any monetary reward.
// allow_votes = true so likes still work as appreciation signals.
function buildZeroPayoutOps(username, body, parentAuthor, parentPermlink, permlink, jsonMetadata) {
  const comment = [
    "comment",
    {
      parent_author:   parentAuthor,
      parent_permlink: parentPermlink,
      author:          username,
      permlink:        permlink,
      title:           "",
      body:            body,
      json_metadata:   JSON.stringify(jsonMetadata)
    }
  ];

  const commentOptions = [
    "comment_options",
    {
      author:                    username,
      permlink:                  permlink,
      max_accepted_payout:       "0.000 SBD",
      percent_steem_dollars:     10000,
      allow_votes:               true,   // likes remain active
      allow_curation_rewards:    false,  // no curation rewards either
      extensions:                []
    }
  ];

  return [comment, commentOptions];
}

// Post a new twist via Steem Keychain.
// Broadcasts comment + comment_options atomically so payouts are disabled
// from the moment of posting (cannot be changed after the fact).
// callback: (response) => { response.success, response.error }
function postTwist(username, message, callback) {
  const root     = getMonthlyRoot();
  const permlink = generateTwistPermlink(username);

  const ops = buildZeroPayoutOps(
    username,
    message,
    TWIST_CONFIG.ROOT_ACCOUNT,  // parentAuthor
    root,                       // parentPermlink
    permlink,
    { app: "steemtwist/0.1", type: "micro", tags: [TWIST_CONFIG.TAG] }
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
    replyPermlink,
    { app: "steemtwist/0.1", type: "micro-reply", tags: [TWIST_CONFIG.TAG] }
  );

  steem_keychain.requestBroadcast(username, ops, "Posting", callback);
}

// Vote on a twist via Steem Keychain.
// weight: integer 1–10000 (100% = 10000).
function voteTwist(voter, author, permlink, weight, callback) {
  steem_keychain.requestVote(voter, permlink, author, weight, callback);
}
