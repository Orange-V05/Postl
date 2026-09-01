import { render, screen, waitFor } from '@testing-library/react';
import ModelSelector from './ModelSelector';
import { getModels } from '../../api/client';

vi.mock('../../api/client', () => ({

  getModels: vi.fn(),
}));

const mockedGetModels = vi.mocked(getModels);

describe('ModelSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders backend cloud models and replaces stale local selection', async () => {
    const setSelectedModel = vi.fn();
    mockedGetModels.mockResolvedValue({
      models: [{ id: 'balanced-cloud', label: 'Balanced Cloud', capabilities: ['generation'], local: false, privacy: 'cloud' }],
      platforms: {},
      objectives: [],
      tones: [],
    });

    render(<ModelSelector selectedModel="local-gemma" setSelectedModel={setSelectedModel} />);

    expect(await screen.findByText('Balanced Cloud')).toBeInTheDocument();
    await waitFor(() => expect(setSelectedModel).toHaveBeenCalledWith('balanced-cloud'));
    expect(screen.queryByText(/Local Ollama/i)).not.toBeInTheDocument();
  });

  it('shows no-models state without injecting Ollama fallback', async () => {
    mockedGetModels.mockResolvedValue({ models: [], platforms: {}, objectives: [], tones: [] });

    render(<ModelSelector selectedModel="balanced-cloud" setSelectedModel={vi.fn()} />);

    expect(await screen.findByText(/No AI models are enabled/i)).toBeInTheDocument();
    expect(screen.queryByText(/Local Ollama/i)).not.toBeInTheDocument();
  });

  it('shows backend-offline state without stale fallback models', async () => {
    mockedGetModels.mockRejectedValue(new Error('backend offline'));

    render(<ModelSelector selectedModel="local-gemma" setSelectedModel={vi.fn()} />);

    expect((await screen.findAllByText(/backend offline/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Local Ollama/i)).not.toBeInTheDocument();
  });
});
