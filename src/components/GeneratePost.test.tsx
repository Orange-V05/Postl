import { render, screen } from '@testing-library/react';
import GeneratePost from './GeneratePost';
import { AuthContext } from '../context/AuthContext';

vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), addDoc: vi.fn(), serverTimestamp: vi.fn(() => new Date()) }));
vi.mock('../api/client', () => ({
  getModels: vi.fn(async () => ({ models: [{ id: 'local-gemma', label: 'Local Gemma', capabilities: ['generation'], local: true }], platforms: {}, objectives: [], tones: [] })),
  generatePost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {},
}));
vi.mock('../store/useStore', () => ({
  useStore: () => ({ prefs: { selectedModel: 'local-gemma', tone: 'professional', creativity: 0.7, fontSize: 28, darkMode: true }, setPrefs: vi.fn(), addRecentPrompt: vi.fn(), recentPrompts: [] }),
}));

describe('GeneratePost', () => {
  it('renders current studio controls', async () => {
    render(<AuthContext.Provider value={{ user: { uid: 'u1' } as any, loading: false, login: vi.fn(), logout: vi.fn(), getToken: vi.fn(async () => 'token') }}><GeneratePost /></AuthContext.Provider>);
    expect(await screen.findByText('AI Engine')).toBeInTheDocument();
    expect(screen.getByText('Target Platform')).toBeInTheDocument();
    expect(screen.getByText('GENERATE')).toBeInTheDocument();
  });
});
