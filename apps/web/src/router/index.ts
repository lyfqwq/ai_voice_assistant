import { createRouter, createWebHistory } from "vue-router";
import AppHomePage from "../pages/AppHomePage.vue";
import AuthPage from "../pages/AuthPage.vue";
import NotFoundPage from "../pages/NotFoundPage.vue";
import OverviewPage from "../pages/OverviewPage.vue";
import { bootstrapSession, sessionState } from "../lib/session";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "overview",
      component: OverviewPage,
    },
    {
      path: "/auth",
      name: "auth",
      component: AuthPage,
      meta: { requiresGuest: true },
    },
    {
      path: "/app",
      name: "app",
      component: AppHomePage,
      meta: { requiresAuth: true },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: NotFoundPage,
    },
  ],
});

router.beforeEach(async (to) => {
  if (sessionState.status === "idle") {
    await bootstrapSession();
  }

  if (to.meta.requiresAuth && sessionState.status !== "authenticated") {
    return { name: "auth" };
  }

  if (to.meta.requiresGuest && sessionState.status === "authenticated") {
    return { name: "app" };
  }

  return true;
});

export { router };
