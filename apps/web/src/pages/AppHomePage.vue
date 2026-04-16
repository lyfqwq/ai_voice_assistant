<script setup lang="ts">
import type {
  ConversationListItemDto,
  LearningProfileDto,
  MessageDto,
  PatchLearningProfileRequest,
} from "@ai-voice-assistant/shared";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import {
  createConversation,
  getConversationMessages,
  getConversations,
  getLearningProfile,
  patchLearningProfile,
  postConversationMessageStream,
} from "../lib/api";
import { markOnboardingCompleted, sessionState } from "../lib/session";

interface UiMessage extends MessageDto {
  isStreaming?: boolean;
}

const profileState = reactive({
  isLoading: true,
  isSubmitting: false,
  errorMessage: "",
  successMessage: "",
  profile: null as LearningProfileDto | null,
});

const formState = reactive({
  goalText: "",
  currentLevelText: "",
  weeklyTimeMinutes: 180,
  weakPointsText: "",
});

const conversationsState = reactive({
  isLoading: false,
  isLoadingMessages: false,
  isCreating: false,
  isSending: false,
  errorMessage: "",
  composerText: "",
  lastFailedPrompt: "",
  items: [] as ConversationListItemDto[],
  activeConversationId: "",
  activeConversationTitle: "新对话",
  activeConversationSummary: null as string | null,
  messages: [] as UiMessage[],
});

const messageListRef = ref<HTMLElement | null>(null);

const isOnboardingComplete = computed(() => profileState.profile !== null);
const activeConversation = computed(
  () => conversationsState.items.find((item) => item.id === conversationsState.activeConversationId) ?? null,
);
const canSendMessage = computed(
  () =>
    !!conversationsState.activeConversationId
    && !conversationsState.isSending
    && conversationsState.composerText.trim().length > 0,
);
const hasMessages = computed(() => conversationsState.messages.length > 0);
const canRetryLastPrompt = computed(
  () =>
    !!conversationsState.activeConversationId
    && !conversationsState.isSending
    && conversationsState.lastFailedPrompt.trim().length > 0,
);

function hydrateFormFromProfile() {
  if (!profileState.profile) {
    return;
  }

  formState.goalText = profileState.profile.goalText;
  formState.currentLevelText = profileState.profile.currentLevelText;
  formState.weeklyTimeMinutes = profileState.profile.weeklyTimeMinutes;
  formState.weakPointsText = profileState.profile.userDeclaredWeakPoints.join("\n");
}

async function scrollMessagesToBottom() {
  await nextTick();
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
  }
}

async function loadProfile() {
  profileState.isLoading = true;
  profileState.errorMessage = "";

  try {
    const response = await getLearningProfile();
    profileState.profile = response.profile;

    if (response.profile) {
      markOnboardingCompleted();
      hydrateFormFromProfile();
    }
  } catch (error) {
    profileState.errorMessage =
      error instanceof Error ? error.message : "Unable to load the learning profile.";
  } finally {
    profileState.isLoading = false;
  }
}

async function loadConversations() {
  conversationsState.isLoading = true;
  conversationsState.errorMessage = "";

  try {
    const response = await getConversations();
    conversationsState.items = response.items;

    if (!conversationsState.activeConversationId && response.items[0]) {
      await selectConversation(response.items[0].id);
    }
  } catch (error) {
    conversationsState.errorMessage =
      error instanceof Error ? error.message : "Unable to load conversations.";
  } finally {
    conversationsState.isLoading = false;
  }
}

async function selectConversation(conversationId: string) {
  conversationsState.activeConversationId = conversationId;
  conversationsState.errorMessage = "";
  conversationsState.isLoadingMessages = true;

  try {
    const response = await getConversationMessages(conversationId);
    conversationsState.activeConversationTitle = response.conversation.title;
    conversationsState.activeConversationSummary = response.conversation.summary;
    conversationsState.messages = response.items.map((item) => ({ ...item }));
    await scrollMessagesToBottom();
  } catch (error) {
    conversationsState.errorMessage =
      error instanceof Error ? error.message : "Unable to load message history.";
  } finally {
    conversationsState.isLoadingMessages = false;
  }
}

async function handleCreateConversation() {
  conversationsState.isCreating = true;
  conversationsState.errorMessage = "";

  try {
    const response = await createConversation();
    conversationsState.items = [response.conversation, ...conversationsState.items];
    await selectConversation(response.conversation.id);
  } catch (error) {
    conversationsState.errorMessage =
      error instanceof Error ? error.message : "Unable to create a conversation.";
  } finally {
    conversationsState.isCreating = false;
  }
}

function toPatchPayload(): PatchLearningProfileRequest {
  return {
    goalText: formState.goalText.trim(),
    currentLevelText: formState.currentLevelText.trim(),
    weeklyTimeMinutes: Number(formState.weeklyTimeMinutes),
    userDeclaredWeakPoints: formState.weakPointsText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

async function handleSubmit() {
  profileState.isSubmitting = true;
  profileState.errorMessage = "";
  profileState.successMessage = "";

  try {
    const response = await patchLearningProfile(toPatchPayload());
    profileState.profile = response.profile;
    profileState.successMessage = "Onboarding saved. Conversations and chat are now unlocked.";
    markOnboardingCompleted();
    hydrateFormFromProfile();
    await loadConversations();
  } catch (error) {
    profileState.errorMessage =
      error instanceof Error ? error.message : "Unable to save the learning profile.";
  } finally {
    profileState.isSubmitting = false;
  }
}

async function handleSendMessage(promptOverride?: string) {
  const conversationId = conversationsState.activeConversationId;
  const contentText = (promptOverride ?? conversationsState.composerText).trim();

  if (!conversationId || !contentText) {
    return;
  }

  conversationsState.isSending = true;
  conversationsState.errorMessage = "";
  conversationsState.composerText = "";
  conversationsState.lastFailedPrompt = "";

  const localUserId = `local-user-${Date.now()}`;
  const localAssistantId = `local-assistant-${Date.now()}`;
  let streamingAssistantId = localAssistantId;

  conversationsState.messages = [
    ...conversationsState.messages,
    {
      id: localUserId,
      seqNo: conversationsState.messages.length + 1,
      role: "user",
      status: "completed",
      contentText,
      createdAt: new Date().toISOString(),
    },
    {
      id: localAssistantId,
      seqNo: conversationsState.messages.length + 2,
      role: "assistant",
      status: "completed",
      contentText: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    },
  ];

  await scrollMessagesToBottom();

  try {
    await postConversationMessageStream(
      conversationId,
      { content: contentText },
      {
        onAck: (payload) => {
          streamingAssistantId = payload.assistantMessageId;
          conversationsState.messages = conversationsState.messages.map((message) =>
            message.id === localAssistantId
              ? { ...message, id: payload.assistantMessageId }
              : message,
          );
        },
        onDelta: (payload) => {
          conversationsState.messages = conversationsState.messages.map((message) =>
            message.id === streamingAssistantId
              ? {
                  ...message,
                  contentText: `${message.contentText}${payload.delta}`,
                  isStreaming: true,
                }
              : message,
          );
        },
        onCompleted: (payload) => {
          conversationsState.messages = conversationsState.messages.map((message) =>
            message.id === streamingAssistantId
              ? { ...payload.assistantMessage, isStreaming: false }
              : message,
          );
        },
        onConversationUpdated: (payload) => {
          conversationsState.activeConversationTitle = payload.conversation.title;
          conversationsState.activeConversationSummary = payload.conversation.summary;
          conversationsState.items = conversationsState.items.map((item) =>
            item.id === payload.conversation.id ? { ...item, ...payload.conversation } : item,
          );
        },
        onProfileUpdated: (payload) => {
          if (!profileState.profile) {
            return;
          }

          profileState.profile = {
            ...profileState.profile,
            recentTopics: payload.profilePatch.recentTopics ?? profileState.profile.recentTopics,
            derivedWeakPoints:
              payload.profilePatch.derivedWeakPoints ?? profileState.profile.derivedWeakPoints,
            progressNotes: payload.profilePatch.progressNotes ?? profileState.profile.progressNotes,
          };
        },
        onError: (payload) => {
          conversationsState.errorMessage = payload.message;
          conversationsState.lastFailedPrompt = contentText;
          conversationsState.messages = conversationsState.messages.filter(
            (message) => message.id !== streamingAssistantId || message.contentText.length > 0,
          );
        },
      },
    );

    const refreshed = await getConversationMessages(conversationId);
    conversationsState.activeConversationTitle = refreshed.conversation.title;
    conversationsState.activeConversationSummary = refreshed.conversation.summary;
    conversationsState.messages = refreshed.items.map((item) => ({ ...item }));

    const list = await getConversations();
    conversationsState.items = list.items;
    await scrollMessagesToBottom();
  } catch (error) {
    conversationsState.errorMessage =
      error instanceof Error ? error.message : "Unable to send the message.";
    conversationsState.lastFailedPrompt = contentText;
  } finally {
    conversationsState.isSending = false;
  }
}

async function retryLastPrompt() {
  if (!conversationsState.lastFailedPrompt) {
    return;
  }

  await handleSendMessage(conversationsState.lastFailedPrompt);
}

watch(
  () => [
    conversationsState.activeConversationId,
    conversationsState.messages.length,
    conversationsState.messages[conversationsState.messages.length - 1]?.contentText ?? "",
  ],
  async () => {
    if (conversationsState.activeConversationId) {
      await scrollMessagesToBottom();
    }
  },
);

onMounted(() => {
  void loadProfile().then(async () => {
    if (profileState.profile) {
      await loadConversations();
    }
  });
});
</script>

<template>
  <section class="stack">
    <div class="hero">
      <p class="eyebrow">App home</p>
      <h2>Finish onboarding, then move straight into conversations and SSE chat.</h2>
      <p class="hero__copy">
        This page keeps the MVP flow on one surface: onboarding first, then conversation management and streamed
        replies from the backend.
      </p>
    </div>

    <p v-if="profileState.isLoading" class="notice">Loading learning profile...</p>
    <p v-else-if="profileState.errorMessage" class="notice notice--error">{{ profileState.errorMessage }}</p>

    <div v-else class="info-grid app-grid">
      <article class="panel">
        <p class="panel__title">
          {{ isOnboardingComplete ? "Learning profile" : "Onboarding form" }}
        </p>

        <form class="stack" @submit.prevent="handleSubmit">
          <label class="field">
            <span class="field__label">Learning goal</span>
            <textarea
              v-model="formState.goalText"
              class="field__control field__control--textarea"
              placeholder="Describe the skill you want to improve."
              required
            />
          </label>

          <label class="field">
            <span class="field__label">Current level</span>
            <textarea
              v-model="formState.currentLevelText"
              class="field__control field__control--textarea"
              placeholder="Describe your current baseline."
              required
            />
          </label>

          <label class="field">
            <span class="field__label">Weekly time (minutes)</span>
            <input
              v-model.number="formState.weeklyTimeMinutes"
              class="field__control"
              type="number"
              min="1"
              step="1"
              required
            />
          </label>

          <label class="field">
            <span class="field__label">Weak points</span>
            <textarea
              v-model="formState.weakPointsText"
              class="field__control field__control--textarea"
              placeholder="One item per line or comma-separated."
              required
            />
          </label>

          <p v-if="profileState.successMessage" class="notice notice--success">
            {{ profileState.successMessage }}
          </p>

          <button class="button button--primary" type="submit" :disabled="profileState.isSubmitting">
            {{ profileState.isSubmitting ? "Saving..." : isOnboardingComplete ? "Update onboarding" : "Complete onboarding" }}
          </button>
        </form>
      </article>

      <article class="panel">
        <p class="panel__title">Authenticated status</p>
        <ul class="bullet-list">
          <li><strong>Email:</strong> {{ sessionState.user?.email ?? "Unavailable" }}</li>
          <li><strong>Onboarding completed:</strong> {{ sessionState.user?.onboardingCompleted ? "Yes" : "No" }}</li>
          <li><strong>Profile exists:</strong> {{ profileState.profile ? "Yes" : "No" }}</li>
        </ul>

        <div v-if="profileState.profile" class="summary-card">
          <p class="summary-card__title">Current profile snapshot</p>
          <p><strong>Goal:</strong> {{ profileState.profile.goalText }}</p>
          <p><strong>Level:</strong> {{ profileState.profile.currentLevelText }}</p>
          <p><strong>Weak points:</strong> {{ profileState.profile.userDeclaredWeakPoints.join(", ") }}</p>
          <p><strong>Recent topics:</strong> {{ profileState.profile.recentTopics.join(", ") || "None yet" }}</p>
          <p><strong>Progress notes:</strong> {{ profileState.profile.progressNotes ?? "None yet" }}</p>
        </div>
        <p v-else class="muted-copy">
          No learning profile exists yet. Submit the form to create the onboarding record.
        </p>
      </article>
    </div>

    <div v-if="isOnboardingComplete" class="workspace-grid">
      <aside class="panel workspace-sidebar">
        <div class="workspace-sidebar__header">
          <p class="panel__title">Conversations</p>
          <button
            class="button button--primary"
            type="button"
            @click="handleCreateConversation"
            :disabled="conversationsState.isCreating"
          >
            {{ conversationsState.isCreating ? "Creating..." : "New" }}
          </button>
        </div>

        <div v-if="conversationsState.isLoading" class="stack">
          <div v-for="index in 3" :key="index" class="skeleton-card"></div>
        </div>
        <p v-else-if="!conversationsState.items.length" class="muted-copy">
          No conversations yet. Create the first one to start chatting.
        </p>

        <button
          v-for="conversation in conversationsState.items"
          :key="conversation.id"
          type="button"
          class="conversation-card"
          :class="{ 'conversation-card--active': conversation.id === conversationsState.activeConversationId }"
          @click="selectConversation(conversation.id)"
        >
          <span class="conversation-card__title">{{ conversation.title }}</span>
          <span class="conversation-card__meta">{{ conversation.messageCount }} messages</span>
        </button>
      </aside>

      <section class="panel workspace-main">
        <div class="workspace-main__header">
          <div>
            <p class="panel__title">Chat</p>
            <h3 class="workspace-main__title">{{ activeConversation?.title ?? "Choose or create a conversation" }}</h3>
            <p class="muted-copy">
              {{ conversationsState.activeConversationSummary ?? "Learning-focused coaching streamed from the backend SSE endpoint." }}
            </p>
          </div>
        </div>

        <p v-if="conversationsState.errorMessage" class="notice notice--error">{{ conversationsState.errorMessage }}</p>

        <div ref="messageListRef" class="message-list">
          <div v-if="conversationsState.isLoadingMessages" class="stack">
            <div v-for="index in 3" :key="index" class="skeleton-message"></div>
          </div>

          <div v-else-if="!conversationsState.activeConversationId" class="empty-state">
            Create a conversation to load message history and start the SSE chat flow.
          </div>

          <div v-else-if="!hasMessages" class="empty-state">
            This conversation is empty. Send the first prompt to kick off the coaching flow.
          </div>

          <article
            v-for="message in conversationsState.messages"
            :key="message.id"
            class="message-bubble"
            :class="message.role === 'user' ? 'message-bubble--user' : 'message-bubble--assistant'"
          >
            <p class="message-bubble__role">
              {{ message.role === "user" ? "You" : "Assistant" }}
              <span v-if="message.isStreaming" class="message-bubble__streaming">streaming...</span>
            </p>
            <p class="message-bubble__text">{{ message.contentText || "..." }}</p>
          </article>
        </div>

        <div v-if="canRetryLastPrompt" class="retry-row">
          <p class="muted-copy">Last send failed. Retry the same prompt without retyping.</p>
          <button class="button" type="button" @click="retryLastPrompt">Retry last prompt</button>
        </div>

        <form class="composer" @submit.prevent="handleSendMessage()">
          <textarea
            v-model="conversationsState.composerText"
            class="field__control field__control--textarea composer__input"
            placeholder="Type the next learning prompt..."
            :disabled="!conversationsState.activeConversationId || conversationsState.isSending"
          />

          <div class="composer__footer">
            <p class="muted-copy">Uses `POST /api/conversations/:id/messages` with backend SSE events.</p>
            <button class="button button--primary" type="submit" :disabled="!canSendMessage">
              {{ conversationsState.isSending ? "Sending..." : "Send message" }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>
