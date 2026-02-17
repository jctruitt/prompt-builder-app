// Google Analytics custom event helper
// Wraps gtag() calls so components don't need to check for window.gtag

export function trackEvent(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params)
  }
}

export function trackPageView(pageName) {
  trackEvent('page_view', { page_title: pageName, page_location: window.location.href })
}

// Pre-defined events for the app
export const events = {
  // Auth
  login: () => trackEvent('login', { method: 'email' }),
  register: () => trackEvent('sign_up', { method: 'email' }),
  logout: () => trackEvent('logout'),

  // Prompts
  promptSaved: (isPublic) => trackEvent('prompt_saved', { is_public: isPublic }),
  promptDeleted: () => trackEvent('prompt_deleted'),
  promptCopied: () => trackEvent('prompt_copied'),
  promptSentToApi: (model) => trackEvent('prompt_sent_to_api', { model }),
  promptSentToCli: () => trackEvent('prompt_sent_to_cli'),

  // Community
  communityViewed: () => trackPageView('Community'),
  communityPromptUsed: () => trackEvent('community_prompt_used'),
  communityPromptCopied: () => trackEvent('community_prompt_copied'),
  visibilityToggled: (isPublic) => trackEvent('visibility_toggled', { new_state: isPublic ? 'public' : 'private' }),

  // Navigation
  pageViewed: (page) => trackPageView(page),

  // API Keys
  apiKeySaved: (keyName) => trackEvent('api_key_saved', { key_name: keyName }),
}
