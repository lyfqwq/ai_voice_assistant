<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { sessionState } from "../lib/session";

const statusCopy = computed(() => {
  if (sessionState.status === "loading") {
    return "The app is checking `/api/me` to recover any existing session.";
  }

  if (sessionState.status === "authenticated") {
    return "The backend already recognizes this browser session. This phase adds the real auth and onboarding flow on top of the shell.";
  }

  if (sessionState.status === "error") {
    return sessionState.errorMessage ?? "Session bootstrap failed.";
  }

  return "No active session was found, so the shell stays in guest mode and keeps the auth route available.";
});
</script>

<template>
  <section class="stack">
    <div class="hero">
      <p class="eyebrow">Overview</p>
      <h2>Frontend foundation is now connected to the backend session model.</h2>
      <p class="hero__copy">
        {{ statusCopy }}
      </p>
    </div>

    <div class="info-grid">
      <article class="panel">
        <p class="panel__title">What this phase includes</p>
        <ul class="bullet-list">
          <li>Email code login form</li>
          <li>Session-aware routing and logout</li>
          <li>Learning profile onboarding form</li>
          <li>Minimal authenticated home after onboarding</li>
        </ul>
      </article>

      <article class="panel">
        <p class="panel__title">What comes next</p>
        <ul class="bullet-list">
          <li>Conversation list layout</li>
          <li>Conversation list and chat UI</li>
          <li>SSE chat rendering</li>
        </ul>
      </article>
    </div>

    <div class="cta-row">
      <RouterLink class="button button--primary" to="/auth">Open sign-in flow</RouterLink>
      <RouterLink class="button" to="/app">Open app home</RouterLink>
    </div>
  </section>
</template>
