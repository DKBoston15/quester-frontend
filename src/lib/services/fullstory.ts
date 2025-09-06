import { init, FullStory } from '@fullstory/browser';
import type { User } from '../types/auth';

// Initialize FullStory when the module loads
const FULLSTORY_ORG_ID = 'o-23MSRK-na1';

export function initializeFullStory() {
  init({ orgId: FULLSTORY_ORG_ID });
}

export function identifyUser(user: User) {
  if (!user) return;

  // Set user identity in FullStory using the v2 API
  FullStory('setIdentity', {
    uid: user.id.toString(), // FullStory expects string IDs
    properties: {
      displayName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      hasOrcid: !!user.orcidUrl,
      orcidUrl: user.orcidUrl || undefined,
    }
  });
}

export function clearUserIdentity() {
  // Clear user identity when logging out
  // FullStory v2 API uses restart to create a new anonymous session
  FullStory('restart');
}

// Custom event tracking
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  FullStory('trackEvent', {
    name: eventName,
    properties,
  });
}

// Track page views
export function trackPageView(pageName: string, properties?: Record<string, any>) {
  FullStory('trackEvent', {
    name: 'Page Viewed',
    properties: {
      pageName,
      ...properties,
    }
  });
}