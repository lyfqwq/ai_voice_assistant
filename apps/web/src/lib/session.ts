import type { CurrentUserDto } from "@ai-voice-assistant/shared";
import { reactive } from "vue";
import { ApiError, getCurrentUser, logout } from "./api";

type SessionStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "anonymous"
  | "error";

interface SessionState {
  status: SessionStatus;
  user: CurrentUserDto | null;
  errorMessage: string | null;
}

const sessionState = reactive<SessionState>({
  status: "idle",
  user: null,
  errorMessage: null,
});

async function bootstrapSession() {
  sessionState.status = "loading";
  sessionState.errorMessage = null;

  try {
    const response = await getCurrentUser();
    sessionState.status = "authenticated";
    sessionState.user = response.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      sessionState.status = "anonymous";
      sessionState.user = null;
      return;
    }

    sessionState.status = "error";
    sessionState.user = null;
    sessionState.errorMessage =
      error instanceof Error ? error.message : "Unknown session bootstrap error";
  }
}

function setAuthenticatedUser(user: CurrentUserDto) {
  sessionState.status = "authenticated";
  sessionState.user = user;
  sessionState.errorMessage = null;
}

function markOnboardingCompleted() {
  if (!sessionState.user) {
    return;
  }

  sessionState.user = {
    ...sessionState.user,
    onboardingCompleted: true,
  };
}

async function logoutSession() {
  try {
    await logout();
  } finally {
    sessionState.status = "anonymous";
    sessionState.user = null;
    sessionState.errorMessage = null;
  }
}

export {
  sessionState,
  bootstrapSession,
  setAuthenticatedUser,
  markOnboardingCompleted,
  logoutSession,
};
