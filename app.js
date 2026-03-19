// ============================================================
// app.js — SteemTwist
// Vue 3 + Vue Router 4 application entry point.
// ============================================================

const { createApp, ref, computed, onMounted, provide, inject, watch } = Vue;
const { createRouter, createWebHashHistory, useRoute }                = VueRouter;

// ============================================================
// ROUTE VIEWS
// ============================================================

// ---- HomeView ----
// Main timeline: composer + live feed of this month's twists.
// Supports three sort modes (New / Hot / Top) computed client-side from
// blockchain vote data. Firehose mode streams new twists and live votes,
// triggering instant re-ranking without any server round-trips.
const HomeView = {
  name: "HomeView",
  inject: ["username", "hasKeychain", "notify"],
  components: { TwistComposerComponent, TwistCardComponent, LoadingSpinnerComponent },

  data() {
    return {
      twists:         [],
      loading:        true,
      isPosting:      false,
      monthlyRoot:    getMonthlyRoot(),
      sortMode:       "new",        // "new" | "hot" | "top"
      firehoseOn:     false,
      firehoseStream: null,
      firehoseError:  ""
    };
  },

  computed: {
    // Apply the selected ranking formula to the raw twists array.
    // Entirely reactive — switching sortMode re-sorts instantly with no fetch.
    sortedTwists() {
      return sortTwists(this.twists, this.sortMode);
    }
  },

  async created() {
    await this.loadFeed();
  },

  unmounted() {
    this.stopFirehose();
  },

  methods: {
    async loadFeed() {
      this.loading = true;
      try {
        const fresh = await fetchTwistFeed(this.monthlyRoot);
        const serverPermalinks = new Set(fresh.map(p => p.permlink));
        const liveOnly = this.twists.filter(
          p => p._firehose && !serverPermalinks.has(p.permlink)
        );
        // Store unsorted — sortedTwists computed handles ordering.
        this.twists = [...liveOnly, ...fresh];
      } catch (e) {
        this.notify("Could not load twists. Please try again.", "error");
      }
      this.loading = false;
    },

    async handlePost(message) {
      if (!message) return;
      this.isPosting = true;
      postTwist(this.username, message, async (res) => {
        this.isPosting = false;
        if (res.success) {
          this.notify("Twist posted! 🌀", "success");
          await new Promise(r => setTimeout(r, 2000));
          await this.loadFeed();
        } else {
          this.notify(res.error || res.message || "Failed to post twist.", "error");
        }
      });
    },

    toggleFirehose() {
      this.firehoseOn ? this.stopFirehose() : this.startFirehose();
    },

    startFirehose() {
      this.firehoseError = "";
      this.firehoseOn    = true;

      this.firehoseStream = startFirehose(
        this.monthlyRoot,

        // onTwist — new post or enrichment update
        (post, isUpdate) => {
          if (isUpdate) {
            const idx = this.twists.findIndex(p => p.permlink === post.permlink);
            if (idx !== -1) this.twists.splice(idx, 1, post);
            return;
          }
          if (this.twists.some(p => p.permlink === post.permlink)) return;
          this.twists.push(post);   // push, not unshift — sortedTwists handles order
          setTimeout(() => {
            const p = this.twists.find(t => t.permlink === post.permlink);
            if (p) p._firehose = false;
          }, 2600);
        },

        // onVote — update active_votes in-place so sortedTwists re-ranks live
        (author, permlink, voter, weight) => {
          const post = this.twists.find(
            p => p.author === author && p.permlink === permlink
          );
          if (!post) return;
          const votes = post.active_votes || [];
          const existing = votes.findIndex(v => v.voter === voter);
          if (existing !== -1) {
            votes.splice(existing, 1, { voter, percent: weight });
          } else {
            votes.push({ voter, percent: weight });
          }
          // Trigger Vue reactivity on the array property
          post.active_votes = [...votes];
        }
      );
    },

    stopFirehose() {
      if (this.firehoseStream) {
        this.firehoseStream.stop();
        this.firehoseStream = null;
      }
      this.firehoseOn = false;
    }
  },

  template: `
    <div style="margin-top:20px;">

      <!-- Top bar -->
      <div style="
        display:flex;align-items:center;flex-wrap:wrap;gap:8px;
        font-size:13px;color:#5a4e70;margin-bottom:14px;
      ">
        <span>📅 <strong>{{ monthlyRoot }}</strong></span>

        <button
          @click="loadFeed"
          style="background:#1e1535;color:#a855f7;border:1px solid #2e2050;
                 border-radius:12px;padding:2px 10px;font-size:12px;"
        >⟳ Refresh</button>

        <!-- Firehose toggle -->
        <button
          @click="toggleFirehose"
          :style="{
            borderRadius:'12px', padding:'2px 12px', fontSize:'12px',
            fontWeight:'600', border:'1px solid',
            background:  firehoseOn ? '#2d1a00' : '#1e1535',
            color:       firehoseOn ? '#fb923c' : '#9b8db0',
            borderColor: firehoseOn ? '#f97316' : '#2e2050'
          }"
          :title="firehoseOn ? 'Stop live stream' : 'Start live stream'"
        >{{ firehoseOn ? '🔥 Firehose ON' : '🔥 Firehose OFF' }}</button>

        <!-- Live pulse -->
        <span v-if="firehoseOn" style="display:flex;align-items:center;gap:5px;color:#fb923c;font-size:12px;">
          <span style="
            display:inline-block;width:8px;height:8px;border-radius:50%;
            background:#fb923c;animation:twistFlash 1s ease-in-out infinite alternate;
          "></span>
          Live
        </span>

        <!-- Sort mode tabs — right-aligned -->
        <div style="margin-left:auto;display:flex;gap:4px;">
          <button
            v-for="mode in [{key:'new',label:'🕒 New'},{key:'hot',label:'🔥 Hot'},{key:'top',label:'⬆ Top'}]"
            :key="mode.key"
            @click="sortMode = mode.key"
            :style="{
              borderRadius:'20px', padding:'2px 12px', fontSize:'12px',
              fontWeight: sortMode === mode.key ? '700' : '400',
              border:'1px solid',
              background:  sortMode === mode.key
                ? 'linear-gradient(135deg,#8b2fc9,#e0187a)'
                : '#1e1535',
              color:       sortMode === mode.key ? '#fff' : '#9b8db0',
              borderColor: sortMode === mode.key ? '#a855f7' : '#2e2050',
              cursor:'pointer', margin:0
            }"
          >{{ mode.label }}</button>
        </div>
      </div>

      <!-- Composer -->
      <twist-composer-component
        v-if="username && hasKeychain"
        :username="username"
        :has-keychain="hasKeychain"
        :is-posting="isPosting"
        @post="handlePost"
      ></twist-composer-component>

      <!-- CTA for guests — shows @steemtwist cover + avatar as fallback -->
      <div v-if="!username" style="
        background:#1e1535;border:1px solid #2e2050;border-radius:12px;
        overflow:hidden;max-width:600px;margin:0 auto 20px;
      ">
        <div style="
          height:100px;
          background:linear-gradient(135deg,#1a3af5 0%,#8b2fc9 55%,#e0187a 100%);
          position:relative;
        ">
          <img
            src="https://steemitimages.com/u/steemtwist/avatar"
            style="
              width:64px;height:64px;border-radius:50%;
              border:3px solid #1e1535;position:absolute;
              bottom:-32px;left:16px;background:#1e1535;
            "
            @error="$event.target.src='https://steemitimages.com/u/steemtwist/avatar/small'"
          />
        </div>
        <div style="padding:40px 16px 16px;color:#9b8db0;font-size:14px;">
          Log in with Steem Keychain to post twists and give twist love.
        </div>
      </div>

      <!-- Feed -->
      <loading-spinner-component v-if="loading" message="Loading twists…"></loading-spinner-component>

      <div v-else-if="sortedTwists.length === 0" style="color:#5a4e70;padding:40px 0;font-size:15px;text-align:center;">
        No twists yet this month. Be the first! 🌀
      </div>

      <twist-card-component
        v-for="post in sortedTwists"
        :key="post.permlink"
        :post="post"
        :username="username"
        :has-keychain="hasKeychain"
        :class="post._firehose ? 'twist-flash' : ''"
        @voted="loadFeed"
      ></twist-card-component>

    </div>
  `
};

// ---- ProfileView ----
// Displays a Steem user's profile + their twists this month.
// Uses fetchTwistsByUser (account history scan) instead of fetching the
// entire monthly feed and filtering — much faster for individual profiles.
const ProfileView = {
  name: "ProfileView",
  inject: ["username", "hasKeychain", "notify"],
  components: { UserProfileComponent, TwistCardComponent, LoadingSpinnerComponent },

  data() {
    return {
      profileData:  null,
      userTwists:   [],
      loading:      true,
      monthlyRoot:  getMonthlyRoot()
    };
  },

  async created() {
    await this.loadProfile();
  },

  // Reload when navigating between profiles without unmounting the view
  // (e.g. clicking a username while already on a profile page).
  watch: {
    "$route.params.user"() { this.loadProfile(); }
  },

  methods: {
    async loadProfile() {
      const user    = this.$route.params.user;
      this.loading  = true;
      this.userTwists  = [];
      this.profileData = null;
      try {
        // Run profile fetch and account-history twist scan concurrently.
        const [profile, twists] = await Promise.all([
          fetchAccount(user),
          fetchTwistsByUser(user, this.monthlyRoot)
        ]);
        this.profileData = profile;
        this.userTwists  = twists;
      } catch {
        this.notify("Failed to load profile.", "error");
      }
      this.loading = false;
    }
  },

  template: `
    <div style="margin-top:20px;">
      <loading-spinner-component v-if="loading"></loading-spinner-component>

      <div v-else-if="!profileData" style="color:#5a4e70;padding:40px;">
        User @{{ $route.params.user }} not found.
      </div>

      <template v-else>
        <!-- Show profile header only when viewing someone else's profile.
             The logged-in user's own header is already in the global banner. -->
        <user-profile-component
          v-if="$route.params.user !== username"
          :profile-data="profileData"
        ></user-profile-component>

        <div style="margin-top:20px;">
          <div style="
            max-width:600px;margin:0 auto 12px;
            display:flex;align-items:center;justify-content:space-between;
          ">
            <h3 style="margin:0;color:#e8e0f0;">🌀 Twists this month</h3>
            <button
              @click="loadProfile"
              style="background:#1e1535;color:#a855f7;border:1px solid #2e2050;
                     border-radius:12px;padding:2px 10px;font-size:12px;margin:0;"
            >⟳ Refresh</button>
          </div>

          <div v-if="userTwists.length === 0" style="color:#5a4e70;padding:20px;font-size:14px;">
            No twists from @{{ $route.params.user }} this month.
          </div>

          <twist-card-component
            v-for="post in userTwists"
            :key="post.permlink"
            :post="post"
            :username="username"
            :has-keychain="hasKeychain"
          ></twist-card-component>
        </div>
      </template>
    </div>
  `
};

// ---- TwistView ----
// Dedicated page for a single twist at /@author/permlink.
// Shows the full post via TwistCardComponent plus a back link.
const TwistView = {
  name: "TwistView",
  inject: ["username", "hasKeychain", "notify"],
  components: { TwistCardComponent, LoadingSpinnerComponent },

  data() {
    return { post: null, parentPost: null, loading: true };
  },

  async created() {
    await this.loadPost();
  },

  watch: {
    "$route.params"() { this.loadPost(); }
  },

  methods: {
    async loadPost() {
      this.loading    = true;
      this.post       = null;
      this.parentPost = null;
      try {
        const { user, permlink } = this.$route.params;
        const result = await fetchPost(user, permlink);
        if (!result || !result.author) throw new Error("not found");
        this.post = result;

        // Fetch the parent post to show a quoted snippet above, unless
        // this is a root twist whose parent is the monthly feed post
        // (identified by its feed-YYYY-MM permlink pattern).
        const pa = result.parent_author;
        const pp = result.parent_permlink;
        const isFeedRoot = pp && pp.startsWith(TWIST_CONFIG.ROOT_PREFIX);
        if (pa && !isFeedRoot) {
          this.parentPost = await fetchPost(pa, pp).catch(() => null);
        }
      } catch {
        this.notify("Twist not found.", "error");
      }
      this.loading = false;
    },

    // Plain-text snippet: strip markdown / HTML tags, collapse whitespace,
    // truncate to 160 chars so the quote stays compact.
    parentSnippet(body) {
      if (!body) return "";
      const plain = body
        .replace(/\n+<sub>Posted via \[SteemTwist\][^\n]*/i, "") // strip back-link
        .replace(/<[^>]+>/g, "")   // strip HTML tags
        .replace(/[#*`_~>\[\]!]/g, "")  // strip common markdown symbols
        .replace(/\s+/g, " ")
        .trim();
      return plain.length > 160 ? plain.slice(0, 160) + "…" : plain;
    }
  },

  template: `
    <div style="margin-top:20px;max-width:600px;margin-left:auto;margin-right:auto;">

      <!-- Back navigation -->
      <div style="margin-bottom:14px;">
        <a
          href="#"
          @click.prevent="$router.back()"
          style="color:#a855f7;text-decoration:none;font-size:14px;font-weight:600;"
        >← Back</a>
      </div>

      <loading-spinner-component v-if="loading" message="Loading twist…"></loading-spinner-component>

      <div v-else-if="!post" style="color:#5a4e70;padding:40px;text-align:center;">
        Twist not found.
      </div>

      <template v-else>

        <!-- Parent twist quote — shown when this twist is a reply to another twist -->
        <div v-if="parentPost" style="
          background:#16102a;border:1px solid #2e2050;border-radius:12px;
          padding:12px 14px;margin-bottom:6px;
          border-left:3px solid #8b2fc9;
        ">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
            <img
              :src="'https://steemitimages.com/u/' + parentPost.author + '/avatar/small'"
              style="width:24px;height:24px;border-radius:50%;border:1px solid #2e2050;flex-shrink:0;"
              @error="$event.target.src='https://steemitimages.com/u/guest/avatar/small'"
            />
            <span style="font-size:12px;color:#9b8db0;">
              Replying to
              <a
                :href="'#/@' + parentPost.author"
                style="color:#a855f7;text-decoration:none;font-weight:600;"
              >@{{ parentPost.author }}</a>
            </span>
          </div>

          <!-- Quoted snippet -->
          <div style="
            font-size:13px;color:#9b8db0;line-height:1.5;
            font-style:italic;word-break:break-word;
          ">
            "{{ parentSnippet(parentPost.body) }}"
          </div>

          <!-- Link to parent twist page -->
          <div style="margin-top:8px;">
            <a
              :href="'#/@' + parentPost.author + '/' + parentPost.permlink"
              style="font-size:12px;color:#22d3ee;text-decoration:none;font-weight:600;"
            >↗ View original twist</a>
          </div>
        </div>

        <!-- Connector line between quote and twist card -->
        <div v-if="parentPost" style="
          width:2px;height:10px;background:#2e2050;margin:0 0 0 22px;
        "></div>

        <!-- Full twist card -->
        <twist-card-component
          :post="post"
          :username="username"
          :has-keychain="hasKeychain"
        ></twist-card-component>

        <!-- Absolute publish time shown below the card on this page -->
        <div style="
          max-width:600px;margin:6px auto 0;
          text-align:right;font-size:12px;color:#5a4e70;
        ">
          Published {{ new Date(post.created + 'Z').toUTCString().replace(' GMT', ' UTC') }}
        </div>
      </template>

    </div>
  `
};
const AboutView = {
  name: "AboutView",
  inject: ["notify"],
  data() {
    return { html: "", loading: true };
  },
  async created() {
    try {
      const res  = await fetch("README.md");
      if (!res.ok) throw new Error(res.statusText);
      const text = await res.text();
      this.html  = marked.parse(text, { breaks: true, gfm: true });
    } catch (e) {
      this.notify("Could not load README.md.", "error");
    }
    this.loading = false;
  },
  template: `
    <div style="max-width:700px;margin:30px auto 0;text-align:left;">
      <loading-spinner-component v-if="loading"></loading-spinner-component>
      <div v-else class="twist-body readme-body" v-html="html"></div>
    </div>
  `
};

// ============================================================
// ROUTER
// ============================================================

const routes = [
  { path: "/",               component: HomeView    },
  { path: "/about",          component: AboutView   },
  { path: "/@:user/:permlink", component: TwistView  },
  { path: "/@:user",         component: ProfileView }
];

const router = createRouter({
  history: createWebHashHistory('/steemtwist'),
  routes
});

// ============================================================
// ROOT APP
// ============================================================

const App = {
  components: {
    AppNotificationComponent,
    AuthComponent,
    LoadingSpinnerComponent,
    UserProfileComponent,
    TwistCardComponent,
    TwistComposerComponent
  },

  setup() {
    const username      = ref(localStorage.getItem("steem_user") || "");
    const hasKeychain   = ref(false);
    const keychainReady = ref(false);
    const loginError    = ref("");
    const showLoginForm = ref(false);
    const isLoggingIn   = ref(false);
    const notification  = ref({ message: "", type: "error" });
    const profileData   = ref(null);   // logged-in user's profile, fetched on login/mount
    const currentRoute  = useRoute();

    function notify(message, type = "error") {
      notification.value = { message, type };
    }
    function dismissNotification() {
      notification.value = { message: "", type: "error" };
    }

    // Fetch and cache the logged-in user's profile for the global header.
    // When no user is logged in, falls back to @steemtwist so the header
    // always has a cover image and identity rather than showing empty.
    async function loadProfile(user) {
      const target = user || TWIST_CONFIG.ROOT_ACCOUNT;
      profileData.value = await fetchAccount(target).catch(() => null);
    }

    onMounted(() => {
      setRPC(0);
      // Always load a profile — logged-in user's own, or @steemtwist as fallback
      loadProfile(username.value);
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.steem_keychain || attempts > 10) {
          clearInterval(interval);
          hasKeychain.value   = !!window.steem_keychain;
          keychainReady.value = true;
        }
      }, 100);
    });

    function login(user) {
      loginError.value = "";
      if (!window.steem_keychain) {
        loginError.value = "Steem Keychain extension is not installed.";
        return;
      }
      if (!user) return;
      isLoggingIn.value = true;
      keychainLogin(user, (res) => {
        isLoggingIn.value = false;
        if (!res.success) {
          loginError.value = "Keychain sign-in was rejected.";
          return;
        }
        const verified = res.data?.username || res.username;
        if (verified !== user) {
          loginError.value = "Signed account does not match entered username.";
          return;
        }
        username.value      = user;
        hasKeychain.value   = true;
        localStorage.setItem("steem_user", user);
        loginError.value    = "";
        showLoginForm.value = false;
        notify("Logged in as @" + user, "success");
        loadProfile(user);
      });
    }

    function logout() {
      username.value      = "";
      loginError.value    = "";
      showLoginForm.value = false;
      localStorage.removeItem("steem_user");
      notify("Logged out.", "info");
      loadProfile("");   // reload @steemtwist as fallback
    }

    provide("username",    username);
    provide("hasKeychain", hasKeychain);
    provide("notify",      notify);

    return {
      username, hasKeychain, keychainReady,
      loginError, showLoginForm, isLoggingIn,
      notification, notify, dismissNotification,
      login, logout, profileData, currentRoute
    };
  },

  template: `
    <!-- ═══════════════════════════════════════════════════════
         GLOBAL HEADER — cover image + nav bar + profile strip
    ══════════════════════════════════════════════════════════ -->
    <div style="position:relative;overflow:hidden;">

      <!-- Cover layer: user cover image, falls back to gradient -->
      <div :style="{
        position:'absolute', inset:0,
        backgroundImage: (profileData && profileData.coverImage)
          ? 'url(' + profileData.coverImage + ')'
          : 'none',
        backgroundSize:'cover', backgroundPosition:'center',
        zIndex:0
      }"></div>

      <!-- Gradient overlay: opaque at top (for nav legibility), fades out toward bottom -->
      <div style="
        position:absolute;inset:0;
        background:linear-gradient(to bottom,
          rgba(30,10,60,0.72) 0%,
          rgba(30,10,60,0.30) 55%,
          rgba(30,10,60,0.08) 100%);
        zIndex:1;
      "></div>

      <!-- ── Top nav bar ─────────────────────────────────── -->
      <div style="
        position:relative;z-index:2;
        padding:12px 20px;
        display:flex;align-items:center;justify-content:space-between;
        flex-wrap:wrap;gap:8px;
        box-shadow:0 2px 16px rgba(168,85,247,0.4);
      ">
        <router-link to="/" style="text-decoration:none;">
          <div>
            <span style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;
                         text-shadow:0 0 20px rgba(34,211,238,0.6);">
              🌀 SteemTwist
            </span>
            <div style="color:#e0d0ff;font-size:15px;letter-spacing:0.5px;margin-top:2px;font-weight:500;">
              Steem with a Twist
            </div>
          </div>
        </router-link>

        <nav style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
          <router-link to="/" exact-active-class="nav-active"
            style="color:#e0d0ff;text-decoration:none;padding:5px 10px;border-radius:20px;font-size:14px;"
          >Home</router-link>

          <router-link v-if="username" :to="'/@' + username" exact-active-class="nav-active"
            style="color:#e0d0ff;text-decoration:none;padding:5px 10px;border-radius:20px;font-size:14px;"
          >My Profile</router-link>

          <router-link to="/about" exact-active-class="nav-active"
            style="color:#e0d0ff;text-decoration:none;padding:5px 10px;border-radius:20px;font-size:14px;"
          >About</router-link>

          <template v-if="!username">
            <button
              @click="showLoginForm = !showLoginForm"
              style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);
                     color:#fff;padding:5px 16px;border-radius:20px;font-size:14px;
                     backdrop-filter:blur(4px);margin:0;"
            >Sign in</button>
          </template>
          <template v-else>
            <button
              @click="logout"
              style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);
                     color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;margin:0;"
            >Logout</button>
          </template>
        </nav>
      </div>

      <!-- ── Profile strip — logged-in user OR @steemtwist fallback ── -->
      <div v-if="profileData" style="
        position:relative;z-index:2;
        padding:0 20px 16px;
        display:flex;align-items:flex-end;gap:14px;
      ">
        <!-- Avatar -->
        <a :href="username ? '#/@' + username : '#/@' + profileData.username"
           style="text-decoration:none;flex-shrink:0;">
          <img
            :src="'https://steemitimages.com/u/' + (username || profileData.username) + '/avatar'"
            style="
              width:72px;height:72px;border-radius:50%;
              border:3px solid rgba(255,255,255,0.5);
              background:#1a1030;
              box-shadow:0 0 20px rgba(168,85,247,0.5);
            "
            @error="$event.target.src='https://steemitimages.com/u/steemtwist/avatar'"
          />
        </a>

        <!-- Name / bio -->
        <div style="min-width:0;padding-bottom:4px;">
          <div style="font-size:17px;font-weight:700;color:#fff;
                      text-shadow:0 1px 6px rgba(0,0,0,0.5);line-height:1.2;">
            {{ profileData.displayName }}
          </div>
          <div style="font-size:13px;color:#e0d0ff;margin-top:1px;">
            @{{ username || profileData.username }}
          </div>
          <div v-if="profileData.about"
               style="font-size:13px;color:#c0b0e0;margin-top:3px;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px;">
            {{ profileData.about }}
          </div>
        </div>
      </div>

      <!-- Fallback spacer while profile is still loading -->
      <div v-else style="height:8px;position:relative;z-index:2;"></div>

    </div><!-- /global header -->

    <!-- Inline login form -->
    <div v-if="!username && showLoginForm" style="
      background:#1a1030;border-bottom:1px solid #2e2050;
      padding:12px;text-align:center;
    ">
      <auth-component
        :username="username"
        :has-keychain="hasKeychain"
        :login-error="loginError"
        :is-logging-in="isLoggingIn"
        @login="login"
        @logout="logout"
        @close="showLoginForm = false"
      ></auth-component>
    </div>

    <!-- Keychain not detected -->
    <div v-if="keychainReady && !hasKeychain" class="keychain-notice" style="text-align:center;">
      <strong style="color:#a855f7;">Read-only mode</strong> — Install the
      <a href="https://www.google.com/search?q=steem+keychain+browser+extension" target="_blank"
         style="color:#22d3ee;">Steem Keychain</a>
      browser extension to post twists and give twist love.
    </div>

    <!-- Global notification -->
    <app-notification-component
      :message="notification.message"
      :type="notification.type"
      @dismiss="dismissNotification"
    ></app-notification-component>

    <!-- Page content -->
    <div style="padding:0 16px 40px;">
      <router-view></router-view>
    </div>
  `
};

// ============================================================
// MOUNT
// ============================================================

const vueApp = createApp(App);

vueApp.component("AppNotificationComponent", AppNotificationComponent);
vueApp.component("AuthComponent",            AuthComponent);
vueApp.component("UserProfileComponent",     UserProfileComponent);
vueApp.component("LoadingSpinnerComponent",  LoadingSpinnerComponent);
vueApp.component("ReplyCardComponent",       ReplyCardComponent);
vueApp.component("ThreadComponent",          ThreadComponent);
vueApp.component("TwistCardComponent",       TwistCardComponent);
vueApp.component("TwistComposerComponent",   TwistComposerComponent);

vueApp.use(router);
vueApp.mount("#app");
