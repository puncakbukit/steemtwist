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
// Rich profile card: cover, avatar, display name, reputation, bio,
// stats row (followers, following, posts), location, website, join date.
// Receives the enriched profileData object from fetchAccount.
const UserProfileComponent = {
  name: "UserProfileComponent",
  props: {
    profileData: Object,
    // Optional: pass twist count from the parent view
    twistCount:  { type: Number, default: null }
  },
  computed: {
    joinDate() {
      if (!this.profileData?.created) return "";
      const d = new Date(this.profileData.created + "Z");
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    },
    safeWebsite() {
      const url = this.profileData?.website || "";
      try {
        const u = new URL(url.startsWith("http") ? url : "https://" + url);
        return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
      } catch { return ""; }
    },
    websiteLabel() {
      try {
        return new URL(this.safeWebsite).hostname.replace(/^www\./, "");
      } catch { return this.profileData?.website || ""; }
    },
    socialUrl() {
      return `#/@${this.profileData?.username}/social`;
    }
  },
  methods: {
    safeAvatarUrl(username) {
      return `https://steemitimages.com/u/${username}/avatar`;
    },
  },
  template: `
    <div v-if="profileData" style="max-width:600px;margin:0 auto 16px;">

      <!-- Card body — no cover image here (shown globally in header) -->
      <div style="
        background:#1e1535;border:1px solid #2e2050;
        border-radius:12px;padding:16px;
      ">
        <!-- Avatar row -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <img
            :src="safeAvatarUrl(profileData.username)"
            style="width:72px;height:72px;border-radius:50%;border:3px solid #2e2050;background:#0f0a1e;flex-shrink:0;"
            @error="$event.target.src='https://steemitimages.com/u/guest/avatar'"
          />
          <!-- Reputation badge -->
          <div style="
            background:linear-gradient(135deg,#8b2fc9,#e0187a);
            color:#fff;font-size:12px;font-weight:700;
            padding:3px 10px;border-radius:20px;
          " title="Steem reputation score">
            ⭐ {{ profileData.reputation }}
          </div>
        </div>

        <!-- Name + username -->
        <div style="margin-bottom:8px;">
          <div style="font-size:18px;font-weight:700;color:#e8e0f0;">{{ profileData.displayName }}</div>
          <div style="font-size:13px;color:#a855f7;">@{{ profileData.username }}</div>
        </div>

        <!-- Bio -->
        <div v-if="profileData.about" style="
          font-size:14px;color:#c0b0e0;line-height:1.5;margin-bottom:12px;
        ">{{ profileData.about }}</div>

        <!-- Meta row: location, website, joined -->
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:#9b8db0;margin-bottom:14px;">
          <span v-if="profileData.location">
            📍 {{ profileData.location }}
          </span>
          <a
            v-if="safeWebsite"
            :href="safeWebsite"
            target="_blank"
            rel="noopener noreferrer"
            style="color:#22d3ee;text-decoration:none;"
          >🔗 {{ websiteLabel }}</a>
          <span v-if="joinDate">
            📅 Joined {{ joinDate }}
          </span>
        </div>

        <!-- Stats row -->
        <div style="
          display:flex;gap:0;border:1px solid #2e2050;border-radius:10px;
          overflow:hidden;text-align:center;
        ">
          <a
            :href="socialUrl + '?tab=followers'"
            style="flex:1;padding:10px 4px;text-decoration:none;border-right:1px solid #2e2050;
                   transition:background 0.15s;"
            @mouseenter="$event.currentTarget.style.background='#2e2050'"
            @mouseleave="$event.currentTarget.style.background=''"
          >
            <div style="font-size:16px;font-weight:700;color:#e8e0f0;">
              {{ profileData.followerCount !== null ? profileData.followerCount.toLocaleString() : '—' }}
            </div>
            <div style="font-size:11px;color:#9b8db0;margin-top:2px;">Followers</div>
          </a>
          <a
            :href="socialUrl + '?tab=following'"
            style="flex:1;padding:10px 4px;text-decoration:none;border-right:1px solid #2e2050;
                   transition:background 0.15s;"
            @mouseenter="$event.currentTarget.style.background='#2e2050'"
            @mouseleave="$event.currentTarget.style.background=''"
          >
            <div style="font-size:16px;font-weight:700;color:#e8e0f0;">
              {{ profileData.followingCount !== null ? profileData.followingCount.toLocaleString() : '—' }}
            </div>
            <div style="font-size:11px;color:#9b8db0;margin-top:2px;">Following</div>
          </a>
          <div style="flex:1;padding:10px 4px;">
            <div style="font-size:16px;font-weight:700;color:#e8e0f0;">
              {{ profileData.postCount.toLocaleString() }}
            </div>
            <div style="font-size:11px;color:#9b8db0;margin-top:2px;">Posts</div>
          </div>
          <div v-if="twistCount !== null" style="flex:1;padding:10px 4px;border-left:1px solid #2e2050;">
            <div style="font-size:16px;font-weight:700;color:#e8e0f0;">
              {{ twistCount.toLocaleString() }}
            </div>
            <div style="font-size:11px;color:#9b8db0;margin-top:2px;">Twists</div>
          </div>
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
      lastError:     "",
      showEditBox:   false,
      editText:      "",
      isEditing:     false,
      showDeleteConfirm: false,
      isDeleting:    false,
      editedBody:    null
    };
  },
  computed: {
    isOwnReply() {
      return !!this.username && this.username === this.reply.author;
    },
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
    bodyHtml() { return renderMarkdown(stripBackLink(this.editedBody !== null ? this.editedBody : this.reply.body)); },
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
    },

    openEdit() {
      this.editText    = stripBackLink(this.editedBody !== null ? this.editedBody : this.reply.body);
      this.showEditBox = true;
    },
    saveEdit() {
      const text = this.editText.trim();
      if (!text || this.isEditing) return;
      this.isEditing = true;
      editTwist(this.username, this.reply, text, (res) => {
        this.isEditing = false;
        if (res.success) {
          this.editedBody  = text;
          this.showEditBox = false;
        } else {
          this.lastError = res.error || res.message || "Edit failed.";
        }
      });
    },
    confirmDelete() { this.showDeleteConfirm = true; },
    doDelete() {
      if (this.isDeleting) return;
      this.isDeleting = true;
      deleteTwist(this.username, this.reply, (res) => {
        this.isDeleting = false;
        this.showDeleteConfirm = false;
        if (res.success) {
          this.$emit("deleted", this.reply);
        } else {
          this.lastError = res.error || res.message || "Delete failed.";
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

            <!-- Edit / Delete — own replies only -->
            <button
              v-if="isOwnReply && hasKeychain"
              @click="openEdit"
              style="background:none;border:none;padding:0;font-size:12px;
                     color:#5a4e70;cursor:pointer;"
              title="Edit this reply"
            >✏️</button>

            <button
              v-if="isOwnReply && hasKeychain"
              @click="confirmDelete"
              style="background:none;border:none;padding:0;font-size:12px;
                     color:#5a4e70;cursor:pointer;"
              title="Delete this reply"
            >🗑️</button>

          </div>

          <!-- Inline edit box -->
          <div v-if="showEditBox" style="margin-top:8px;">
            <textarea
              v-model="editText"
              style="
                width:100%;box-sizing:border-box;padding:7px;border-radius:8px;
                border:1px solid #2e2050;background:#0f0a1e;color:#e8e0f0;
                font-size:13px;resize:vertical;min-height:52px;
              "
              @keydown.ctrl.enter="saveEdit"
            ></textarea>
            <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:4px;">
              <button
                @click="showEditBox = false"
                style="background:#1e1535;border:1px solid #2e2050;color:#9b8db0;
                       border-radius:20px;padding:2px 10px;font-size:12px;margin:0;"
              >Cancel</button>
              <button
                @click="saveEdit"
                :disabled="!editText.trim() || isEditing"
                style="padding:2px 12px;font-size:12px;margin:0;"
              >{{ isEditing ? "Saving…" : "Save" }}</button>
            </div>
          </div>

          <!-- Delete confirmation -->
          <div v-if="showDeleteConfirm" style="
            margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12px;
            background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
          ">
            <div style="margin-bottom:6px;">Delete this reply?</div>
            <div style="display:flex;gap:6px;">
              <button
                @click="doDelete"
                :disabled="isDeleting"
                style="background:#7f1d1d;border:none;color:#fff;border-radius:20px;
                       padding:2px 12px;font-size:12px;margin:0;"
              >{{ isDeleting ? "…" : "Delete" }}</button>
              <button
                @click="showDeleteConfirm = false"
                style="background:#1e1535;border:1px solid #2e2050;color:#9b8db0;
                       border-radius:20px;padding:2px 10px;font-size:12px;margin:0;"
              >Cancel</button>
            </div>
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
  emits: ["voted", "replied", "pin", "unpin", "deleted"],
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
      isPinning:       false,
      showEditBox:     false,
      editText:        "",
      isEditing:       false,
      showDeleteConfirm: false,
      isDeleting:      false,
      editedBody:      null    // local override after successful edit
    };
  },
  computed: {
    isOwnPost() {
      return !!this.username && this.username === this.post.author;
    },
    isSecretTwist() {
      try { return JSON.parse(this.post.json_metadata || "{}").type === "secret_twist"; }
      catch { return false; }
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
      if (this.isSecretTwist) return "<em style='color:#5a4e70'>🔒 Secret Twist — view in Private Signals</em>";
      return renderMarkdown(stripBackLink(this.editedBody !== null ? this.editedBody : this.post.body));
    },
    bodyPreviewHtml() {
      if (this.isSecretTwist) return "<em style='color:#5a4e70'>🔒 Secret Twist — view in Private Signals</em>";
      return renderMarkdown(stripBackLink(this.editedBody !== null ? this.editedBody : this.post.body).slice(0, PREVIEW_LENGTH) + "…");
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
    },

    openEdit() {
      // Pre-fill with the current body (strip back-link and whitespace)
      this.editText    = stripBackLink(this.editedBody !== null ? this.editedBody : this.post.body);
      this.showEditBox = true;
    },
    saveEdit() {
      const text = this.editText.trim();
      if (!text || this.isEditing) return;
      this.isEditing = true;
      editTwist(this.username, this.post, text, (res) => {
        this.isEditing = false;
        if (res.success) {
          this.editedBody  = text;   // update locally without refetch
          this.showEditBox = false;
        } else {
          this.lastError = res.error || res.message || "Edit failed.";
        }
      });
    },
    confirmDelete() {
      this.showDeleteConfirm = true;
    },
    doDelete() {
      if (this.isDeleting) return;
      this.isDeleting = true;
      deleteTwist(this.username, this.post, (res) => {
        this.isDeleting = false;
        this.showDeleteConfirm = false;
        if (res.success) {
          this.$emit("deleted", this.post);
        } else {
          this.lastError = res.error || res.message || "Delete failed.";
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

        <!-- Edit / Delete — own posts only -->
        <button
          v-if="isOwnPost && hasKeychain"
          @click="openEdit"
          style="background:#1e1535;color:#9b8db0;border:1px solid #2e2050;
                 border-radius:20px;padding:4px 10px;font-size:12px;margin:0;"
          title="Edit this twist"
        >✏️</button>

        <button
          v-if="isOwnPost && hasKeychain"
          @click="confirmDelete"
          style="background:#1e1535;color:#9b8db0;border:1px solid #2e2050;
                 border-radius:20px;padding:4px 10px;font-size:12px;margin:0;"
          title="Delete this twist"
        >🗑️</button>

      </div>

      <!-- Inline edit box -->
      <div v-if="showEditBox" style="margin-top:12px;">
        <textarea
          v-model="editText"
          style="
            width:100%;box-sizing:border-box;padding:8px;border-radius:8px;
            border:1px solid #2e2050;background:#0f0a1e;
            color:#e8e0f0;font-size:14px;resize:vertical;min-height:80px;
          "
          @keydown.ctrl.enter="saveEdit"
        ></textarea>
        <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:4px;">
          <button
            @click="showEditBox = false"
            style="background:#1e1535;border:1px solid #2e2050;color:#9b8db0;
                   border-radius:20px;padding:4px 12px;font-size:12px;margin:0;"
          >Cancel</button>
          <button
            @click="saveEdit"
            :disabled="!editText.trim() || isEditing"
            style="padding:4px 14px;font-size:12px;margin:0;"
          >{{ isEditing ? "Saving…" : "Save" }}</button>
        </div>
      </div>

      <!-- Delete confirmation -->
      <div v-if="showDeleteConfirm" style="
        margin-top:10px;padding:10px 12px;border-radius:8px;font-size:13px;
        background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
      ">
        <div style="margin-bottom:8px;">Delete this twist? This cannot be undone.</div>
        <div style="display:flex;gap:6px;">
          <button
            @click="doDelete"
            :disabled="isDeleting"
            style="background:#7f1d1d;border:none;color:#fff;border-radius:20px;
                   padding:4px 14px;font-size:12px;margin:0;"
          >{{ isDeleting ? "Deleting…" : "Delete" }}</button>
          <button
            @click="showDeleteConfirm = false"
            style="background:#1e1535;border:1px solid #2e2050;color:#9b8db0;
                   border-radius:20px;padding:4px 12px;font-size:12px;margin:0;"
          >Cancel</button>
        </div>
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
      return { love: "❤️", reply: "💬", mention: "📣", follow: "👤", retwist: "🔁", secret_twist: "🔒" }[this.signal.type] || "🔔";
    },
    label() {
      const a = `@${this.signal.actor}`;
      switch (this.signal.type) {
        case "love":    return `${a} gave twist love to your twist`;
        case "reply":   return `${a} replied to your twist`;
        case "mention": return `${a} mentioned you`;
        case "follow":  return `${a} followed you`;
        case "retwist":       return `${a} retwisted your twist`;
        case "secret_twist":  return `${a} sent you a Secret Twist`;
        default:              return `${a} interacted with you`;
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

// ---- UserRowComponent ----
// A compact user row: avatar, display name, @username, bio, optional Follow button.
// Used in Followers, Following, and Friends lists.
const UserRowComponent = {
  name: "UserRowComponent",
  props: {
    username:     { type: String,  required: true },
    profileData:  { type: Object,  default: null },
    // Follow feature — only shown when loggedInUser is set and not viewing own row
    loggedInUser: { type: String,  default: "" },
    hasKeychain:  { type: Boolean, default: false },
    isFollowing:  { type: Boolean, default: false }  // is loggedInUser following this user?
  },
  emits: ["follow", "unfollow"],
  data() {
    return {
      followState:  this.isFollowing,   // local optimistic state
      isBusy:       false
    };
  },
  watch: {
    isFollowing(v) { this.followState = v; }
  },
  computed: {
    displayName() { return this.profileData?.displayName || this.username; },
    about()       { return this.profileData?.about || ""; },
    profileUrl()  { return `#/@${this.username}`; },
    showFollowBtn() {
      // Show only when logged in, has Keychain, and not viewing your own row
      return !!this.loggedInUser && this.hasKeychain &&
             this.loggedInUser !== this.username;
    }
  },
  methods: {
    toggleFollow(e) {
      e.preventDefault();   // don't navigate via the parent <a>
      e.stopPropagation();
      if (this.isBusy) return;
      this.isBusy = true;
      const action = this.followState ? unfollowUser : followUser;
      action(this.loggedInUser, this.username, (res) => {
        this.isBusy = false;
        if (res.success) {
          this.followState = !this.followState;
          this.$emit(this.followState ? "follow" : "unfollow", this.username);
        }
      });
    }
  },
  template: `
    <a
      :href="profileUrl"
      style="
        display:flex;align-items:center;gap:12px;
        padding:10px 14px;
        text-decoration:none;
        border-bottom:1px solid #2e2050;
        transition:background 0.15s;
      "
      @mouseenter="$event.currentTarget.style.background='#16102a'"
      @mouseleave="$event.currentTarget.style.background=''"
    >
      <!-- Avatar -->
      <img
        :src="'https://steemitimages.com/u/' + username + '/avatar/small'"
        style="width:40px;height:40px;border-radius:50%;border:2px solid #2e2050;flex-shrink:0;"
        @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
      />

      <!-- Name + username + bio -->
      <div style="min-width:0;flex:1;">
        <div style="font-weight:600;color:#e8e0f0;font-size:14px;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          {{ displayName }}
        </div>
        <div style="font-size:12px;color:#a855f7;">@{{ username }}</div>
        <div v-if="about" style="
          font-size:12px;color:#9b8db0;margin-top:2px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        ">{{ about }}</div>
      </div>

      <!-- Follow / Unfollow button -->
      <button
        v-if="showFollowBtn"
        @click="toggleFollow"
        :disabled="isBusy"
        :style="{
          flexShrink: 0,
          borderRadius: '20px', padding: '4px 12px', fontSize: '12px',
          fontWeight: '600', border: '1px solid', margin: 0,
          background:  followState ? '#0c2d1a' : 'linear-gradient(135deg,#8b2fc9,#e0187a)',
          color:       followState ? '#4ade80' : '#fff',
          borderColor: followState ? '#166534' : 'transparent',
          cursor:      isBusy ? 'default' : 'pointer'
        }"
      >{{ isBusy ? '…' : (followState ? 'Following' : 'Follow') }}</button>

      <!-- Arrow (when no follow button) -->
      <span v-else style="color:#2e2050;font-size:16px;flex-shrink:0;">›</span>
    </a>
  `
};

// ---- SecretTwistComposerComponent ----
// Composer for sending a Secret Twist to a specific recipient.
// Supports markdown with a Write / Preview tab toggle.
const SecretTwistComposerComponent = {
  name: "SecretTwistComposerComponent",
  props: {
    username:    { type: String,  default: "" },
    hasKeychain: { type: Boolean, default: false },
    isSending:   { type: Boolean, default: false },
    toUsername:  { type: String,  default: "" }
  },
  emits: ["send"],
  data() {
    return {
      recipient:   this.toUsername,
      message:     "",
      previewMode: false
    };
  },
  computed: {
    charCount()   { return this.message.length; },
    previewHtml() { return renderMarkdown(this.message); },
    canSend() {
      return !!this.username && this.hasKeychain &&
             !!this.recipient.trim() &&
             this.recipient.trim().replace(/^@/, "") !== this.username &&
             this.charCount > 0 && !this.isSending;
    }
  },
  methods: {
    submit() {
      if (!this.canSend) return;
      this.$emit("send", {
        recipient: this.recipient.trim().replace(/^@/, ""),
        message:   this.message.trim()
      });
      this.message     = "";
      this.previewMode = false;
    }
  },
  template: `
    <div style="
      background:#1a1030;border:1px solid #3b1f5e;border-radius:12px;
      padding:16px;margin:0 auto 20px;max-width:600px;text-align:left;
    ">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:16px;">🔒</span>
        <span style="color:#c084fc;font-weight:600;font-size:14px;">New Secret Twist</span>
      </div>

      <!-- Recipient field -->
      <div style="margin-bottom:10px;">
        <label style="font-size:12px;color:#9b8db0;display:block;margin-bottom:4px;">To</label>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="color:#a855f7;font-size:15px;">@</span>
          <input
            v-model="recipient"
            type="text"
            placeholder="username"
            autocomplete="off"
            style="
              flex:1;padding:7px 10px;border-radius:8px;
              border:1px solid #3b1f5e;background:#0f0a1e;
              color:#e8e0f0;font-size:14px;
            "
            @keydown.enter="submit"
          />
        </div>
        <div v-if="recipient && recipient.trim() === username"
             style="font-size:12px;color:#fca5a5;margin-top:4px;">
          You cannot send a Secret Twist to yourself.
        </div>
      </div>

      <!-- Write / Preview tabs -->
      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <button
          @click="previewMode = false"
          :style="{
            background: !previewMode ? '#3b1f5e' : 'none',
            color:      !previewMode ? '#e8e0f0' : '#9b8db0',
            border: '1px solid #3b1f5e', borderRadius:'6px 6px 0 0',
            padding:'3px 12px', fontSize:'12px', margin:0, cursor:'pointer'
          }"
        >Write</button>
        <button
          @click="previewMode = true"
          :style="{
            background: previewMode ? '#3b1f5e' : 'none',
            color:      previewMode ? '#e8e0f0' : '#9b8db0',
            border: '1px solid #3b1f5e', borderRadius:'6px 6px 0 0',
            padding:'3px 12px', fontSize:'12px', margin:0, cursor:'pointer'
          }"
        >Preview</button>
      </div>

      <!-- Write mode -->
      <textarea
        v-show="!previewMode"
        v-model="message"
        placeholder="Write your secret message… (markdown supported)"
        style="
          width:100%;box-sizing:border-box;
          padding:10px;border-radius:0 8px 8px 8px;
          border:1px solid #3b1f5e;background:#0f0a1e;
          color:#e8e0f0;font-size:15px;
          resize:vertical;min-height:80px;
        "
        @keydown.ctrl.enter="submit"
      ></textarea>

      <!-- Preview mode -->
      <div
        v-show="previewMode"
        class="twist-body"
        v-html="previewHtml || '<span style=\'color:#5a4e70;font-style:italic;\'>Nothing to preview.</span>'"
        style="
          min-height:80px;padding:10px;border-radius:0 8px 8px 8px;
          border:1px solid #3b1f5e;background:#0f0a1e;
          font-size:15px;color:#e8e0f0;line-height:1.6;word-break:break-word;
        "
      ></div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <span style="font-size:13px;color:#5a4e70;">{{ charCount }} chars</span>
        <button
          @click="submit"
          :disabled="!canSend"
          style="padding:7px 20px;margin:0;background:linear-gradient(135deg,#6d28d9,#a21caf);"
        >{{ isSending ? "Sending…" : "Send 🔒" }}</button>
      </div>
    </div>
  `
};

// ---- SecretTwistCardComponent ----
// Renders a single Secret Twist. Shows a locked state to everyone except
// the sender and recipient, who see a Decrypt button. On successful
// decryption the plaintext is shown in place of the locked view.
const SecretTwistCardComponent = {
  name: "SecretTwistCardComponent",
  // Recursive: Vue resolves "secret-twist-card-component" from the global registry
  // by matching this component's name, enabling nested reply rendering.
  props: {
    post:        { type: Object,  required: true },
    username:    { type: String,  default: "" },
    hasKeychain: { type: Boolean, default: false },
    depth:       { type: Number,  default: 0 }    // nesting depth for replies
  },
  data() {
    return {
      decrypted:      null,    // plaintext after successful decrypt
      isDecrypting:   false,
      decryptError:   "",
      showReplyBox:    false,
      replyMessage:    "",
      replyPreviewMode: false,
      isReplying:      false,
      replyError:      "",
      replies:        [],      // decrypted nested replies
      loadingReplies: false,
      repliesLoaded:  false
    };
  },
  computed: {
    meta() {
      try {
        const raw = this.post.json_metadata;
        if (!raw) return {};
        return typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch { return {}; }
    },
    recipient()    { return this.meta.to || ""; },
    payload()      { return this.meta.payload || ""; },
    isSender()     { return this.username === this.post.author; },
    isRecipient()  { return this.username === this.recipient; },
    isParticipant(){ return this.isSender || this.isRecipient; },
    canDecrypt()   { return this.isParticipant && this.hasKeychain && !!this.payload; },
    // Can reply only if: participant, has Keychain, and did NOT author this post
    // (prevents replying to your own message in the thread)
    canReply()     { return this.isParticipant && this.hasKeychain && !this.isSender; },
    // The other party in the conversation — used for reply encryption
    otherParty()   { return this.isSender ? this.recipient : this.post.author; },
    avatarUrl()    { return `https://steemitimages.com/u/${this.post.author}/avatar/small`; },
    replyCount()      { return this.post.children || 0; },
    replyPreviewHtml() { return renderMarkdown(this.replyMessage); },
    decryptedHtml() {
      if (this.decrypted === null) return "";
      return renderMarkdown(this.decrypted);
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
    }
  },
  methods: {
    decrypt() {
      if (!this.canDecrypt || this.isDecrypting) return;
      this.isDecrypting = true;
      this.decryptError = "";
      decryptSecretTwist(this.username, this.otherParty, this.payload, (res) => {
        this.isDecrypting = false;
        if (res.success) {
          this.decrypted = (res.result || "").replace(/^#/, "");
          // Auto-load replies after decrypt if any exist
          if (this.replyCount > 0 && !this.repliesLoaded) this.loadReplies();
        } else {
          this.decryptError = res.error || res.message || "Decryption failed.";
        }
      });
    },

    // Load nested replies — returned as raw post objects so they can be
    // rendered recursively by SecretTwistCardComponent instances.
    async loadReplies() {
      if (this.loadingReplies || this.repliesLoaded) return;
      this.loadingReplies = true;
      try {
        const raw = await fetchReplies(this.post.author, this.post.permlink);
        // Keep only genuine secret_twist replies
        this.replies = raw.filter(r => {
          try {
            const m = r.json_metadata;
            const meta = m ? (typeof m === "string" ? JSON.parse(m) : m) : {};
            return meta.type === "secret_twist";
          } catch { return false; }
        });
        this.repliesLoaded = true;
      } catch {}
      this.loadingReplies = false;
    },

    sendReply() {
      const text = this.replyMessage.trim();
      if (!text || !this.isParticipant || !this.hasKeychain || this.isReplying) return;
      this.isReplying  = true;
      this.replyError  = "";
      replySecretTwist(
        this.username, this.otherParty, text,
        this.post.author, this.post.permlink,
        (res) => {
          this.isReplying = false;
          if (res.success) {
            this.replyMessage     = "";
            this.showReplyBox     = false;
            this.replyPreviewMode = false;
            // Reload replies after a short delay for indexing
            setTimeout(() => {
              this.repliesLoaded = false;
              this.loadReplies();
            }, 3000);
          } else {
            this.replyError = res.error || res.message || "Reply failed.";
          }
        }
      );
    }
  },
  template: `
    <div style="
      background:#1a1030;border:1px solid #3b1f5e;border-radius:12px;
      padding:14px 16px;margin:10px auto;max-width:600px;text-align:left;
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <a :href="'#/@' + post.author">
          <img
            :src="avatarUrl"
            style="width:40px;height:40px;border-radius:50%;border:2px solid #3b1f5e;"
            @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
          />
        </a>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <a :href="'#/@' + post.author"
               style="font-weight:bold;color:#c084fc;text-decoration:none;font-size:14px;">
              @{{ post.author }}
            </a>
            <span style="font-size:13px;color:#9b8db0;">→</span>
            <a :href="'#/@' + recipient"
               style="font-weight:bold;color:#c084fc;text-decoration:none;font-size:14px;">
              @{{ recipient }}
            </a>
          </div>
          <div style="font-size:12px;color:#5a4e70;margin-top:2px;">{{ relativeTime }}</div>
        </div>
        <span style="font-size:20px;">🔒</span>
      </div>

      <!-- Body: decrypted or locked -->
      <div v-if="decrypted !== null"
        class="twist-body"
        v-html="decryptedHtml"
        style="
          background:#0f0a1e;border-radius:8px;padding:12px;
          font-size:15px;color:#e8e0f0;line-height:1.6;
          border:1px solid #3b1f5e;margin-bottom:10px;
          word-break:break-word;
        "
      ></div>

      <div v-else style="
        display:flex;align-items:center;gap:10px;
        background:#0f0a1e;border-radius:8px;padding:12px;
        border:1px solid #3b1f5e;margin-bottom:10px;
      ">
        <span style="font-size:22px;">🔒</span>
        <span v-if="canDecrypt" style="font-size:14px;color:#9b8db0;">
          {{ isSender ? 'You sent this Secret Twist.' : 'You received a Secret Twist.' }}
        </span>
        <span v-else style="font-size:14px;color:#5a4e70;font-style:italic;">
          Secret Twist — only visible to sender and recipient.
        </span>
      </div>

      <!-- Action bar — Decrypt + Reply (shown once decrypted) -->
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <!-- Decrypt button -->
        <button
          v-if="canDecrypt && decrypted === null"
          @click="decrypt"
          :disabled="isDecrypting"
          style="background:linear-gradient(135deg,#6d28d9,#a21caf);padding:6px 16px;font-size:13px;margin:0;"
        >{{ isDecrypting ? "Decrypting…" : "🔓 Decrypt" }}</button>

        <!-- Reply button — only after decrypt, only to non-authors -->
        <button
          v-if="decrypted !== null && canReply"
          @click="showReplyBox = !showReplyBox"
          style="background:#1a1030;border:1px solid #3b1f5e;color:#c084fc;
                 border-radius:20px;padding:4px 12px;font-size:12px;margin:0;"
        >💬 {{ replyCount > 0 ? replyCount + ' repl' + (replyCount === 1 ? 'y' : 'ies') : 'Reply' }}</button>
      </div>

      <!-- Decrypt error -->
      <div v-if="decryptError" style="
        padding:8px 10px;border-radius:8px;font-size:13px;margin-bottom:8px;
        background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
        display:flex;justify-content:space-between;align-items:center;
      ">
        <span>⚠️ {{ decryptError }}</span>
        <button @click="decryptError = ''"
          style="background:none;border:none;cursor:pointer;font-size:15px;padding:0;color:#fca5a5;line-height:1;margin:0;">✕</button>
      </div>

      <!-- Inline reply composer with Write / Preview -->
      <div v-if="showReplyBox && canReply" style="margin-bottom:10px;">
        <div style="display:flex;gap:4px;margin-bottom:4px;">
          <button
            @click="replyPreviewMode = false"
            :style="{
              background: !replyPreviewMode ? '#3b1f5e' : 'none',
              color:      !replyPreviewMode ? '#e8e0f0' : '#9b8db0',
              border:'1px solid #3b1f5e', borderRadius:'6px 6px 0 0',
              padding:'2px 10px', fontSize:'11px', margin:0, cursor:'pointer'
            }"
          >Write</button>
          <button
            @click="replyPreviewMode = true"
            :style="{
              background: replyPreviewMode ? '#3b1f5e' : 'none',
              color:      replyPreviewMode ? '#e8e0f0' : '#9b8db0',
              border:'1px solid #3b1f5e', borderRadius:'6px 6px 0 0',
              padding:'2px 10px', fontSize:'11px', margin:0, cursor:'pointer'
            }"
          >Preview</button>
        </div>

        <textarea
          v-show="!replyPreviewMode"
          v-model="replyMessage"
          placeholder="Write an encrypted reply… (markdown supported)"
          style="
            width:100%;box-sizing:border-box;padding:8px;
            border-radius:0 8px 8px 8px;
            border:1px solid #3b1f5e;background:#0f0a1e;
            color:#e8e0f0;font-size:14px;resize:vertical;min-height:60px;
          "
          @keydown.ctrl.enter="sendReply"
        ></textarea>

        <div
          v-show="replyPreviewMode"
          class="twist-body"
          v-html="replyPreviewHtml || '<span style=\'color:#5a4e70;font-style:italic;\'>Nothing to preview.</span>'"
          style="
            min-height:60px;padding:8px;border-radius:0 8px 8px 8px;
            border:1px solid #3b1f5e;background:#0f0a1e;
            font-size:14px;color:#e8e0f0;line-height:1.6;word-break:break-word;
          "
        ></div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <span style="font-size:12px;color:#5a4e70;">{{ replyMessage.length }} chars</span>
          <button
            @click="sendReply"
            :disabled="!replyMessage.trim() || isReplying"
            style="background:linear-gradient(135deg,#6d28d9,#a21caf);padding:5px 14px;font-size:12px;margin:0;"
          >{{ isReplying ? "Sending…" : "Send 🔒" }}</button>
        </div>
        <div v-if="replyError" style="
          margin-top:6px;padding:6px 8px;border-radius:6px;font-size:12px;
          background:#2d0a0a;border:1px solid #7f1d1d;color:#fca5a5;
        ">⚠️ {{ replyError }}</div>
      </div>

      <!-- Nested encrypted replies — recursive SecretTwistCardComponent -->
      <div v-if="decrypted !== null && replies.length > 0" style="
        margin-top:8px;border-top:1px solid #2e1060;padding-top:8px;padding-left:12px;
      ">
        <secret-twist-card-component
          v-for="r in replies"
          :key="r.permlink"
          :post="r"
          :username="username"
          :has-keychain="hasKeychain"
          :depth="depth + 1"
          style="margin:0 0 8px 0;"
        ></secret-twist-card-component>
      </div>

      <!-- Loading replies indicator -->
      <div v-if="loadingReplies" style="font-size:12px;color:#5a4e70;padding:6px 0;">
        Loading replies…
      </div>
    </div>
  `
};
