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
        return { ...base, background: "#e8f5e9", border: "1px solid #a5d6a7", color: "#1b5e20" };
      if (this.type === "info")
        return { ...base, background: "#e3f2fd", border: "1px solid #90caf9", color: "#0d47a1" };
      return   { ...base, background: "#ffebee", border: "1px solid #ef9a9a", color: "#b71c1c" };
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
          style="padding:7px 10px;border-radius:6px;border:1px solid #ccc;font-size:14px;width:180px;"
          @keydown="onKeydown"
        />
        <button @click="submit" :disabled="!usernameInput.trim() || isLoggingIn">Sign in</button>
        <button @click="$emit('close')" style="background:#888;">Cancel</button>
        <div v-if="loginError" style="width:100%;color:#c62828;font-size:13px;margin-top:4px;">
          {{ loginError }}
        </div>
      </template>
      <template v-else>
        <span style="font-size:14px;">Logged in as <strong>@{{ username }}</strong></span>
        <button @click="$emit('logout')" style="background:#888;">Logout</button>
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
      <!-- Cover image -->
      <div :style="{
        backgroundImage: 'url(' + safeUrl(profileData.coverImage) + ')',
        backgroundSize: 'cover', backgroundPosition: 'center',
        height: '150px', borderRadius: '8px'
      }"></div>
      <!-- Avatar + info -->
      <div style="display:flex;align-items:center;margin-top:-40px;padding:10px;">
        <img
          :src="safeUrl(profileData.profileImage) || 'https://via.placeholder.com/80'"
          style="width:80px;height:80px;border-radius:50%;border:3px solid white;background:white;"
        />
        <div style="margin-left:15px;">
          <h2 style="margin:0;">{{ profileData.displayName }}</h2>
          <small style="color:#555;">@{{ profileData.username }}</small>
          <p style="margin:5px 0;">{{ profileData.about }}</p>
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
    <div style="text-align:center;padding:30px;color:#888;">
      <div style="
        display:inline-block;width:32px;height:32px;
        border:4px solid #ccc;border-top-color:#2e7d32;
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
      showChildren:  false,
      replyText:     "",
      isReplying:    false,
      isVoting:      false,
      hasVoted:      false,
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
    bodyHtml() { return renderMarkdown(this.reply.body); },
    canAct()   { return !!this.username && this.hasKeychain; },
    indent()   { return Math.min(this.depth, 4) * 16; },
    // Count only upvotes (percent > 0), ignore downvotes
    upvoteCount() {
      const votes = this.reply.active_votes || [];
      return votes.filter(v => v.percent > 0).length + (this.hasVoted ? 1 : 0);
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
      <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #f0f0f0;">

        <!-- Avatar -->
        <a :href="'/#/@' + reply.author" style="flex-shrink:0;">
          <img
            :src="avatarUrl"
            style="width:28px;height:28px;border-radius:50%;border:2px solid #e0e0e0;"
            @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
          />
        </a>

        <!-- Content -->
        <div style="flex:1;min-width:0;">

          <!-- Header -->
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
            <a
              :href="'/#/@' + reply.author"
              style="font-weight:bold;color:#1b5e20;text-decoration:none;font-size:13px;"
            >@{{ reply.author }}</a>
            <span style="font-size:11px;color:#bbb;">{{ relativeTime }}</span>
          </div>

          <!-- Body -->
          <div class="twist-body" style="font-size:14px;" v-html="bodyHtml"></div>

          <!-- Actions: love + reply -->
          <div style="display:flex;align-items:center;gap:12px;margin-top:6px;">

            <!-- Love button -->
            <button
              @click="vote"
              :disabled="!canAct || isVoting || hasVoted"
              :style="{
                background: hasVoted ? '#a5d6a7' : '#e8f5e9',
                color: hasVoted ? '#1b5e20' : '#2e7d32',
                border: '1px solid #a5d6a7',
                borderRadius: '20px', padding: '2px 10px',
                cursor: (!canAct || hasVoted) ? 'default' : 'pointer',
                fontSize: '12px'
              }"
            >{{ isVoting ? "…" : (hasVoted ? "❤️" : "🤍") }} {{ upvoteCount }}</button>

            <!-- Reply button -->
            <button
              @click="toggleReplies"
              style="
                background:none;border:none;padding:0;margin:0;
                color:#2e7d32;font-size:12px;cursor:pointer;
                text-decoration:underline;font-weight:600;
              "
            >
              💬 {{ replyCount > 0 ? replyCount + ' repl' + (replyCount === 1 ? 'y' : 'ies') : 'Reply' }}
            </button>

          </div>

          <!-- Compose box -->
          <div v-if="showReplyBox && canAct" style="margin-top:8px;">
            <textarea
              v-model="replyText"
              placeholder="Write a reply…"
              maxlength="1000"
              style="
                width:100%;box-sizing:border-box;
                padding:7px;border-radius:6px;border:1px solid #ccc;
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
            background:#ffebee;border:1px solid #ef9a9a;color:#b71c1c;
            display:flex;justify-content:space-between;align-items:center;
          ">
            <span>⚠️ {{ lastError }}</span>
            <button
              @click="lastError = ''"
              style="background:none;border:none;cursor:pointer;font-size:14px;
                     padding:0;color:#b71c1c;line-height:1;"
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
      this.replies = await fetchReplies(this.author, this.permlink);
    } catch (e) {
      this.loadError = "Could not load replies.";
    }
    this.loading = false;
  },
  template: `
    <div style="margin-top:8px;border-top:2px solid #e8f5e9;padding-top:8px;">

      <div v-if="loading" style="color:#aaa;font-size:13px;padding:6px 0;">
        Loading replies…
      </div>

      <div v-else-if="loadError" style="color:#b71c1c;font-size:13px;">
        ⚠️ {{ loadError }}
      </div>

      <div v-else-if="replies.length === 0" style="color:#aaa;font-size:13px;">
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
    hasKeychain: { type: Boolean, default: false }
  },
  emits: ["voted", "replied"],
  data() {
    return {
      showReplyBox:    false,
      showReplies:     false,   // FIX 2: independent toggle for reply list
      replyText:       "",
      isReplying:      false,
      isVoting:        false,
      hasVoted:        false,
      replyCount:      this.post.children || 0,
      lastError:       "",
      threadExpanded:  false
    };
  },
  computed: {
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
    // FIX 1: count only upvotes (percent > 0), ignore downvotes
    upvoteCount() {
      const votes = this.post.active_votes || [];
      const ups = votes.filter(v => v.percent > 0).length;
      return ups + (this.hasVoted ? 1 : 0);
    },
    canAct() {
      return !!this.username && this.hasKeychain;
    },
    // True when body exceeds limit OR thread is busy — triggers collapse UI.
    isLong() {
      return this.post.body.length > PREVIEW_LENGTH ||
             (this.post.children || 0) > THREAD_REPLY_THRESHOLD;
    },
    // Plain-text 280-char preview for the collapsed state.
    bodyPreview() {
      return this.post.body.slice(0, PREVIEW_LENGTH) + "…";
    },
    // FIX 3: rendered markdown for the full body
    bodyHtml() {
      return renderMarkdown(this.post.body);
    },
    // FIX 3: rendered markdown for the preview (strip HTML tags for plain preview)
    bodyPreviewHtml() {
      return renderMarkdown(this.bodyPreview);
    },
    // FIX 2: thread should be visible if expanded (long posts) OR replies toggled
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
    // FIX 2: toggle reply list AND reply compose box together
    toggleReplies() {
      if (this.replyCount > 0) {
        this.showReplies = !this.showReplies;
      }
      if (this.canAct) {
        this.showReplyBox = !this.showReplyBox;
      }
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
      background:#fff;border:1px solid #e0e0e0;border-radius:10px;
      padding:14px 16px;margin:10px auto;max-width:600px;text-align:left;
    ">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <a :href="'/#/@' + post.author">
          <img
            :src="avatarUrl"
            style="width:40px;height:40px;border-radius:50%;border:2px solid #e0e0e0;"
            @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
          />
        </a>
        <div>
          <a
            :href="'/#/@' + post.author"
            style="font-weight:bold;color:#1b5e20;text-decoration:none;font-size:14px;"
          >@{{ post.author }}</a>
          <div style="font-size:12px;color:#999;">{{ relativeTime }}</div>
        </div>
      </div>

      <!-- FIX 3: body rendered as markdown via v-html -->
      <!-- Collapsed: preview markdown. Expanded / short: full markdown. -->
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
            color:#2e7d32;font-size:13px;font-weight:600;
            cursor:pointer;text-decoration:underline;
          "
        >
          {{ threadExpanded ? "▲ Collapse thread" : "▼ Expand thread" }}
        </button>
      </div>

      <!-- FIX 2: ThreadComponent shown when expanded OR when reply list is toggled -->
      <thread-component
        v-if="showThread"
        :author="post.author"
        :permlink="post.permlink"
      ></thread-component>

      <!-- Footer actions -->
      <div style="display:flex;align-items:center;gap:16px;font-size:13px;color:#666;margin-top:12px;">

        <!-- FIX 1: upvoteCount ignores downvotes -->
        <button
          @click="vote"
          :disabled="!canAct || isVoting || hasVoted"
          :style="{
            background: hasVoted ? '#a5d6a7' : '#e8f5e9',
            color: hasVoted ? '#1b5e20' : '#2e7d32',
            border: '1px solid #a5d6a7',
            borderRadius: '20px', padding: '4px 12px',
            cursor: (!canAct || hasVoted) ? 'default' : 'pointer',
            fontSize: '13px'
          }"
        >
          {{ isVoting ? "…" : (hasVoted ? "❤️" : "🤍") }} {{ upvoteCount }}
        </button>

        <!-- FIX 2: clicking 💬 now both shows replies and opens compose box -->
        <button
          @click="toggleReplies"
          style="background:#f5f5f5;color:#555;border:1px solid #ddd;
                 border-radius:20px;padding:4px 12px;font-size:13px;"
        >
          💬 {{ replyCount }}
        </button>

      </div>

      <!-- Inline reply compose box -->
      <div v-if="showReplyBox && canAct" style="margin-top:12px;">
        <textarea
          v-model="replyText"
          placeholder="Write a reply to this twist…"
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
        margin-top:10px;padding:8px 10px;border-radius:6px;font-size:13px;
        background:#ffebee;border:1px solid #ef9a9a;color:#b71c1c;
        display:flex;justify-content:space-between;align-items:center;gap:8px;
      ">
        <span>⚠️ {{ lastError }}</span>
        <button
          @click="lastError = ''"
          style="background:none;border:none;cursor:pointer;font-size:15px;
                 padding:0;color:#b71c1c;line-height:1;"
        >✕</button>
      </div>
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
      background:#fff;border:1px solid #e0e0e0;border-radius:10px;
      padding:16px;margin:0 auto 20px;max-width:600px;text-align:left;
    ">
      <textarea
        v-model="message"
        placeholder="What's your twist?"
        maxlength="500"
        style="
          width:100%;box-sizing:border-box;
          padding:10px;border-radius:6px;
          border:1px solid #ccc;font-size:15px;
          resize:none;height:80px;
        "
        @keydown.ctrl.enter="submit"
      ></textarea>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <span :style="{ fontSize:'13px', color: overLimit ? '#c62828' : '#999' }">
          {{ charCount }} / 280
        </span>
        <button @click="submit" :disabled="!canPost" style="padding:7px 20px;">
          {{ isPosting ? "Posting…" : "Twist 🌀" }}
        </button>
      </div>
    </div>
  `
};
