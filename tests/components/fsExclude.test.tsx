// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutModal } from '../../src/components/CheckoutModal';
import { ContactClientServices } from '../../src/components/CustomerCare/ContactClientServices';
import { TrackOrder } from '../../src/components/CustomerCare/TrackOrder';
import { renderWithProviders } from '../setup.components';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// FullStory records page text and inputs unless an element, or one of its
// ancestors, carries fs-exclude. The markers are plain class names, so a
// className cleanup could drop one without anything else noticing.
function expectExcluded(el: Element | null) {
  expect(el, 'element not found').not.toBeNull();
  expect(el!.closest('.fs-exclude'), el!.outerHTML).not.toBeNull();
}

function expectEveryFieldExcluded(container: HTMLElement) {
  const fields = container.querySelectorAll('input, textarea');
  expect(fields.length).toBeGreaterThan(0);
  fields.forEach(expectExcluded);
}

describe('session replay exclusions', () => {
  it('excludes checkout fields and the details the confirmation repeats', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<CheckoutModal isOpen onClose={vi.fn()} />);

    expectEveryFieldExcluded(container);
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));
    expectEveryFieldExcluded(container);
    await user.click(screen.getByRole('button', { name: /simulate demo payment/i }));

    expectExcluded(screen.getByText(/thank you, jane/i));
    expectExcluded(screen.getByText('jane.doe@example.com'));
    expectExcluded(screen.getByText(/742 evergreen terrace/i));
  });

  it('excludes contact fields and the name and email the confirmation repeats', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ContactClientServices />);

    expectEveryFieldExcluded(container);
    await user.type(screen.getByPlaceholderText('Tiffany Valentina'), 'Ada Lovelace');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'ada@example.com');
    await user.type(screen.getByPlaceholderText(/how may our advisors/i), 'Hello');
    await user.click(screen.getByRole('button', { name: /submit message/i }));

    expectExcluded(screen.getByText('Ada Lovelace'));
    expectExcluded(screen.getByText('ada@example.com'));
  });

  it('excludes the track order fields', () => {
    const { container } = renderWithProviders(<TrackOrder />);
    expectEveryFieldExcluded(container);
  });
});
