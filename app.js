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
const HomeView = {
  name: "HomeView",
  inject: ["username", "hasKeychain", "notify"],
  components: { TwistComposerComponent, TwistCardComponent, LoadingSpinnerComponent },

  data() {
    return {
      twists:      [],
      loading:     true,
      isPosting:   false,
      monthlyRoot: getMonthlyRoot()
    };
  },

  async created() {
    await this.loadFeed();
  },

  methods: {
    async loadFeed() {
      this.loading = true;
      try {
        this.twists = await fetchTwistFeed(this.monthlyRoot);
      } catch (e) {
        this.notify("Could not load feed. Please try again.", "error");
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
          // Small delay so the node can index the new post
          await new Promise(r => setTimeout(r, 2000));
          await this.loadFeed();
        } else {
          this.notify(res.error || res.message || "Failed to post twist.", "error");
        }
      });
    }
  },

  template: `
    <div style="margin-top:20px;">

      <!-- Month badge -->
      <div style="font-size:13px;color:#888;margin-bottom:14px;">
        📅 Showing twists for <strong>{{ monthlyRoot }}</strong>
        <button
          @click="loadFeed"
          style="margin-left:10px;background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;
                 border-radius:12px;padding:2px 10px;font-size:12px;"
        >⟳ Refresh</button>
      </div>

      <!-- Composer (only when logged in with Keychain) -->
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
        Log in with Steem Keychain to post twists and like posts.
      </div>

      <!-- Feed -->
      <loading-spinner-component v-if="loading" message="Loading twists…"></loading-spinner-component>

      <div v-else-if="twists.length === 0" style="color:#aaa;padding:40px 0;font-size:15px;">
        No twists yet this month. Be the first! 🌀
      </div>

      <twist-card-component
        v-for="post in twists"
        :key="post.permlink"
        :post="post"
        :username="username"
        :has-keychain="hasKeychain"
        @voted="loadFeed"
      ></twist-card-component>

    </div>
  `
};

// ---- ProfileView ----
// Displays a Steem user's profile + their recent twists.
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
    const user = this.$route.params.user;
    this.loading = true;
    try {
      const [profile, allTwists] = await Promise.all([
        fetchAccount(user),
        fetchTwistFeed(this.monthlyRoot)
      ]);
      this.profileData = profile;
      this.userTwists  = allTwists.filter(t => t.author === user);
    } catch {
      this.notify("Failed to load profile.", "error");
    }
    this.loading = false;
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
          <h3 style="max-width:600px;margin:0 auto 12px;text-align:left;color:#333;">
            🌀 Twists this month
          </h3>

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

// ---- AboutView ----
const AboutView = {
  name: "AboutView",
  template: `
    <div style="margin-top:30px;max-width:600px;margin-left:auto;margin-right:auto;text-align:left;">
      <h2>About SteemTwist 🌀</h2>
      <p>
        <strong>SteemTwist</strong> is a decentralised microblogging dApp built on the
        <strong>Steem blockchain</strong>. Think Twitter, but your posts are permanent,
        censorship-resistant, and optionally earn you crypto rewards.
      </p>
      <h3>How it works</h3>
      <ul style="line-height:1.8;">
        <li>Each twist is a blockchain comment posted under a shared monthly root
            (<code>@steemtwist / feed-YYYY-MM</code>).</li>
        <li>Permlinks are deterministic: <code>tw-YYYYMMDD-HHMMSS-username</code>.</li>
        <li>Authentication and signing use <strong>Steem Keychain</strong> — your keys never leave your device.</li>
        <li>The site is fully static and can be hosted on <strong>GitHub Pages</strong> for free.</li>
      </ul>
      <h3>Tech stack</h3>
      <ul style="line-height:1.8;">
        <li>steem-js (blockchain API)</li>
        <li>Steem Keychain (signing)</li>
        <li>Vue 3 CDN + Vue Router 4</li>
        <li>Zero backend, zero build tools</li>
      </ul>
      <p style="color:#888;font-size:13px;margin-top:20px;">SteemTwist v0.1</p>
    </div>
  `
};

// ============================================================
// ROUTER
// ============================================================

const routes = [
  { path: "/",        component: HomeView    },
  { path: "/about",   component: AboutView   },
  { path: "/@:user",  component: ProfileView }
];

const router = createRouter({
  history: createWebHashHistory(),
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
        <span style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px;">
          🌀 SteemTwist
        </span>
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
          <a :href="'/#/@' + username" style="text-decoration:none;">
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
      browser extension to post twists and vote.
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
vueApp.component("ThreadComponent",          ThreadComponent);
vueApp.component("TwistCardComponent",       TwistCardComponent);
vueApp.component("TwistComposerComponent",   TwistComposerComponent);

vueApp.use(router);
vueApp.mount("#app");
