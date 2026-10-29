// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShoppingAgentLauncher } from '../../src/components/ShoppingAgentLauncher';

afterEach(() => {
  delete window.googleAgent;
});

describe('ShoppingAgentLauncher', () => {
  it('opens the Google Shopping Agent', () => {
    const openChat = vi.fn();
    window.googleAgent = { openChat };

    render(<ShoppingAgentLauncher />);
    fireEvent.click(screen.getByRole('button', { name: 'Open AI Shopping Assistant' }));

    expect(openChat).toHaveBeenCalledOnce();
  });

  it('becomes available when the Google Shopping Agent loads asynchronously', async () => {
    render(<ShoppingAgentLauncher />);

    expect(screen.getByRole('button', { name: 'Loading AI Shopping Assistant' })).toBeDisabled();

    const openChat = vi.fn();
    window.googleAgent = { openChat };

    const launcher = await screen.findByRole('button', { name: 'Open AI Shopping Assistant' });
    await waitFor(() => expect(launcher).toBeEnabled());
    fireEvent.click(launcher);

    expect(openChat).toHaveBeenCalledOnce();
  });
});
