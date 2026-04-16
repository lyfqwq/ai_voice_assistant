<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { sendCode, verifyCode } from "../lib/api";
import { setAuthenticatedUser } from "../lib/session";

const router = useRouter();

const sendState = reactive({
  email: "",
  isSubmitting: false,
  errorMessage: "",
  successMessage: "",
  resendAfterSeconds: 0,
});

const verifyState = reactive({
  code: "",
  isSubmitting: false,
  errorMessage: "",
});

const step = ref<"email" | "code">("email");
let resendTimer: number | null = null;

const normalizedEmail = computed(() => sendState.email.trim().toLowerCase());
const canResendCode = computed(
  () => step.value === "code" && !sendState.isSubmitting && sendState.resendAfterSeconds <= 0,
);

function startResendCountdown() {
  if (resendTimer !== null) {
    window.clearInterval(resendTimer);
  }

  resendTimer = window.setInterval(() => {
    if (sendState.resendAfterSeconds <= 0) {
      if (resendTimer !== null) {
        window.clearInterval(resendTimer);
        resendTimer = null;
      }
      return;
    }

    sendState.resendAfterSeconds -= 1;
  }, 1000);
}

async function handleSendCode() {
  sendState.isSubmitting = true;
  sendState.errorMessage = "";
  sendState.successMessage = "";
  verifyState.errorMessage = "";

  try {
    const response = await sendCode({ email: normalizedEmail.value });
    step.value = "code";
    sendState.resendAfterSeconds = response.resendAfterSeconds;
    sendState.successMessage = `Verification code sent. You can request another code after ${response.resendAfterSeconds} seconds.`;
    startResendCountdown();
  } catch (error) {
    sendState.errorMessage =
      error instanceof Error ? error.message : "Unable to send the verification code.";
  } finally {
    sendState.isSubmitting = false;
  }
}

async function handleVerifyCode() {
  verifyState.isSubmitting = true;
  verifyState.errorMessage = "";

  try {
    const response = await verifyCode({
      email: normalizedEmail.value,
      code: verifyState.code.trim(),
    });
    setAuthenticatedUser(response.user);
    await router.push("/app");
  } catch (error) {
    verifyState.errorMessage =
      error instanceof Error ? error.message : "Unable to verify the code.";
  } finally {
    verifyState.isSubmitting = false;
  }
}

function resetFlow() {
  step.value = "email";
  verifyState.code = "";
  verifyState.errorMessage = "";
  sendState.successMessage = "";
}

watch(
  () => step.value,
  (value) => {
    if (value === "email" && resendTimer !== null) {
      window.clearInterval(resendTimer);
      resendTimer = null;
      sendState.resendAfterSeconds = 0;
    }
  },
);

onUnmounted(() => {
  if (resendTimer !== null) {
    window.clearInterval(resendTimer);
  }
});
</script>

<template>
  <section class="stack">
    <div class="hero">
      <p class="eyebrow">Auth</p>
      <h2>Sign in with a one-time email code.</h2>
      <p class="hero__copy">
        The frontend uses the existing server-side session flow. The browser never stores a JWT and only
        relies on the HttpOnly cookie returned by the backend.
      </p>
    </div>

    <div class="info-grid auth-grid">
      <article class="panel">
        <p class="panel__title">Step 1: request a code</p>

        <form class="stack" @submit.prevent="handleSendCode">
          <label class="field">
            <span class="field__label">Email</span>
            <input
              v-model="sendState.email"
              class="field__control"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              required
            />
          </label>

          <p v-if="sendState.errorMessage" class="notice notice--error">{{ sendState.errorMessage }}</p>
          <p v-if="sendState.successMessage" class="notice notice--success">{{ sendState.successMessage }}</p>

          <button class="button button--primary" type="submit" :disabled="sendState.isSubmitting">
            {{ sendState.isSubmitting ? "Sending..." : "Send verification code" }}
          </button>
        </form>
      </article>

      <article class="panel">
        <p class="panel__title">Step 2: verify and create session</p>

        <form class="stack" @submit.prevent="handleVerifyCode">
          <label class="field">
            <span class="field__label">Verification code</span>
            <input
              v-model="verifyState.code"
              class="field__control field__control--code"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="123456"
              :disabled="step !== 'code'"
              required
            />
          </label>

          <p class="muted-copy">
            Active email: <strong>{{ normalizedEmail || "Not set yet" }}</strong>
          </p>
          <p v-if="step === 'code' && sendState.resendAfterSeconds > 0" class="muted-copy">
            Resend available in {{ sendState.resendAfterSeconds }}s.
          </p>

          <p v-if="verifyState.errorMessage" class="notice notice--error">{{ verifyState.errorMessage }}</p>

          <div class="cta-row">
            <button
              class="button button--primary"
              type="submit"
              :disabled="step !== 'code' || verifyState.isSubmitting"
            >
              {{ verifyState.isSubmitting ? "Verifying..." : "Verify code" }}
            </button>

            <button class="button" type="button" :disabled="step !== 'code'" @click="resetFlow">
              Edit email
            </button>

            <button class="button" type="button" :disabled="!canResendCode" @click="handleSendCode">
              Resend code
            </button>
          </div>
        </form>
      </article>
    </div>
  </section>
</template>
