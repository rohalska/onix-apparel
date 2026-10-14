import { describe, it, expect, vi, beforeEach } from 'vitest';

const { init, FullStory } = vi.hoisted(() => ({ init: vi.fn(), FullStory: vi.fn() }));
vi.mock('@fullstory/browser', () => ({ init, FullStory }));

import { initFullStory } from '../src/services/fullstory';

const config = { __FULLSTORY__: { orgId: 'o-25B85Y-na1', environment: 'prd' } };

beforeEach(() => {
  init.mockReset();
  FullStory.mockReset();
});

function captureCalls() {
  return FullStory.mock.calls.map(([op]) => op).filter((op) => op !== 'setProperties');
}

describe('initFullStory', () => {
  it('does nothing when the server injected no config', () => {
    expect(initFullStory({})).toBeNull();
    expect(init).not.toHaveBeenCalled();
  });

  it('does nothing when the config has no org id', () => {
    expect(initFullStory({ __FULLSTORY__: { environment: 'dev' } })).toBeNull();
    expect(init).not.toHaveBeenCalled();
  });

  it('loads the SDK without capturing, and tags the page with its environment', () => {
    expect(initFullStory(config)).not.toBeNull();
    expect(init).toHaveBeenCalledWith({ orgId: 'o-25B85Y-na1', startCaptureManually: true });
    expect(FullStory).toHaveBeenCalledWith('setProperties', {
      type: 'page',
      properties: { environment: 'prd' },
    });
    expect(captureCalls()).toEqual([]);
  });

  it('skips the environment tag when none was injected', () => {
    initFullStory({ __FULLSTORY__: { orgId: 'o-25B85Y-na1' } });
    expect(init).toHaveBeenCalledOnce();
    expect(FullStory).not.toHaveBeenCalled();
  });

  // Capture is a nice-to-have. If the SDK throws, the store still has to render.
  it('fails open when the SDK throws', () => {
    init.mockImplementation(() => {
      throw new Error('namespace missing');
    });
    expect(initFullStory(config)).toBeNull();
  });
});

describe('setConsent', () => {
  it('starts capture on consent, stops on withdrawal, and resumes after', () => {
    const capture = initFullStory(config)!;
    capture.setConsent(true);
    capture.setConsent(false);
    capture.setConsent(true);
    expect(captureCalls()).toEqual(['start', 'shutdown', 'restart']);
  });

  it('ignores a repeat of the current state', () => {
    const capture = initFullStory(config)!;
    capture.setConsent(false);
    capture.setConsent(true);
    capture.setConsent(true);
    expect(captureCalls()).toEqual(['start']);
  });

  it('swallows SDK errors', () => {
    const capture = initFullStory(config)!;
    FullStory.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => capture.setConsent(true)).not.toThrow();
  });
});
