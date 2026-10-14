// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const consent = vi.hoisted(() => ({
  isConsentManaged: vi.fn(),
  openConsentPreferences: vi.fn(),
}));
vi.mock('../../src/services/consent', () => consent);

import { Footer } from '../../src/components/Footer';

beforeEach(() => {
  consent.isConsentManaged.mockReset();
  consent.openConsentPreferences.mockReset();
});

describe('Footer cookie preferences', () => {
  it('reopens the consent choice when capture is configured', async () => {
    consent.isConsentManaged.mockReturnValue(true);
    render(<Footer />);
    await userEvent.click(screen.getByRole('button', { name: /cookie preferences/i }));
    expect(consent.openConsentPreferences).toHaveBeenCalledOnce();
  });

  it('is absent when there is nothing to consent to', () => {
    consent.isConsentManaged.mockReturnValue(false);
    render(<Footer />);
    expect(screen.queryByRole('button', { name: /cookie preferences/i })).toBeNull();
  });
});
