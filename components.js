// ============================================================
// components.js
// Reusable Vue 3 components for a Steem + Vue Router SPA.
// No app-specific logic — extend freely.
// ============================================================

// ---- AppNotificationComponent ----
// A slim toast bar rendered at the top of the app.
// Type: "error" | "success" | "info"
// Auto-dismisses after 3.5 s for success/info; errors stay until dismissed.
const AppNotificationComponent = {
  name: "AppNotificationComponent",
  props: {
    message: String,
    type: { type: String, default: "error" }
  },
  emits: ["dismiss"],
  data() {
    return { timer: null };
  },
  watch: {
    message(val) {
      clearTimeout(this.timer);
      if (val && this.type !== "error") {
        this.timer = setTimeout(() => this.$emit("dismiss"), 3500);
      }
    }
  },
  beforeUnmount() {
    clearTimeout(this.timer);
  },
  computed: {
    styles() {
      const base = {
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        margin: "10px auto", padding: "10px 14px",
        borderRadius: "6px", maxWidth: "600px",
        fontSize: "14px", gap: "10px"
      };
      if (this.type === "success")
        return { ...base, background: "#0a2d12", border: "1px solid #166534", color: "#86efac" };
      if (this.type === "info")
        return { ...base, background: "#0a1a2d", border: "1px solid #1e3a5f", color: "#93c5fd" };
      return   { ...base, background: "#2d0a0a", border: "1px solid #7f1d1d", color: "#fca5a5" };
    },
    icon() {
      if (this.type === "success") return "✅";
      if (this.type === "info")    return "ℹ️";
      return "⚠️";
    }
  },
  template: `
    <div v-if="message" :style="styles" role="alert">
      <span>{{ icon }} {{ message }}</span>
      <button
        @click="$emit('dismiss')"
        style="background:none;border:none;cursor:pointer;font-size:16px;padding:0;color:inherit;line-height:1;"
        aria-label="Dismiss"
      >✕</button>
    </div>
  `
};

// ---- AuthComponent ----
// Handles login (via Steem Keychain) and logout.
// Emits: login(username), logout, close
const AuthComponent = {
  name: "AuthComponent",
  props: {
    username:    String,
    hasKeychain: Boolean,
    loginError:  String,
    isLoggingIn: { type: Boolean, default: false }
  },
  emits: ["login", "logout", "close"],
  data() {
    return { usernameInput: "" };
  },
  watch: {
    username(val) {
      if (val) this.$emit("close");
    }
  },
  methods: {
    submit() {
      const val = this.usernameInput.trim().toLowerCase();
      if (!val) return;
      this.$emit("login", val);
    },
    onKeydown(e) {
      if (e.key === "Enter")  this.submit();
      if (e.key === "Escape") this.$emit("close");
    }
  },
  template: `
    <div style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center;margin:8px 0;">
      <template v-if="!username">
        <input
          v-model="usernameInput"
          type="text"
          placeholder="Steem username"
          autocomplete="username"
          style="padding:7px 10px;border-radius:20px;border:1px solid #2e2050;background:#0f0a1e;color:#e8e0f0;font-size:14px;width:180px;"
          @keydown="onKeydown"
        />
        <button @click="submit" :disabled="!usernameInput.trim() || isLoggingIn">Sign in</button>
        <button @click="$emit('close')" style="background:#2e2050;border-radius:20px;">Cancel</button>
        <div v-if="loginError" style="width:100%;color:#c62828;font-size:13px;margin-top:4px;">
          {{ loginError }}
        </div>
      </template>
      <template v-else>
        <span style="font-size:14px;">Logged in as <strong>@{{ username }}</strong></span>
        <button @click="$emit('logout')" style="background:#2e2050;border-radius:20px;">Logout</button>
      </template>
    </div>
  `
};

// ---- UserProfileComponent ----
// Displays a Steem account's cover image, avatar, display name, and bio.
// Pass a pre-fetched `profileData` object (from fetchAccount) as a prop.
const UserProfileComponent = {
  name: "UserProfileComponent",
  props: {
    profileData: Object   // { username, profileImage, displayName, about, coverImage }
  },
  methods: {
    safeUrl(url) {
      try {
        const u = new URL(url);
        return u.protocol === "https:" ? url : "";
      } catch { return ""; }
    }
  },
  template: `
    <div v-if="profileData">
      <!-- Cover image — falls back to @steemtwist gradient cover -->
      <div :style="{
        backgroundImage: safeUrl(profileData.coverImage)
          ? 'url(' + safeUrl(profileData.coverImage) + ')'
          : 'linear-gradient(135deg,#1a3af5 0%,#8b2fc9 55%,#e0187a 100%)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        height: '150px', borderRadius: '10px'
      }"></div>
      <!-- Avatar + info -->
      <div style="display:flex;align-items:center;margin-top:-40px;padding:10px;">
        <img
          :src="safeUrl(profileData.profileImage) || 'https://steemitimages.com/u/steemtwist/avatar'"
          style="width:80px;height:80px;border-radius:50%;border:3px solid #1a1030;background:#1a1030;"
        />
        <div style="margin-left:15px;">
          <h2 style="margin:0;color:#e8e0f0;">{{ profileData.displayName }}</h2>
          <small style="color:#9b8db0;">@{{ profileData.username }}</small>
          <p style="margin:5px 0;color:#9b8db0;">{{ profileData.about }}</p>
        </div>
      </div>
    </div>
  `
};

// ---- LoadingSpinnerComponent ----
// Simple centred loading indicator. Show while async data is being fetched.
const LoadingSpinnerComponent = {
  name: "LoadingSpinnerComponent",
  props: {
    message: { type: String, default: "Loading..." }
  },
  template: `
    <div style="text-align:center;padding:30px;color:#5a4e70;">
      <div style="
        display:inline-block;width:32px;height:32px;
        border:4px solid #2e2050;border-top-color:#a855f7;
        border-radius:50%;animation:spin 0.8s linear infinite;
      "></div>
      <p style="margin-top:10px;font-size:14px;">{{ message }}</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `
};

// ============================================================
// STEEMTWIST COMPONENTS
// ============================================================

// Body longer than this, or children count above THREAD_REPLY_THRESHOLD,
// triggers collapsed thread mode. Matches the composer limit so native
// twists never collapse.
const PREVIEW_LENGTH       = 280;
const THREAD_REPLY_THRESHOLD = 3;

// Shared markdown renderer — configured once, reused everywhere.
// marked.parse() is synchronous and returns sanitised HTML.
const markedOptions = { breaks: true, gfm: true };
function renderMarkdown(text) {
  if (!text) return "";
  return marked.parse(text, markedOptions);
}

// Strip the SteemTwist back-link appended by buildZeroPayoutOps before
// rendering. The link takes the form:
//   \n\n<sub>Posted via [SteemTwist](...)</sub>
// Matching on the opening <sub>Posted via is sufficient and tolerates any URL.
function stripBackLink(text) {
  if (!text) return "";
  return text.replace(/\n+<sub>Posted via \[SteemTwist\][^\n]*/i, "").trimEnd();
}

// ---- ReplyCardComponent ----
// Renders a single reply with its own compose box and a recursive
// ThreadComponent for its children. Declared before ThreadComponent
// so the two can reference each other via the global component registry.
const ReplyCardComponent = {
  name: "ReplyCardComponent",
  inject: ["username", "hasKeychain"],
  props: {
    reply: { type: Object, required: true },
    depth: { type: Number, default: 0 }
  },
  data() {
    return {
      showReplyBox:  false,
      // Auto-expand the first two nesting levels (depth 0 and 1).
      // Deeper threads stay collapsed to avoid overwhelming the page.
      showChildren:  this.depth < 2,
      replyText:     "",
      isReplying:    false,
      isVoting:      false,
      hasVoted:      false,
      isRetwisting:  false,
      hasRetwisted:  false,
      replyCount:    this.reply.children || 0,
      lastError:     ""
    };
  },
  computed: {
    avatarUrl() {
      return `https://steemitimages.com/u/${this.reply.author}/avatar/small`;
    },
    relativeTime() {
      const diff = Date.now() - steemDate(this.reply.created).getTime();
      const s = Math.floor(diff / 1000);
      if (s < 60)  return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60)  return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24)  return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    },
    absoluteTime() {
      const d = steemDate(this.reply.created);
      if (isNaN(d)) return "";
      return d.toUTCString().replace(" GMT", " UTC");
    },
    replyUrl() {
      return `#/@${this.reply.author}/${this.reply.permlink}`;
    },
    bodyHtml() { return renderMarkdown(stripBackLink(this.reply.body)); },
    canAct()   { return !!this.username && this.hasKeychain; },
    indent()   { return Math.min(this.depth, 4) * 16; },
    
    upvoteCount() {
  const votes = this.reply.active_votes;

  if (!votes) return this.hasVoted ? 1 : 0;

  const count = votes.filter(v => v.percent > 0).length;

  return count + (this.hasVoted ? 1 : 0);
}
  },
  methods: {
    vote() {
      if (!this.canAct || this.isVoting || this.hasVoted) return;
      this.isVoting = true;
      voteTwist(this.username, this.reply.author, this.reply.permlink, 10000, (res) => {
        this.isVoting = false;
        if (res.success) {
          this.hasVoted = true;
        } else {
          this.lastError = res.error || res.message || "Vote failed.";
        }
      });
    },
    retwist() {
      if (!this.canAct || this.isRetwisting || this.hasRetwisted) return;
      if (this.reply.author === this.username) {
        this.lastError = "You cannot retwist your own twist.";
        return;
      }
      this.isRetwisting = true;
      retwistPost(this.username, this.reply.author, this.reply.permlink, (res) => {
        this.isRetwisting = false;
        if (res.success) {
          this.hasRetwisted = true;
        } else {
          this.lastError = res.error || res.message || "Retwist failed.";
        }
      });
    },
    toggleReplies() {
      if (this.replyCount > 0) this.showChildren = !this.showChildren;
      if (this.canAct)         this.showReplyBox  = !this.showReplyBox;
    },
    submitReply() {
      const text = this.replyText.trim();
      if (!text || !this.canAct) return;
      this.isReplying = true;
      postTwistReply(this.username, text, this.reply.author, this.reply.permlink, (res) => {
        this.isReplying = false;
        if (res.success) {
          this.replyText    = "";
          this.showChildren = true;
          this.replyCount++;
        } else {
          this.lastError = res.error || res.message || "Reply failed.";
        }
      });
    }
  },
  template: `
    <div :style="{ paddingLeft: indent + 'px' }">
      <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #2e2050;">

        <!-- Avatar -->
        <a :href="'#/@' + reply.author" style="flex-shrink:0;">
          <img
            :src="avatarUrl"
            style="width:28px;height:28px;border-radius:50%;border:2px solid #2e2050;"
            @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
          />
        </a>

        <!-- Content -->
        <div style="flex:1;min-width:0;">

          <!-- Header -->
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
            <a
              :href="'#/@' + reply.author"
              style="font-weight:bold;color:#a855f7;text-decoration:none;font-size:13px;"
            >@{{ reply.author }}</a>
            <!-- Timestamp linked to the reply's own page; absolute time on hover -->
            <a
              :href="replyUrl"
              :title="absoluteTime"
              style="font-size:11px;color:#5a4e70;text-decoration:none;"
            >{{ relativeTime }}</a>
          </div>

          <!-- Body -->
          <div class="twist-body" style="font-size:14px;" v-html="bodyHtml"></div>

          <!-- Actions: love + retwist + reply + permalink -->
          <div style="display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap;">

            <!-- Love -->
            <button
              @click="vote"
              :disabled="!canAct || isVoting || hasVoted"
              :style="{
                background: hasVoted ? '#3b0764' : '#1e1535',
                color: hasVoted ? '#e879f9' : '#9b8db0',
                border: hasVoted ? '1px solid #a855f7' : '1px solid #2e2050',
                borderRadius: '20px', padding: '2px 10px',
                cursor: (!canAct || hasVoted) ? 'default' : 'pointer',
                fontSize: '12px'
              }"
            >{{ isVoting ? "…" : (hasVoted ? "❤️" : "🤍") }} {{ upvoteCount }}</button>

            <!-- Retwist -->
            <button
              @click="retwist"
              :disabled="!canAct || isRetwisting || hasRetwisted || reply.author === username"
              :style="{
                background: hasRetwisted ? '#0c2d1a' : '#1e1535',
                color:      hasRetwisted ? '#4ade80'  : '#9b8db0',
                border:     hasRetwisted ? '1px solid #166534' : '1px solid #2e2050',
                borderRadius: '20px', padding: '2px 10px',
                cursor: (!canAct || hasRetwisted || reply.author === username) ? 'default' : 'pointer',
                fontSize: '12px'
              }"
              :title="reply.author === username ? 'Cannot retwist your own twist' : ''"
            >{{ isRetwisting ? "…" : (hasRetwisted ? "🔁 Retwisted" : "🔁") }}</button>

            <!-- Reply -->
            <button
              @click="toggleReplies"
              style="
                background:none;border:none;padding:0;margin:0;
                color:#a855f7;font-size:12px;cursor:pointer;
                text-decoration:underline;font-weight:600;
              "
            >
              💬 {{ replyCount > 0 ? replyCount + ' repl' + (replyCount === 1 ? 'y' : 'ies') : 'Reply' }}
            </button>

            <!-- Permalink -->
            <a
              :href="replyUrl"
              style="font-size:11px;color:#5a4e70;text-decoration:none;"
              title="Open reply page"
            >🔗</a>

          </div>

          <!-- Compose box -->
          <div v-if="showReplyBox && canAct" style="margin-top:8px;">
            <textarea
              v-model="replyText"
              placeholder="Write a reply…"
              maxlength="1000"
              style="
                width:100%;box-sizing:border-box;
                padding:7px;border-radius:8px;border:1px solid #2e2050;background:#0f0a1e;color:#e8e0f0;
                font-size:13px;resize:vertical;min-height:52px;
              "
            ></textarea>
            <div style="text-align:right;margin-top:4px;">
              <button
                @click="submitReply"
                :disabled="!replyText.trim() || isReplying"
                style="font-size:12px;padding:4px 12px;"
              >{{ isReplying ? "Posting…" : "Reply" }}</button>
            </div>
          </div>

          <!-- Error -->
          <div v-if="lastError" style="
            margin-top:6px;padding:6px 8px;border-radius:6px;font-size:12px;
            background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
            display:flex;justify-content:space-between;align-items:center;
          ">
            <span>⚠️ {{ lastError }}</span>
            <button
              @click="lastError = ''"
              style="background:none;border:none;cursor:pointer;font-size:14px;
                     padding:0;color:#fca5a5;line-height:1;"
            >✕</button>
          </div>

          <!-- Nested children -->
          <thread-component
            v-if="showChildren"
            :author="reply.author"
            :permlink="reply.permlink"
            :depth="depth + 1"
          ></thread-component>

        </div>
      </div>
    </div>
  `
};

// ---- ThreadComponent ----
// Lazy-loads direct replies and renders each as a ReplyCardComponent.
// Used recursively: TwistCardComponent → ThreadComponent → ReplyCardComponent
//                                                        → ThreadComponent → …
const ThreadComponent = {
  name: "ThreadComponent",
  components: { ReplyCardComponent },
  props: {
    author:   { type: String,  required: true },
    permlink: { type: String,  required: true },
    depth:    { type: Number,  default: 0 }
  },
  data() {
    return {
      replies:   [],
      loading:   true,
      loadError: ""
    };
  },
  async created() {
    try {
      const replies = await fetchReplies(this.author, this.permlink);
      // getContentReplies returns empty active_votes (a Steem node quirk that
      // affects both the feed root and individual posts). Enrich active_votes
      // only via a parallel getContent call so the Love count is correct.
      // All other fields (body, children, etc.) are already populated.
      this.replies = await Promise.all(
        replies.map(r =>
          fetchPost(r.author, r.permlink)
            .then(full => ({ ...r, active_votes: full.active_votes || [] }))
            .catch(() => r)
        )
      );
    } catch (e) {
      this.loadError = "Could not load replies.";
    }
    this.loading = false;
  },
  template: `
    <div style="margin-top:8px;border-top:2px solid #2e2050;padding-top:8px;">

      <div v-if="loading" style="color:#5a4e70;font-size:13px;padding:6px 0;">
        Loading replies…
      </div>

      <div v-else-if="loadError" style="color:#fca5a5;font-size:13px;">
        ⚠️ {{ loadError }}
      </div>

      <div v-else-if="replies.length === 0" style="color:#5a4e70;font-size:13px;">
        No replies yet.
      </div>

      <reply-card-component
        v-else
        v-for="reply in replies"
        :key="reply.permlink"
        :reply="reply"
        :depth="depth"
      ></reply-card-component>

    </div>
  `
};

// ---- TwistCardComponent ----
// Renders a single twist.
// Long-body posts (> PREVIEW_LENGTH) or busy threads (children > THREAD_REPLY_THRESHOLD)
// are shown collapsed with a preview and an "Expand thread" button.
// The 💬 reply button independently toggles ThreadComponent for any post that has replies,
// fixing the case where short posts with replies never showed them.
const TwistCardComponent = {
  name: "TwistCardComponent",
  components: { ThreadComponent },
  props: {
    post:        { type: Object,  required: true },
    username:    { type: String,  default: "" },
    hasKeychain: { type: Boolean, default: false },
    pinned:      { type: Boolean, default: false }   // true when this card is the pinned twist
  },
  emits: ["voted", "replied", "pin", "unpin"],
  data() {
    return {
      showReplyBox:    false,
      // Auto-expand replies if the post already has some.
      showReplies:     (this.post.children || 0) > 0,
      replyText:       "",
      isReplying:      false,
      isVoting:        false,
      hasVoted:        false,
      isRetwisting:    false,
      hasRetwisted:    false,
      replyCount:      this.post.children || 0,
      lastError:       "",
      threadExpanded:  false,
      isPinning:       false
    };
  },
  computed: {
    isOwnPost() {
      return !!this.username && this.username === this.post.author;
    },
    avatarUrl() {
      return `https://steemitimages.com/u/${this.post.author}/avatar/small`;
    },
    relativeTime() {
      const diff = Date.now() - steemDate(this.post.created).getTime();
      const s = Math.floor(diff / 1000);
      if (s < 60)  return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60)  return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24)  return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    },
    // Full UTC timestamp shown as tooltip and on the twist page link
    absoluteTime() {
      const d = steemDate(this.post.created);
      if (isNaN(d)) return "";
      return d.toUTCString().replace(" GMT", " UTC");
    },
    // Hash-router link to the dedicated twist page
    twistUrl() {
      return `#/@${this.post.author}/${this.post.permlink}`;
    },
    upvoteCount() {
      const votes = this.post.active_votes || [];
      // active_votes is only populated by getContent (single post fetch).
      // getContentReplies returns it empty, so fall back to net_votes which
      // is always present and equals upvotes minus downvotes.
      const count = votes.length > 0
        ? votes.filter(v => v.percent > 0).length
        : Math.max(0, this.post.net_votes || 0);
      return count + (this.hasVoted ? 1 : 0);
    },
    canAct() {
      return !!this.username && this.hasKeychain;
    },
    isLong() {
      return stripBackLink(this.post.body).length > PREVIEW_LENGTH ||
             (this.post.children || 0) > THREAD_REPLY_THRESHOLD;
    },
    bodyPreview() {
      return stripBackLink(this.post.body).slice(0, PREVIEW_LENGTH) + "…";
    },
    bodyHtml() {
      return renderMarkdown(stripBackLink(this.post.body));
    },
    bodyPreviewHtml() {
      return renderMarkdown(this.bodyPreview);
    },
    showThread() {
      return this.threadExpanded || this.showReplies;
    }
  },
  methods: {
    vote() {
      if (!this.canAct || this.isVoting || this.hasVoted) return;
      this.isVoting = true;
      voteTwist(this.username, this.post.author, this.post.permlink, 10000, (res) => {
        this.isVoting = false;
        if (res.success) {
          this.hasVoted = true;
          this.$emit("voted", this.post);
        } else {
          this.lastError = res.error || res.message || "Twist love failed.";
        }
      });
    },
    retwist() {
      if (!this.canAct || this.isRetwisting || this.hasRetwisted) return;
      // Cannot retwist your own post
      if (this.post.author === this.username) {
        this.lastError = "You cannot retwist your own twist.";
        return;
      }
      this.isRetwisting = true;
      retwistPost(this.username, this.post.author, this.post.permlink, (res) => {
        this.isRetwisting = false;
        if (res.success) {
          this.hasRetwisted = true;
        } else {
          this.lastError = res.error || res.message || "Retwist failed.";
        }
      });
    },
    toggleReplies() {
      // Always toggle the reply list — even if replyCount is 0, the user
      // may want to see "No replies yet" or post the first reply.
      // This also fixes the case where children=0 but replies exist on-chain.
      this.showReplies = !this.showReplies;
      if (this.canAct) {
        this.showReplyBox = !this.showReplyBox;
      }
    },
    pinPost() {
      if (!this.isOwnPost || this.isPinning) return;
      this.isPinning = true;
      pinTwist(this.username, this.post.author, this.post.permlink, (res) => {
        this.isPinning = false;
        if (res.success) this.$emit("pin", this.post);
        else this.lastError = res.error || res.message || "Pin failed.";
      });
    },
    unpinPost() {
      if (!this.isOwnPost || this.isPinning) return;
      this.isPinning = true;
      unpinTwist(this.username, (res) => {
        this.isPinning = false;
        if (res.success) this.$emit("unpin", this.post);
        else this.lastError = res.error || res.message || "Unpin failed.";
      });
    },
    submitReply() {
      const text = this.replyText.trim();
      if (!text || !this.canAct) return;
      this.isReplying = true;
      postTwistReply(this.username, text, this.post.author, this.post.permlink, (res) => {
        this.isReplying = false;
        if (res.success) {
          this.replyText    = "";
          this.showReplies  = true;
          this.replyCount++;
          this.$emit("replied", this.post);
        } else {
          this.lastError = res.error || res.message || "Reply failed.";
        }
      });
    }
  },
  template: `
    <div style="
      background:#1e1535;border:1px solid #2e2050;border-radius:12px;
      padding:14px 16px;margin:10px auto;max-width:600px;text-align:left;
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <a :href="'#/@' + post.author">
          <img
            :src="avatarUrl"
            style="width:40px;height:40px;border-radius:50%;border:2px solid #2e2050;"
            @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
          />
        </a>
        <div>
          <a
            :href="'#/@' + post.author"
            style="font-weight:bold;color:#a855f7;text-decoration:none;font-size:14px;"
          >@{{ post.author }}</a>
          <div style="font-size:12px;color:#5a4e70;">
            <a
              :href="twistUrl"
              :title="absoluteTime"
              style="color:#5a4e70;text-decoration:none;"
            >{{ relativeTime }}</a>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div
        class="twist-body"
        v-html="isLong && !threadExpanded ? bodyPreviewHtml : bodyHtml"
        style="margin-bottom:12px;"
      ></div>

      <!-- Expand / Collapse thread button (long posts only) -->
      <div v-if="isLong" style="margin-bottom:12px;">
        <button
          @click="threadExpanded = !threadExpanded"
          style="
            background:none;border:none;padding:0;
            color:#a855f7;font-size:13px;font-weight:600;
            cursor:pointer;text-decoration:underline;
          "
        >
          {{ threadExpanded ? "▲ Collapse thread" : "▼ Expand thread" }}
        </button>
      </div>

      <!-- Footer actions -->
      <div style="display:flex;align-items:center;gap:12px;font-size:13px;margin-top:12px;flex-wrap:wrap;">

        <!-- Love -->
        <button
          @click="vote"
          :disabled="!canAct || isVoting || hasVoted"
          :style="{
            background: hasVoted ? '#3b0764' : '#1e1535',
            color:      hasVoted ? '#e879f9' : '#9b8db0',
            border:     hasVoted ? '1px solid #a855f7' : '1px solid #2e2050',
            borderRadius:'20px', padding:'4px 12px',
            cursor: (!canAct || hasVoted) ? 'default' : 'pointer',
            fontSize:'13px', margin:0
          }"
        >{{ isVoting ? "…" : (hasVoted ? "❤️" : "🤍") }} {{ upvoteCount }}</button>

        <!-- Retwist -->
        <button
          @click="retwist"
          :disabled="!canAct || isRetwisting || hasRetwisted || post.author === username"
          :style="{
            background: hasRetwisted ? '#0c2d1a' : '#1e1535',
            color:      hasRetwisted ? '#4ade80' : '#9b8db0',
            border:     hasRetwisted ? '1px solid #166534' : '1px solid #2e2050',
            borderRadius:'20px', padding:'4px 12px',
            cursor: (!canAct || hasRetwisted || post.author === username) ? 'default' : 'pointer',
            fontSize:'13px', margin:0
          }"
          :title="post.author === username ? 'Cannot retwist your own twist' : ''"
        >{{ isRetwisting ? "…" : (hasRetwisted ? "🔁 Retwisted" : "🔁") }}</button>

        <!-- Replies -->
        <button
          @click="toggleReplies"
          style="background:#1e1535;color:#9b8db0;border:1px solid #2e2050;
                 border-radius:20px;padding:4px 12px;font-size:13px;margin:0;"
        >💬 {{ replyCount }}</button>

        <!-- Permalink -->
        <a
          :href="twistUrl"
          style="margin-left:auto;font-size:12px;color:#2e2050;text-decoration:none;"
          title="Open twist page"
        >🔗</a>

        <!-- Pin / Unpin — own posts only -->
        <button
          v-if="isOwnPost && hasKeychain"
          @click="pinned ? unpinPost() : pinPost()"
          :disabled="isPinning"
          :style="{
            background: pinned ? '#1a2a0a' : '#1e1535',
            color:      pinned ? '#86efac' : '#9b8db0',
            border:     pinned ? '1px solid #166534' : '1px solid #2e2050',
            borderRadius:'20px', padding:'4px 10px',
            fontSize:'12px', margin:0,
            cursor: isPinning ? 'default' : 'pointer'
          }"
          :title="pinned ? 'Unpin this twist' : 'Pin to top of your profile'"
        >{{ isPinning ? '…' : (pinned ? '📌 Pinned' : '📌') }}</button>

      </div>

      <!-- Inline reply compose box -->
      <div v-if="showReplyBox && canAct" style="margin-top:12px;">
        <textarea
          v-model="replyText"
          placeholder="Write a reply…"
          maxlength="1000"
          style="
            width:100%;box-sizing:border-box;
            padding:8px;border-radius:8px;
            border:1px solid #2e2050;background:#0f0a1e;
            color:#e8e0f0;font-size:14px;resize:vertical;min-height:60px;
          "
        ></textarea>
        <div style="text-align:right;margin-top:4px;">
          <button
            @click="submitReply"
            :disabled="!replyText.trim() || isReplying"
            style="font-size:13px;padding:5px 14px;"
          >{{ isReplying ? "Posting…" : "Reply" }}</button>
        </div>
      </div>

      <!-- Blockchain error -->
      <div v-if="lastError" style="
        margin-top:10px;padding:8px 10px;border-radius:8px;font-size:13px;
        background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
        display:flex;justify-content:space-between;align-items:center;gap:8px;
      ">
        <span>⚠️ {{ lastError }}</span>
        <button
          @click="lastError = ''"
          style="background:none;border:none;cursor:pointer;font-size:15px;
                 padding:0;color:#fca5a5;line-height:1;margin:0;"
        >✕</button>
      </div>

      <!-- Thread replies — below actions so the action bar never moves -->
      <thread-component
        v-if="showThread"
        :author="post.author"
        :permlink="post.permlink"
      ></thread-component>

    </div>
  `
};

// ---- TwistComposerComponent ----
// Text area + character counter + post button for composing new twists.
const TwistComposerComponent = {
  name: "TwistComposerComponent",
  props: {
    username:    { type: String,  default: "" },
    hasKeychain: { type: Boolean, default: false },
    isPosting:   { type: Boolean, default: false }
  },
  emits: ["post"],
  data() {
    return { message: "" };
  },
  computed: {
    charCount()  { return this.message.length; },
    overLimit()  { return this.charCount > 280; },
    canPost()    { return !!this.username && this.hasKeychain && this.charCount > 0 && !this.overLimit && !this.isPosting; }
  },
  methods: {
    submit() {
      if (!this.canPost) return;
      this.$emit("post", this.message.trim());
      this.message = "";
    }
  },
  template: `
    <div style="
      background:#1e1535;border:1px solid #2e2050;border-radius:12px;
      padding:16px;margin:0 auto 20px;max-width:600px;text-align:left;
    ">
      <textarea
        v-model="message"
        placeholder="What's your twist?"
        maxlength="500"
        style="
          width:100%;box-sizing:border-box;
          padding:10px;border-radius:8px;
          border:1px solid #2e2050;background:#0f0a1e;
          color:#e8e0f0;font-size:15px;
          resize:none;height:80px;
        "
        @keydown.ctrl.enter="submit"
      ></textarea>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <span :style="{ fontSize:'13px', color: overLimit ? '#fca5a5' : '#5a4e70' }">
          {{ charCount }} / 280
        </span>
        <button @click="submit" :disabled="!canPost" style="padding:7px 20px;margin:0;">
          {{ isPosting ? "Posting…" : "Twist 🌀" }}
        </button>
      </div>
    </div>
  `
};

// ---- SignalItemComponent ----
// Renders a single signal (notification) row.
// Props:
//   signal  — signal object from fetchSignals
//   read    — boolean, whether this signal has been seen
const SignalItemComponent = {
  name: "SignalItemComponent",
  props: {
    signal: { type: Object, required: true },
    read:   { type: Boolean, default: false }
  },
  computed: {
    icon() {
      return { love: "❤️", reply: "💬", mention: "📣", follow: "👤", retwist: "🔁" }[this.signal.type] || "🔔";
    },
    label() {
      const a = `@${this.signal.actor}`;
      switch (this.signal.type) {
        case "love":    return `${a} gave twist love to your twist`;
        case "reply":   return `${a} replied to your twist`;
        case "mention": return `${a} mentioned you`;
        case "follow":  return `${a} followed you`;
        case "retwist": return `${a} retwisted your twist`;
        default:        return `${a} interacted with you`;
      }
    },
    // Build a link to the relevant twist page for every signal type that
    // has a target post. postAuthor + permlink are now stored on all types.
    viewUrl() {
      if (!this.signal.postAuthor || !this.signal.permlink) return null;
      return `#/@${this.signal.postAuthor}/${this.signal.permlink}`;
    },
    relativeTime() {
      const diff = Date.now() - this.signal.ts.getTime();
      const s = Math.floor(diff / 1000);
      if (s < 60)  return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60)  return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24)  return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    },
    absoluteTime() {
      return this.signal.ts.toUTCString().replace(" GMT", " UTC");
    }
  },
  template: `
    <div :style="{
      display:'flex', alignItems:'flex-start', gap:'12px',
      padding:'12px 14px',
      background: read ? 'var(--card, #1e1535)' : '#1a1040',
      borderBottom:'1px solid #2e2050',
      borderLeft: read ? '3px solid transparent' : '3px solid #a855f7',
      transition:'background 0.2s'
    }">

      <!-- Actor avatar -->
      <a :href="'#/@' + signal.actor" style="flex-shrink:0;">
        <img
          :src="'https://steemitimages.com/u/' + signal.actor + '/avatar/small'"
          style="width:36px;height:36px;border-radius:50%;border:2px solid #2e2050;"
          @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
        />
      </a>

      <!-- Content -->
      <div style="flex:1;min-width:0;">

        <!-- Type icon + label -->
        <div style="font-size:14px;color:#e8e0f0;line-height:1.4;">
          <span style="margin-right:5px;">{{ icon }}</span>
          <a
            :href="'#/@' + signal.actor"
            style="color:#a855f7;font-weight:600;text-decoration:none;"
          >@{{ signal.actor }}</a>
          <span style="color:#9b8db0;">
            {{ label.replace('@' + signal.actor, '').trim() }}
          </span>
        </div>

        <!-- Body preview -->
        <div v-if="signal.body" style="
          margin-top:4px;font-size:13px;color:#9b8db0;
          font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        ">
          "{{ signal.body }}"
        </div>

        <!-- Timestamp + link -->
        <div style="display:flex;align-items:center;gap:10px;margin-top:5px;">
          <span :title="absoluteTime" style="font-size:12px;color:#5a4e70;">
            {{ relativeTime }}
          </span>
          <a
            v-if="viewUrl"
            :href="viewUrl"
            style="font-size:12px;color:#22d3ee;text-decoration:none;"
          >View →</a>
        </div>

      </div>

      <!-- Unread dot -->
      <div v-if="!read" style="
        width:8px;height:8px;border-radius:50%;
        background:#a855f7;flex-shrink:0;margin-top:4px;
      "></div>

    </div>
  `
};
