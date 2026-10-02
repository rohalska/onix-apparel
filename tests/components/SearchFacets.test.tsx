// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppContent from '../../src/AppContent';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { renderWithProviders } from '../setup.components';

describe('ErrorBoundary', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    renderWithProviders(
      <ErrorBoundary>
        <div>Normal Content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('catches render errors and renders friendly fallback instead of blank white page', () => {
    const CrashingComponent = () => {
      throw new Error('Test render crash');
    };

    renderWithProviders(
      <ErrorBoundary>
        <CrashingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected error occurred while loading this page/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Return to Store/i })).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const CrashingComponent = () => {
      throw new Error('Custom crash');
    };

    renderWithProviders(
      <ErrorBoundary fallback={<div>Custom Error View</div>}>
        <CrashingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom Error View')).toBeInTheDocument();
  });
});

describe('Search and Facet Rendering Defenses', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('does not crash or turn into blank white page when Vertex AI Retail returns facets with missing values', async () => {
    // Vertex AI Retail Search in live mode omits `values` array when empty:
    // e.g. [{"key": "categories"}, {"key": "attributes.sizes"}, {"key": "attributes.colors"}]
    const mockSearchResponse = {
      source: 'vertex-ai-live',
      appliedSort: 'featured',
      totalSize: 0,
      correctedQuery: null,
      facets: [{ key: 'categories' }, { key: 'attributes.sizes' }, { key: 'attributes.colors' }],
      products: [],
    };

    const mockHealthResponse = {
      mode: 'live',
      project: 'test-project',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/health')) {
          return {
            ok: true,
            json: async () => mockHealthResponse,
          };
        }
        if (url.includes('/api/search')) {
          return {
            ok: true,
            json: async () => mockSearchResponse,
          };
        }
        return {
          ok: true,
          json: async () => [],
        };
      }),
    );

    renderWithProviders(
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>,
    );

    // Initial load should render search input
    const searchInputs = await screen.findAllByPlaceholderText(
      /search jackets, shirts, jewelry\.\.\./i,
    );
    const searchInput = searchInputs[0];
    expect(searchInput).toBeInTheDocument();

    // Type a query in search bar to trigger search and facet evaluation
    await act(async () => {
      await userEvent.type(searchInput, 'jacket');
    });

    // Wait for debounced search and ensure the page is NOT blank and did NOT crash
    await waitFor(() => {
      // The search input is still in the document
      expect(searchInput).toBeInTheDocument();
      // Should show empty state without throwing TypeError: Cannot read properties of undefined (reading 'slice')
      expect(screen.getByText(/No matching pieces found/i)).toBeInTheDocument();
    });

    // Verify ErrorBoundary did not catch any error
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('renders facet buttons properly when facet values are provided', async () => {
    const mockSearchResponse = {
      source: 'vertex-ai-live',
      appliedSort: 'featured',
      totalSize: 1,
      correctedQuery: null,
      facets: [
        {
          key: 'attributes.sizes',
          values: [
            { value: 'M', count: 3 },
            { value: 'L', count: 2 },
          ],
        },
        {
          key: 'attributes.colors',
          values: [{ value: 'Black', count: 5 }],
        },
      ],
      products: [
        {
          id: 1,
          title: 'Field Jacket',
          price: 199,
          description: 'Waxed jacket',
          category: "men's clothing",
          image: 'https://example.com/j.jpg',
          rating: { rate: 4.5, count: 10 },
          sizes: ['M', 'L'],
          colors: [{ name: 'Black', hex: '#000000' }],
          inStock: true,
        },
      ],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/health')) {
          return {
            ok: true,
            json: async () => ({ mode: 'live', project: 'test-project' }),
          };
        }
        if (url.includes('/api/search')) {
          return {
            ok: true,
            json: async () => mockSearchResponse,
          };
        }
        return {
          ok: true,
          json: async () => [],
        };
      }),
    );

    renderWithProviders(
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>,
    );

    const searchInputs = await screen.findAllByPlaceholderText(
      /search jackets, shirts, jewelry\.\.\./i,
    );
    const searchInput = searchInputs[0];

    await act(async () => {
      await userEvent.type(searchInput, 'jacket');
    });

    await waitFor(() => {
      expect(screen.getByText('Size M (3)')).toBeInTheDocument();
      expect(screen.getByText('Size L (2)')).toBeInTheDocument();
      expect(screen.getByText('Black (5)')).toBeInTheDocument();
    });
  });
});
