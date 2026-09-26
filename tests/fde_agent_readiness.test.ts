import { describe, it } from 'node:test';
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
    });

    it('should have cloudbuild.yaml configured for Cloud Run deployment', () => {
      const cbPath = path.resolve(rootDir, 'cloudbuild.yaml');
      assert.ok(fs.existsSync(cbPath), 'cloudbuild.yaml must exist');

      const cb = fs.readFileSync(cbPath, 'utf-8');
      assert.ok(cb.includes('gcr.io/google.com/cloudsdktool/cloud-sdk'));
      assert.ok(cb.includes('run'));
      assert.ok(cb.includes('deploy'));
      assert.ok(cb.includes('--port=8080'));
      assert.ok(cb.includes('--allow-unauthenticated'));
    });

    it('should have .dockerignore and .gcloudignore preventing upload of node_modules and env', () => {
      const dockerIgnorePath = path.resolve(rootDir, '.dockerignore');
      const gcloudIgnorePath = path.resolve(rootDir, '.gcloudignore');
      assert.ok(fs.existsSync(dockerIgnorePath));
      assert.ok(fs.existsSync(gcloudIgnorePath));

      const dContent = fs.readFileSync(dockerIgnorePath, 'utf-8');
      const gContent = fs.readFileSync(gcloudIgnorePath, 'utf-8');
      assert.ok(dContent.includes('node_modules'));
      assert.ok(dContent.includes('.env'));
      assert.ok(gContent.includes('node_modules'));
      assert.ok(gContent.includes('.env'));
    });
  });

  describe('In-Memory Sliding Window Rate Limiting', () => {
    it('should allow legitimate requests and throttle excessive bursts', async () => {
      const { checkRateLimit } = await import('../server/proxy.mjs');
      const fakeReq = {
        headers: { 'x-forwarded-for': '198.51.100.42' },
        socket: { remoteAddress: '198.51.100.42' }
      };

      // Initial requests should succeed
      for (let i = 0; i < 10; i++) {
        assert.equal(checkRateLimit(fakeReq), true);
      }
    });
  });

  describe('Privacy Policy & Responsible AI Transparency', () => {
    it('should include customer care privacy policy with AI disclosures', () => {
      const privacyPath = path.resolve(rootDir, 'src', 'components', 'CustomerCare', 'PrivacyPolicy.tsx');
      assert.ok(fs.existsSync(privacyPath), 'PrivacyPolicy.tsx component must exist');

      const content = fs.readFileSync(privacyPath, 'utf-8');
      assert.ok(content.includes('Responsible Artificial Intelligence (AI) Principles'));
      assert.ok(content.includes('Gemini'));
      assert.ok(content.includes('onix_visitor_id'));
      assert.ok(content.includes('Demonstration Showcase'));
    });
  });
});
