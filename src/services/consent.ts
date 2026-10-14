import * as CookieConsent from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';

/**
 * How long a visitor's choice lasts before the banner asks again. The demo is
 * shown to the same people repeatedly, so a choice should not stick for the
 * library's default of six months.
 */
export const CONSENT_TTL_DAYS = 30;

/**
 * Raise this to ask every visitor again on their next visit, for example when
 * what is recorded changes. Stored choices from an older revision are void.
 */
export const CONSENT_REVISION = 1;

let managed = false;

/** True once the banner is running, which only happens when capture is configured. */
export function isConsentManaged(): boolean {
  return managed;
}

export function openConsentPreferences(): void {
  CookieConsent.showPreferences();
}

/**
 * Shows the consent banner and reports the analytics choice on every page
 * load and whenever the visitor changes it. The choice lives in a first-party
 * cookie, so no consent means no capture, including for anyone who ignores
 * the banner.
 */
export function initConsent(onAnalyticsConsent: (granted: boolean) => void): void {
  managed = true;
  const report = () => onAnalyticsConsent(CookieConsent.acceptedCategory('analytics'));

  void CookieConsent.run({
    revision: CONSENT_REVISION,
    cookie: {
      name: 'onix_consent',
      expiresAfterDays: CONSENT_TTL_DAYS,
    },
    guiOptions: {
      consentModal: {
        layout: 'box',
        position: 'bottom right',
        equalWeightButtons: true,
      },
      preferencesModal: {
        layout: 'box',
        equalWeightButtons: true,
      },
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      analytics: {
        // FullStory's first-party cookies, removed when consent is withdrawn.
        autoClear: { cookies: [{ name: /^fs_uid$/ }, { name: /^fs_lua$/ }, { name: /^fs_cid$/ }] },
      },
    },
    onConsent: report,
    onChange: report,
    language: {
      default: 'en',
      translations: {
        en: {
          consentModal: {
            title: 'Help us improve this demo',
            description:
              'With your permission we record how you use this storefront with FullStory session replay. Fields for your name, email, address and payment details are never recorded. We will ask again in 30 days. <a href="#privacy">Privacy policy</a>',
            acceptAllBtn: 'Accept',
            acceptNecessaryBtn: 'Decline',
            showPreferencesBtn: 'Preferences',
          },
          preferencesModal: {
            title: 'Cookie preferences',
            acceptAllBtn: 'Accept all',
            acceptNecessaryBtn: 'Decline all',
            savePreferencesBtn: 'Save preferences',
            closeIconLabel: 'Close',
            sections: [
              {
                title: 'Strictly necessary',
                description:
                  'Your bag, wishlist and this consent choice. The store does not work without them.',
                linkedCategory: 'necessary',
              },
              {
                title: 'Session replay',
                description:
                  'FullStory records clicks, scrolling and page content so we can see how the demo is used. Personal details you type are excluded.',
                linkedCategory: 'analytics',
              },
            ],
          },
        },
      },
    },
  });
}
