import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeFilterValue } from '../src/utils/filterSanitizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Google Forward Deployment Engineer & Gemini Enterprise Readiness', () => {
  describe('Input Sanitization & Injection Prevention', () => {
    it('should strip injection characters (quotes, parens, brackets, semicolons)', () => {
      const maliciousInput = 'M") OR (1=1; DROP TABLE items; --';
      const clean = sanitizeFilterValue(maliciousInput);
      assert.equal(clean.includes('"'), false);
      assert.equal(clean.includes(')'), false);
      assert.equal(clean.includes('('), false);
      assert.equal(clean.includes(';'), false);
    });

    it('should preserve standard size and color inputs', () => {
      assert.equal(sanitizeFilterValue('XL'), 'XL');
      assert.equal(sanitizeFilterValue('One Size'), 'One Size');
      assert.equal(sanitizeFilterValue('Onyx Black'), 'Onyx Black');
      assert.equal(sanitizeFilterValue('Heather Grey'), 'Heather Grey');
    });

    it('should truncate excessively long filter values to 50 characters', () => {
      const longVal = 'A'.repeat(120);
      const clean = sanitizeFilterValue(longVal);
      assert.equal(clean.length, 50);
    });

    it('should handle non-string values safely without throwing', () => {
      assert.equal(sanitizeFilterValue(null as any), '');
      assert.equal(sanitizeFilterValue(undefined as any), '');
      assert.equal(sanitizeFilterValue(12345 as any), '');
    });
  });

  describe('A2A Agent Card (.well-known/agent-card.json)', () => {
    it('should exist and parse as valid JSON with required A2A fields', () => {
      const cardPath = path.resolve(rootDir, 'public', '.well-known', 'agent-card.json');
      assert.ok(fs.existsSync(cardPath), 'agent-card.json must exist in public/.well-known');

      const card = JSON.parse(fs.readFileSync(cardPath, 'utf-8'));
      assert.equal(card.protocol, 'a2a/v1');
      assert.ok(card.name, 'Agent must have a name');
      assert.ok(Array.isArray(card.tools), 'Agent card must declare tools array');

      const toolNames = card.tools.map((t: any) => t.name);
      assert.ok(toolNames.includes('search_catalog'));
      assert.ok(toolNames.includes('add_to_cart'));
      assert.ok(toolNames.includes('view_product'));
      assert.ok(toolNames.includes('navigate_collection'));
      assert.ok(toolNames.includes('get_customer_care_policy'));
    });
  });

  describe('OpenAPI 3.0 Specification (openapi.yaml)', () => {
    it('should exist and define critical commerce and agent endpoints', () => {
      const yamlPath = path.resolve(rootDir, 'openapi.yaml');
      assert.ok(fs.existsSync(yamlPath), 'openapi.yaml must exist in root directory');

      const content = fs.readFileSync(yamlPath, 'utf-8');
      assert.ok(content.includes('openapi: 3.0.3'));
      assert.ok(content.includes('/api/search:'));
      assert.ok(content.includes('/api/events:'));
      assert.ok(content.includes('/api/health:'));
      assert.ok(content.includes('SearchRequest'));
      assert.ok(content.includes('Product'));
    });
  });

  describe('Content Security Policy (CSP) in index.html', () => {
    it('should have CSP meta tag allowing Google APIs, Vertex AI, and Cloud Run origins', () => {
      const indexPath = path.resolve(rootDir, 'index.html');
      const html = fs.readFileSync(indexPath, 'utf-8');

      assert.ok(html.includes('http-equiv="Content-Security-Policy"'));
      assert.ok(html.includes('https://apis.google.com'));
      assert.ok(html.includes('https://cloud.google.com'));
      assert.ok(html.includes('https://retail.googleapis.com'));
    });
  });

  describe('Containerization & Cloud Run Manifests', () => {
    it('should have production multi-stage Dockerfile targeting port 8080', () => {
      const dockerfilePath = path.resolve(rootDir, 'Dockerfile');
      assert.ok(fs.existsSync(dockerfilePath), 'Dockerfile must exist');

      const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');
      assert.ok(dockerfile.includes('FROM node:20-alpine AS builder'));
      assert.ok(dockerfile.includes('FROM node:20-alpine AS runner'));
      assert.ok(dockerfile.includes('EXPOSE 8080'));
      assert.ok(dockerfile.includes('server/proxy.mjs'));
      // The runner stage once shipped without shared/, so proxy.mjs threw
      // ERR_MODULE_NOT_FOUND on its first import the moment the container
      // started. A grep is a stopgap, not a substitute for the image build CI
      // now runs, but it is the cheap check that would have caught that one.
      assert.ok(dockerfile.includes('shared/'), 'runner stage must copy shared/');
    });

    it('should enforce least privilege and separation of duties for IAM service accounts in runbook', () => {
      const runbookPath = path.resolve(rootDir, 'docs', 'FDE_INTEGRATION_RUNBOOK.md');
      assert.ok(fs.existsSync(runbookPath), 'FDE_INTEGRATION_RUNBOOK.md must exist');

      const runbook = fs.readFileSync(runbookPath, 'utf-8');

      // Regression check: Must not assign default compute account to SERVICE_ACCOUNT
      // (This exact variable definition existed in the unpatched runbook)
      assert.ok(
        !runbook.includes(
          'SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"',
        ),
        'Runbook must not assign the default compute engine account to SERVICE_ACCOUNT',
      );

      // Regression check: Must not bind default compute account to roles/retail.editor
      assert.ok(
        !/--member=["']serviceAccount:[^"']*compute@developer\.gserviceaccount\.com["'][^;|\n]*?--role=["']roles\/retail\.editor["']/.test(
          runbook,
        ) &&
          !/SERVICE_ACCOUNT=["'][^"']*compute@developer\.gserviceaccount\.com["'][\s\S]{1,200}--member=["']serviceAccount:\$\{SERVICE_ACCOUNT\}["'][\s\S]{1,100}--role=["']roles\/retail\.editor["']/.test(
            runbook,
          ),
        'Runbook must not grant roles/retail.editor to the default compute engine service account',
      );

      // Must not reference unset ${YOUR_PROJECT_ID} shell variable in commands (e.g. staging bucket)
      assert.ok(
        !runbook.includes('${YOUR_PROJECT_ID}'),
        'Runbook must not reference unset ${YOUR_PROJECT_ID} shell variable',
      );

      // Must document dedicated runtime service account holding a custom role
      assert.ok(
        runbook.includes('gecx-shop-run'),
        'Runbook must specify gecx-shop-run service account',
      );
      assert.ok(
        runbook.includes('retail.servingConfigs.search'),
        'Runbook must name retail.servingConfigs.search, which the runtime role grants for search queries',
      );
      assert.ok(
        runbook.includes('retail.userEvents.create'),
        'Runbook must name retail.userEvents.create, which the runtime role grants for event ingestion',
      );

      // The deploying identity needs roles/iam.serviceAccountUser on the runtime
      // account, or a deploy that sets an explicit runtime service account fails.
      // That identity is gecx-shop-deploy in the GitHub Actions release job.
      // Cloud Build used to do this and no longer does, so the runbook must not
      // send a reader back to it.
      assert.ok(
        runbook.includes('roles/iam.serviceAccountUser'),
        'Runbook must document roles/iam.serviceAccountUser, which the deploy identity needs to act as the runtime account',
      );
      assert.ok(
        runbook.includes('gecx-shop-deploy'),
        'Runbook must name gecx-shop-deploy as the deploying identity that holds roles/iam.serviceAccountUser',
      );
      assert.ok(
        !/cloud\s*build/i.test(runbook),
        'Runbook must not attribute deployment to Cloud Build; the release workflow deploys',
      );

      // Must separate deployment catalog import identity
      assert.ok(
        runbook.includes('gecx-shop-catalog'),
        'Runbook must separate catalog import to dedicated deployer service account',
      );

      // Must configure --service-account in the break-glass deployment example
      assert.ok(
        runbook.includes(
          '--service-account "gecx-shop-run@YOUR_PROJECT_ID.iam.gserviceaccount.com"',
        ),
        'Runbook break-glass deploy must specify dedicated --service-account',
      );
    });

    it('should verify that all Google Cloud APIs invoked at runtime in server/proxy.mjs match the documented least-privilege IAM roles', () => {
      const proxyPath = path.resolve(rootDir, 'server', 'proxy.mjs');
      const proxyCode = fs.readFileSync(proxyPath, 'utf-8');
      const runbookPath = path.resolve(rootDir, 'docs', 'FDE_INTEGRATION_RUNBOOK.md');
      const runbook = fs.readFileSync(runbookPath, 'utf-8');

      // 1. Scan for all external Google APIs called in proxy.mjs (excluding OAuth scope URIs)
      const googleApiRegex = /https:\/\/([a-zA-Z0-9.-]+\.googleapis\.com\/[^\s"'`]+)/g;
      const allMatches = [...proxyCode.matchAll(googleApiRegex)].map((m) => m[0]);
      const endpointMatches = allMatches.filter((url) => !url.includes('/auth/'));
      assert.ok(endpointMatches.length > 0, 'proxy.mjs must contain upstream Google API calls');

      // 2. Every endpoint must belong to retail.googleapis.com
      for (const endpoint of endpointMatches) {
        assert.ok(
          endpoint.startsWith('https://retail.googleapis.com/v2/'),
          `Unexpected runtime Google API endpoint called in proxy.mjs: ${endpoint}`,
        );
      }

      // 3. Ensure no ungranted Google API hosts are referenced at runtime
      const prohibitedApis = [
        'aiplatform.googleapis.com',
        'storage.googleapis.com',
        'compute.googleapis.com',
        'iam.googleapis.com',
      ];
      for (const prohibited of prohibitedApis) {
        assert.ok(
          !proxyCode.includes(prohibited),
          `Runtime server proxy.mjs must not invoke ${prohibited}`,
        );
      }

      // 4. Verify search and userEvents endpoints have corresponding IAM roles in runbook
      assert.ok(
        proxyCode.includes(':search') && runbook.includes('retail.servingConfigs.search'),
        'Runbook must document retail.servingConfigs.search for runtime :search endpoint in proxy.mjs',
      );
      assert.ok(
        proxyCode.includes('userEvents:write') && runbook.includes('retail.userEvents.create'),
        'Runbook must document retail.userEvents.create for runtime userEvents:write in proxy.mjs',
      );

      // 5. Verify package.json does not declare ungranted GCP client SDKs for runtime
      const pkgJsonPath = path.resolve(rootDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      const runtimeDeps = Object.keys(pkg.dependencies || {});
      const prohibitedDeps = [
        '@google-cloud/vertexai',
        '@google-cloud/storage',
        '@google-cloud/secret-manager',
      ];
      for (const dep of prohibitedDeps) {
        assert.ok(
          !runtimeDeps.includes(dep),
          `package.json runtime dependencies must not include ${dep} without corresponding IAM documentation`,
        );
      }
    });

    it('should have .dockerignore and .gcloudignore preventing upload of node_modules, .env*, and credential files', () => {
      const dockerIgnorePath = path.resolve(rootDir, '.dockerignore');
      const gcloudIgnorePath = path.resolve(rootDir, '.gcloudignore');
      const gitIgnorePath = path.resolve(rootDir, '.gitignore');
      assert.ok(fs.existsSync(dockerIgnorePath));
      assert.ok(fs.existsSync(gcloudIgnorePath));
      assert.ok(fs.existsSync(gitIgnorePath));

      const dContent = fs.readFileSync(dockerIgnorePath, 'utf-8');
      const gContent = fs.readFileSync(gcloudIgnorePath, 'utf-8');
      const gitContent = fs.readFileSync(gitIgnorePath, 'utf-8');

      // Dockerignore assertions
      assert.ok(dContent.includes('node_modules'));
      assert.ok(dContent.includes('.env*'), '.dockerignore must ignore .env*');
      assert.ok(
        dContent.includes('!.env.example'),
        '.dockerignore must have explicit exception for !.env.example',
      );
      assert.ok(
        dContent.includes('*service-account*.json'),
        '.dockerignore must ignore service-account JSON',
      );
      assert.ok(
        dContent.includes('*credentials*.json'),
        '.dockerignore must ignore credentials JSON',
      );

      // Gcloudignore assertions
      assert.ok(gContent.includes('node_modules'));
      assert.ok(gContent.includes('.env*'), '.gcloudignore must ignore .env*');
      assert.ok(
        gContent.includes('!.env.example'),
        '.gcloudignore must have explicit exception for !.env.example',
      );
      assert.ok(
        gContent.includes('*service-account*.json'),
        '.gcloudignore must ignore service-account JSON',
      );
      assert.ok(
        gContent.includes('*credentials*.json'),
        '.gcloudignore must ignore credentials JSON',
      );

      // Gitignore assertions
      assert.ok(gitContent.includes('.env*'), '.gitignore must ignore .env*');
      assert.ok(
        gitContent.includes('!.env.example'),
        '.gitignore must have explicit exception for !.env.example',
      );
      assert.ok(
        gitContent.includes('*service-account*.json'),
        '.gitignore must ignore service-account JSON',
      );

      // Verify no credential files exist in repository
      const allFiles = fs.readdirSync(rootDir);
      const credentialFiles = allFiles.filter(
        (f) =>
          f.endsWith('.json') &&
          (f.includes('service-account') || f.includes('key') || f.includes('credential')),
      );
      assert.deepEqual(
        credentialFiles,
        [],
        'No service account or credential keys may exist in repository',
      );
    });
  });

  describe('In-Memory Sliding Window Rate Limiting', () => {
    it('should allow legitimate requests and throttle excessive bursts', async () => {
      // proxy.mjs has no type declarations; suppress the implicit-any error
      // here rather than widen allowJs/checkJs project-wide for one test.
      // @ts-expect-error -- '../server/proxy.mjs' has no declaration file
      const { checkRateLimit, resetRateLimits } = await import('../server/proxy.mjs');
      resetRateLimits();
      const fakeReq = {
        headers: { 'x-forwarded-for': '198.51.100.42' },
        socket: { remoteAddress: '198.51.100.42' },
      };

      // Initial requests within the window limit should succeed
      for (let i = 0; i < 120; i++) {
        assert.equal(checkRateLimit(fakeReq), true);
      }
      // 121st request should be throttled
      assert.equal(checkRateLimit(fakeReq), false);
    });

    it('should derive client IP from trusted proxy and resist spoofed leftmost X-Forwarded-For headers', async () => {
      // @ts-expect-error -- '../server/proxy.mjs' has no declaration file
      const { checkRateLimit, getClientIp, resetRateLimits } = await import('../server/proxy.mjs');
      resetRateLimits();

      // Client attempts to spoof IP by placing attacker IPs first, with real client IP appended by proxy
      const realClientIp = '198.51.100.99';
      const reqWithSpoof = {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 198.51.100.99' },
        socket: { remoteAddress: '127.0.0.1' },
      };

      assert.equal(getClientIp(reqWithSpoof), realClientIp);

      // Rotating the spoofed leftmost header must NOT bypass the rate limit
      for (let i = 0; i < 120; i++) {
        const rotatingReq = {
          headers: { 'x-forwarded-for': `spoofed-ip-${i}.com, ${realClientIp}` },
          socket: { remoteAddress: '127.0.0.1' },
        };
        assert.equal(checkRateLimit(rotatingReq), true);
      }

      // Next request from the same real client (even with a new spoofed header) must be throttled
      const throttledReq = {
        headers: { 'x-forwarded-for': `another-spoof, ${realClientIp}` },
        socket: { remoteAddress: '127.0.0.1' },
      };
      assert.equal(checkRateLimit(throttledReq), false);
    });

    it('should strictly bound cache size to MAX_TRACKED_IPS under high IP churn', async () => {
      // prettier-ignore
      // @ts-expect-error -- '../server/proxy.mjs' has no declaration file
      const { checkRateLimit, resetRateLimits, ipRequestCounts, MAX_TRACKED_IPS } = await import('../server/proxy.mjs');
      resetRateLimits();

      // Simulate rapid incoming requests from distinct IPs exceeding MAX_TRACKED_IPS
      const totalIps = MAX_TRACKED_IPS + 50;
      for (let i = 0; i < totalIps; i++) {
        const req = {
          headers: { 'x-forwarded-for': `192.0.2.${i % 256}.${Math.floor(i / 256)}` },
          socket: { remoteAddress: '127.0.0.1' },
        };
        checkRateLimit(req);
      }

      assert.ok(
        ipRequestCounts.size <= MAX_TRACKED_IPS,
        `ipRequestCounts (${ipRequestCounts.size}) exceeded MAX_TRACKED_IPS (${MAX_TRACKED_IPS})`,
      );
    });
  });

  describe('Privacy Policy & Responsible AI Transparency', () => {
    it('should include customer care privacy policy with AI disclosures', () => {
      const privacyPath = path.resolve(
        rootDir,
        'src',
        'components',
        'CustomerCare',
        'PrivacyPolicy.tsx',
      );
      assert.ok(fs.existsSync(privacyPath), 'PrivacyPolicy.tsx component must exist');

      const content = fs.readFileSync(privacyPath, 'utf-8');
      assert.ok(content.includes('Responsible Artificial Intelligence (AI) Principles'));
      assert.ok(content.includes('Gemini'));
      assert.ok(content.includes('onix_visitor_id'));
      assert.ok(content.includes('Demonstration Showcase'));
    });
  });
});
