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
        font-size:13px;color:#888;margin-bottom:14px;
      ">
        <span>📅 <strong>{{ monthlyRoot }}</strong></span>

        <button
          @click="loadFeed"
          style="background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;
                 border-radius:12px;padding:2px 10px;font-size:12px;"
        >⟳ Refresh</button>

        <!-- Firehose toggle -->
        <button
          @click="toggleFirehose"
          :style="{
            borderRadius:'12px', padding:'2px 12px', fontSize:'12px',
            fontWeight:'600', border:'1px solid',
            background:  firehoseOn ? '#fff3e0' : '#f5f5f5',
            color:       firehoseOn ? '#e65100' : '#888',
            borderColor: firehoseOn ? '#ffb74d' : '#ddd'
          }"
          :title="firehoseOn ? 'Stop live stream' : 'Start live stream'"
        >{{ firehoseOn ? '🔥 Firehose ON' : '🔥 Firehose OFF' }}</button>

        <!-- Live pulse -->
        <span v-if="firehoseOn" style="display:flex;align-items:center;gap:5px;color:#e65100;font-size:12px;">
          <span style="
            display:inline-block;width:8px;height:8px;border-radius:50%;
            background:#e65100;animation:twistFlash 1s ease-in-out infinite alternate;
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
              borderRadius:'12px', padding:'2px 12px', fontSize:'12px',
              fontWeight: sortMode === mode.key ? '700' : '400',
              border:'1px solid',
              background:  sortMode === mode.key ? '#1b5e20' : '#f5f5f5',
              color:       sortMode === mode.key ? '#fff'     : '#555',
              borderColor: sortMode === mode.key ? '#1b5e20'  : '#ddd',
              cursor:'pointer'
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

      <!-- CTA for guests -->
      <div v-if="!username" style="
        background:#fff;border:1px solid #e0e0e0;border-radius:10px;
        padding:16px;max-width:600px;margin:0 auto 20px;color:#888;font-size:14px;
      ">
        Log in with Steem Keychain to post twists and give twist love.
      </div>

      <!-- Feed -->
      <loading-spinner-component v-if="loading" message="Loading twists…"></loading-spinner-component>

      <div v-else-if="sortedTwists.length === 0" style="color:#aaa;padding:40px 0;font-size:15px;">
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

      <div v-else-if="!profileData" style="color:#888;padding:40px;">
        User @{{ $route.params.user }} not found.
      </div>

      <template v-else>
        <user-profile-component :profile-data="profileData"></user-profile-component>

        <div style="margin-top:30px;">
          <div style="
            max-width:600px;margin:0 auto 12px;
            display:flex;align-items:center;justify-content:space-between;
          ">
            <h3 style="margin:0;color:#333;">🌀 Twists this month</h3>
            <button
              @click="loadProfile"
              style="background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;
                     border-radius:12px;padding:2px 10px;font-size:12px;"
            >⟳ Refresh</button>
          </div>

          <div v-if="userTwists.length === 0" style="color:#aaa;padding:20px;font-size:14px;">
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
    return { post: null, loading: true };
  },

  async created() {
    await this.loadPost();
  },

  watch: {
    "$route.params"() { this.loadPost(); }
  },

  methods: {
    async loadPost() {
      this.loading = true;
      this.post    = null;
      try {
        const { user, permlink } = this.$route.params;
        const result = await fetchPost(user, permlink);
        // fetchPost returns an empty author string when the post doesn't exist
        if (!result || !result.author) throw new Error("not found");
        this.post = result;
      } catch {
        this.notify("Twist not found.", "error");
      }
      this.loading = false;
    }
  },

  template: `
    <div style="margin-top:20px;max-width:600px;margin-left:auto;margin-right:auto;">

      <!-- Back navigation -->
      <div style="margin-bottom:14px;">
        <a
          href="#"
          @click.prevent="$router.back()"
          style="color:#2e7d32;text-decoration:none;font-size:14px;font-weight:600;"
        >← Back</a>
      </div>

      <loading-spinner-component v-if="loading" message="Loading twist…"></loading-spinner-component>

      <div v-else-if="!post" style="color:#888;padding:40px;text-align:center;">
        Twist not found.
      </div>

      <template v-else>
        <!-- Full twist card -->
        <twist-card-component
          :post="post"
          :username="username"
          :has-keychain="hasKeychain"
        ></twist-card-component>

        <!-- Absolute publish time shown below the card on this page -->
        <div style="
          max-width:600px;margin:6px auto 0;
          text-align:right;font-size:12px;color:#bbb;
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
    const currentRoute  = useRoute();

    function notify(message, type = "error") {
      notification.value = { message, type };
    }
    function dismissNotification() {
      notification.value = { message: "", type: "error" };
    }

    onMounted(() => {
      setRPC(0);
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
      });
    }

    function logout() {
      username.value      = "";
      loginError.value    = "";
      showLoginForm.value = false;
      localStorage.removeItem("steem_user");
      notify("Logged out.", "info");
    }

    provide("username",    username);
    provide("hasKeychain", hasKeychain);
    provide("notify",      notify);

    return {
      username, hasKeychain, keychainReady,
      loginError, showLoginForm, isLoggingIn,
      notification, notify, dismissNotification,
      login, logout, currentRoute
    };
  },

  template: `
    <!-- Header -->
    <div style="
      background:#1b5e20;padding:12px 20px;
      display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:8px;
    ">
      <router-link to="/" style="text-decoration:none;">
        <div>
          <span style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;">
            🌀 SteemTwist
          </span>
          <div style="color:#a5d6a7;font-size:12px;letter-spacing:0.5px;margin-top:1px;">
            Steem with a Twist
          </div>
        </div>
      </router-link>

      <nav style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
        <router-link
          to="/"
          exact-active-class="nav-active"
          style="color:#a5d6a7;text-decoration:none;padding:5px 10px;border-radius:6px;font-size:14px;"
        >Home</router-link>

        <router-link
          v-if="username"
          :to="'/@' + username"
          exact-active-class="nav-active"
          style="color:#a5d6a7;text-decoration:none;padding:5px 10px;border-radius:6px;font-size:14px;"
        >My Profile</router-link>

        <router-link
          to="/about"
          exact-active-class="nav-active"
          style="color:#a5d6a7;text-decoration:none;padding:5px 10px;border-radius:6px;font-size:14px;"
        >About</router-link>

        <template v-if="!username">
          <button
            @click="showLoginForm = !showLoginForm"
            style="background:#2e7d32;border:1px solid #a5d6a7;color:#fff;
                   padding:5px 14px;border-radius:6px;font-size:14px;"
          >Sign in</button>
        </template>
        <template v-else>
          <a :href="'#/@' + username" style="text-decoration:none;">
            <img
              :src="'https://steemitimages.com/u/' + username + '/avatar/small'"
              style="width:32px;height:32px;border-radius:50%;border:2px solid #a5d6a7;vertical-align:middle;"
            />
          </a>
          <button
            @click="logout"
            style="background:transparent;border:1px solid #a5d6a7;color:#a5d6a7;
                   padding:4px 12px;border-radius:6px;font-size:13px;"
          >Logout</button>
        </template>
      </nav>
    </div>

    <!-- Inline login form -->
    <div v-if="!username && showLoginForm" style="
      background:#f1f8e9;border-bottom:1px solid #c5e1a5;
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
    <div v-if="keychainReady && !hasKeychain" class="keychain-notice">
      <strong>Read-only mode</strong> — Install the
      <a href="https://www.google.com/search?q=steem+keychain+browser+extension" target="_blank">
        Steem Keychain</a>
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
