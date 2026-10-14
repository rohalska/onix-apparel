import { describe, it, expect } from 'vitest';
// @ts-expect-error -- '../../server/proxy.mjs' has no declaration file
import { injectFullStoryConfig, describeFullStoryConfig } from '../../server/proxy.mjs';

const html = '<html><head><title>t</title></head><body></body></html>';

describe('injectFullStoryConfig', () => {
  it('leaves the page alone when no org id is configured', () => {
    expect(injectFullStoryConfig(html, {})).toBe(html);
    expect(injectFullStoryConfig(html, { FULLSTORY_ORG_ID: '' })).toBe(html);
  });

  it('writes the org id and environment into the head', () => {
    const out = injectFullStoryConfig(html, {
      FULLSTORY_ORG_ID: 'o-25B85Y-na1',
      FULLSTORY_ENVIRONMENT: 'dev',
    });
    expect(out).toContain(
      '<script>window.__FULLSTORY__={"orgId":"o-25B85Y-na1","environment":"dev"}</script></head>',
    );
  });

  it('omits the environment when it is not set', () => {
    const out = injectFullStoryConfig(html, { FULLSTORY_ORG_ID: 'o-25B85Y-na1' });
    expect(out).toContain('window.__FULLSTORY__={"orgId":"o-25B85Y-na1"}');
  });

  // The value lands inside an inline script, so anything that is not shaped
  // like an org id is refused rather than escaped.
  it.each(['o-1</script><script>alert(1)', 'not an id', 'o-"x"-na1'])(
    'refuses a malformed org id: %s',
    (orgId) => {
      expect(injectFullStoryConfig(html, { FULLSTORY_ORG_ID: orgId })).toBe(html);
    },
  );

  it('drops a malformed environment but keeps recording', () => {
    const out = injectFullStoryConfig(html, {
      FULLSTORY_ORG_ID: 'o-25B85Y-na1',
      FULLSTORY_ENVIRONMENT: '</script>',
    });
    expect(out).toContain('window.__FULLSTORY__={"orgId":"o-25B85Y-na1"}');
  });

  it('leaves a page with no head alone', () => {
    const page = '<html><body></body></html>';
    expect(injectFullStoryConfig(page, { FULLSTORY_ORG_ID: 'o-25B85Y-na1' })).toBe(page);
  });
});

// A refused value and an unset one both end in no sessions, which looks the
// same as FullStory blocking the domain. The startup log tells them apart.
describe('describeFullStoryConfig', () => {
  it('reports capture off when unset', () => {
    expect(describeFullStoryConfig({})).toBe('FullStory capture off: FULLSTORY_ORG_ID is not set');
  });

  it('reports a refused org id', () => {
    expect(describeFullStoryConfig({ FULLSTORY_ORG_ID: 'bad id' })).toBe(
      'FullStory capture off: FULLSTORY_ORG_ID is not a valid org id',
    );
  });

  it('reports capture on with its environment', () => {
    expect(
      describeFullStoryConfig({ FULLSTORY_ORG_ID: 'o-25B85Y-na1', FULLSTORY_ENVIRONMENT: 'prd' }),
    ).toBe('FullStory capture on: org o-25B85Y-na1, environment prd');
  });

  it('reports a refused environment', () => {
    expect(
      describeFullStoryConfig({ FULLSTORY_ORG_ID: 'o-25B85Y-na1', FULLSTORY_ENVIRONMENT: 'Dev' }),
    ).toBe('FullStory capture on: org o-25B85Y-na1, environment refused (Dev)');
  });
});
