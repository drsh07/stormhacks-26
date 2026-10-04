import type { Href, useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Leave a detail screen for one of the main tabs. Closes any detail screens
 * stacked on top of the tabs first, so the tab comes back exactly as it was
 * left instead of a fresh copy being opened on top.
 */
export function goToTab(router: Router, tab: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(tab);
}
