// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { ConciergeChatModal } from '../../src/components/ConciergeChatModal';
import { renderWithProviders } from '../setup.components';

describe('ConciergeChatModal Integration Readiness Panel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders simulation mode status with blue checkmark and dynamic item count', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        mode: 'mock',
        itemCount: 24,
      }),
    } as Response);

    renderWithProviders(<ConciergeChatModal />);

    // Open modal
    const openButton = screen.getByLabelText(/open ai shopping assistant/i);
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Local Simulation Mode active with 24 indexed items./i),
      ).toBeInTheDocument();
    });

    const checkIcon = screen
      .getByText(/Local Simulation Mode active with 24 indexed items./i)
      .parentElement?.parentElement?.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
    expect(checkIcon?.getAttribute('class')).toContain('text-blue-500');
  });

  it('renders live mode status with emerald checkmark', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        mode: 'live',
        itemCount: 24,
      }),
    } as Response);

    renderWithProviders(<ConciergeChatModal />);

    const openButton = screen.getByLabelText(/open ai shopping assistant/i);
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Connected to Google Cloud Retail API \(Live Mode\)\./i),
      ).toBeInTheDocument();
    });

    const checkIcon = screen
      .getByText(/Connected to Google Cloud Retail API \(Live Mode\)\./i)
      .parentElement?.parentElement?.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
    expect(checkIcon?.getAttribute('class')).toContain('text-emerald-500');
  });

  it('renders offline fallback status with amber clock icon when probe fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error or timeout'));

    renderWithProviders(<ConciergeChatModal />);

    const openButton = screen.getByLabelText(/open ai shopping assistant/i);
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByText(/Offline fallback catalog active\./i)).toBeInTheDocument();
    });

    const clockIcon = screen
      .getByText(/Offline fallback catalog active\./i)
      .parentElement?.parentElement?.querySelector('svg');
    expect(clockIcon).toBeInTheDocument();
    expect(clockIcon?.getAttribute('class')).toContain('text-amber-500');
  });

  it('does not set offline state when modal is closed before health probe completes', async () => {
    let rejectPromise: ((reason?: unknown) => void) | null = null;
    const pendingPromise = new Promise((_, reject) => {
      rejectPromise = reject;
    });

    global.fetch = vi.fn().mockImplementation(() => pendingPromise);

    renderWithProviders(<ConciergeChatModal />);

    const openButton = screen.getByLabelText(/open ai shopping assistant/i);
    fireEvent.click(openButton);

    // Initial state is loading
    expect(screen.getByText(/Checking retail service status\.\.\./i)).toBeInTheDocument();

    // User closes the modal before the probe resolves
    const closeButton = screen.getByLabelText(/close assistant modal/i);
    fireEvent.click(closeButton);

    // Abort rejection occurs after modal was closed
    if (rejectPromise) {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (rejectPromise as (err: Error) => void)(abortError);
    }

    // Re-open modal with an immediately succeeding mock response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', mode: 'mock', itemCount: 24 }),
    } as Response);

    const reopenButton = screen.getByLabelText(/open ai shopping assistant/i);
    fireEvent.click(reopenButton);

    // Should immediately show loading, NOT stale offline state
    expect(screen.queryByText(/Offline fallback catalog active\./i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/Local Simulation Mode active with 24 indexed items\./i),
      ).toBeInTheDocument();
    });
  });

  it('displays dynamic live item count and dynamic department count in multi-department row', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        mode: 'mock',
        itemCount: 42,
      }),
    } as Response);

    renderWithProviders(<ConciergeChatModal />);

    const openButton = screen.getByLabelText(/open ai shopping assistant/i);
    fireEvent.click(openButton);

    await waitFor(() => {
      // 42 items dynamically displayed, across 8 departments (computed dynamically from FALLBACK_PRODUCTS)
      expect(
        screen.getByText(/42 curated products across 8 departments ready for semantic queries\./i),
      ).toBeInTheDocument();
    });
  });

  it('detects window.onixStore when mounted asynchronously after modal is opened', async () => {
    delete (window as unknown as { onixStore?: unknown }).onixStore;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', mode: 'mock', itemCount: 24 }),
    } as Response);

    renderWithProviders(<ConciergeChatModal />);

    const openButton = screen.getByLabelText(/open ai shopping assistant/i);
    fireEvent.click(openButton);

    // Initially awaiting window.onixStore mount
    await waitFor(() => {
      expect(screen.getByText(/Awaiting window\.onixStore mount\.\.\./i)).toBeInTheDocument();
    });

    // Simulate async mounting of window.onixStore
    (window as unknown as { onixStore?: unknown }).onixStore = {
      dispatch: vi.fn(),
      subscribe: vi.fn(),
      subscribeOutcomes: vi.fn(),
      version: '1.1.0',
      help: vi.fn(),
    };

    // The polling interval in useEffect should detect window.onixStore and update busReady to true
    await waitFor(
      () => {
        expect(
          screen.getByText(/Active & listening on window\.onixStore for A2A actions\./i),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('detects window.onixStore immediately when Retry button is clicked', async () => {
    delete (window as unknown as { onixStore?: unknown }).onixStore;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', mode: 'mock', itemCount: 24 }),
    } as Response);

    renderWithProviders(<ConciergeChatModal />);

    const openButton = screen.getByLabelText(/open ai shopping assistant/i);
    fireEvent.click(openButton);

    const retryButton = await screen.findByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Mount onixStore
    (window as unknown as { onixStore?: unknown }).onixStore = {
      dispatch: vi.fn(),
      subscribe: vi.fn(),
      subscribeOutcomes: vi.fn(),
      version: '1.1.0',
      help: vi.fn(),
    };

    fireEvent.click(retryButton);

    expect(
      screen.getByText(/Active & listening on window\.onixStore for A2A actions\./i),
    ).toBeInTheDocument();
  });

  it('detects window.onixStore immediately upon receiving onix:store-ready event', async () => {
    delete (window as unknown as { onixStore?: unknown }).onixStore;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', mode: 'mock', itemCount: 24 }),
    } as Response);

    renderWithProviders(<ConciergeChatModal />);

    const openButton = screen.getByLabelText(/open ai shopping assistant/i);
    fireEvent.click(openButton);

    await screen.findByRole('button', { name: /retry/i });

    // Mount onixStore and dispatch event
    (window as unknown as { onixStore?: unknown }).onixStore = {
      dispatch: vi.fn(),
      subscribe: vi.fn(),
      subscribeOutcomes: vi.fn(),
      version: '1.1.0',
      help: vi.fn(),
    };

    window.dispatchEvent(new CustomEvent('onix:store-ready'));

    await waitFor(() => {
      expect(
        screen.getByText(/Active & listening on window\.onixStore for A2A actions\./i),
      ).toBeInTheDocument();
    });
  });
});
