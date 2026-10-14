import { init, FullStory } from '@fullstory/browser';

export interface FullStoryConfig {
  orgId?: string;
  environment?: string;
}

declare global {
  interface Window {
    __FULLSTORY__?: FullStoryConfig;
  }
}

export interface FullStoryCapture {
  /** Start, stop or resume capture to match the visitor's analytics consent. */
  setConsent(granted: boolean): void;
}

// FullStory has a separate operation for each transition: `start` only works
// once, before any capture, and resuming after `shutdown` takes `restart`.
type CaptureState = 'waiting' | 'capturing' | 'stopped';

function attempt(operation: () => void): boolean {
  // Capture must never break the store, so SDK failures are logged and dropped.
  try {
    operation();
    return true;
  } catch (error) {
    console.warn('FullStory call failed', error);
    return false;
  }
}

/**
 * The server writes window.__FULLSTORY__ into index.html when FULLSTORY_ORG_ID
 * is set on the Cloud Run service. The org id is read at runtime rather than
 * at build time because one image is built and then promoted from dev to prd,
 * so anything Vite bakes in would be the same in both. Under `npm run dev`
 * Vite serves index.html itself, nothing is injected, and capture stays off.
 *
 * The SDK loads with capture held back. Nothing is recorded until the visitor
 * consents and setConsent(true) is called.
 */
export function initFullStory(
  win: { __FULLSTORY__?: FullStoryConfig } = window,
): FullStoryCapture | null {
  const config = win.__FULLSTORY__;
  if (!config?.orgId) return null;
  const orgId = config.orgId;

  const loaded = attempt(() => {
    init({ orgId, startCaptureManually: true });
    // A page property rather than a user one. FullStory keeps the last value a
    // user property was given, so someone who opened both dev and prd would
    // carry whichever they saw last into every earlier session.
    if (config.environment) {
      FullStory('setProperties', {
        type: 'page',
        properties: { environment: config.environment },
      });
    }
  });
  if (!loaded) return null;

  let state: CaptureState = 'waiting';
  return {
    setConsent(granted) {
      if (granted && state === 'waiting') {
        if (attempt(() => FullStory('start'))) state = 'capturing';
      } else if (granted && state === 'stopped') {
        if (attempt(() => FullStory('restart'))) state = 'capturing';
      } else if (!granted && state === 'capturing') {
        if (attempt(() => FullStory('shutdown'))) state = 'stopped';
      }
    },
  };
}
