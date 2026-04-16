<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { bootstrapSession, logoutSession, sessionState } from "./lib/session";

const statusLabel = computed(() => {
  if (sessionState.status === "loading") {
    return "Checking session";
  }

  if (sessionState.status === "authenticated") {
    return "Signed in";
  }

  if (sessionState.status === "error") {
    return "Session check failed";
  }

  return "Guest";
});

const userLabel = computed(() => sessionState.user?.email ?? "No active session");

const ctaLink = computed(() =>
  sessionState.status === "authenticated" ? { to: "/app", label: "Open app" } : { to: "/auth", label: "Sign in" },
);

async function handleLogout() {
  await logoutSession();
}

onMounted(() => {
  if (sessionState.status === "idle") {
    void bootstrapSession();
  }
});
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__glow app-shell__glow--left"></div>
    <div class="app-shell__glow app-shell__glow--right"></div>

    <header class="topbar">
      <div>
        <p class="eyebrow">AI Voice Assistant</p>
        <h1 class="title">Frontend shell for the MVP learning coach</h1>
      </div>

      <div class="topbar__actions">
        <div class="status-chip">
          <span class="status-chip__label">{{ statusLabel }}</span>
          <span class="status-chip__value">{{ userLabel }}</span>
        </div>

        <button
          v-if="sessionState.status === 'authenticated'"
          type="button"
          class="button"
          @click="handleLogout"
        >
          Log out
        </button>
        <RouterLink v-else class="button button--primary" :to="ctaLink.to">
          {{ ctaLink.label }}
        </RouterLink>
      </div>
    </header>

    <div class="shell-grid">
      <aside class="sidebar card">
        <p class="sidebar__heading">Current routes</p>
        <nav class="nav-links">
          <RouterLink to="/" class="nav-link" active-class="nav-link--active">Overview</RouterLink>
          <RouterLink to="/auth" class="nav-link" active-class="nav-link--active">Auth</RouterLink>
          <RouterLink to="/app" class="nav-link" active-class="nav-link--active">App</RouterLink>
        </nav>

        <div class="sidebar__meta">
          <p>Phase: Web Phase 2</p>
          <p>Scope: auth, onboarding, session routing</p>
        </div>
      </aside>

      <main class="content card">
        <RouterView />
      </main>
    </div>
  </div>
</template>
