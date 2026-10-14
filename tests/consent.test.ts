import { describe, it, expect, vi, beforeEach } from 'vitest';

const cc = vi.hoisted(() => ({
  run: vi.fn(),
  acceptedCategory: vi.fn(),
  showPreferences: vi.fn(),
}));
vi.mock('vanilla-cookieconsent', () => cc);
vi.mock('vanilla-cookieconsent/dist/cookieconsent.css', () => ({}));

import {
  initConsent,
  isConsentManaged,
  openConsentPreferences,
  CONSENT_TTL_DAYS,
  CONSENT_REVISION,
} from '../src/services/consent';

beforeEach(() => {
  cc.run.mockReset();
  cc.acceptedCategory.mockReset();
  cc.showPreferences.mockReset();
});

function runConfig() {
  return cc.run.mock.calls[0][0];
}

describe('initConsent', () => {
  it('reports nothing managed before the banner runs', async () => {
    vi.resetModules();
    const fresh = await import('../src/services/consent');
    expect(fresh.isConsentManaged()).toBe(false);
  });

  it('asks again once the stored choice expires or the revision moves', () => {
    initConsent(vi.fn());
    expect(isConsentManaged()).toBe(true);
    const config = runConfig();
    expect(config.cookie.expiresAfterDays).toBe(CONSENT_TTL_DAYS);
    expect(config.revision).toBe(CONSENT_REVISION);
  });

  it('leaves analytics off until the visitor opts in', () => {
    initConsent(vi.fn());
    const { categories } = runConfig();
    expect(categories.necessary).toMatchObject({ enabled: true, readOnly: true });
    expect(categories.analytics.enabled).not.toBe(true);
  });

  it('clears FullStory cookies when analytics is withdrawn', () => {
    initConsent(vi.fn());
    const names = runConfig().categories.analytics.autoClear.cookies.map(
      (c: { name: RegExp }) => c.name,
    );
    expect(names.some((n: RegExp) => n.test('fs_uid'))).toBe(true);
    expect(names.some((n: RegExp) => n.test('fs_lua'))).toBe(true);
  });

  it('gives accept and reject equal weight', () => {
    initConsent(vi.fn());
    expect(runConfig().guiOptions.consentModal.equalWeightButtons).toBe(true);
  });

  it('passes the analytics choice through on every load and on change', () => {
    const onAnalytics = vi.fn();
    initConsent(onAnalytics);
    const config = runConfig();

    cc.acceptedCategory.mockReturnValue(true);
    config.onConsent({ cookie: {} });
    cc.acceptedCategory.mockReturnValue(false);
    config.onChange({ cookie: {}, changedCategories: ['analytics'], changedServices: {} });

    expect(cc.acceptedCategory).toHaveBeenCalledWith('analytics');
    expect(onAnalytics.mock.calls).toEqual([[true], [false]]);
  });

  it('opens the preferences dialog on request', () => {
    openConsentPreferences();
    expect(cc.showPreferences).toHaveBeenCalledOnce();
  });
});
