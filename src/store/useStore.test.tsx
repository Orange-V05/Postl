import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { normalizeModelPreference, useStore } from './useStore';

const TestComponent = () => {
  const { prefs, setPrefs, resetPrefs, addRecentPrompt, recentPrompts, usageStats, incrementUsage } = useStore();
  return (
    <div>
      <div data-testid="selectedModel">{prefs.selectedModel}</div>
      <div data-testid="creativity">{prefs.creativity}</div>
      <div data-testid="recent">{recentPrompts.join('|')}</div>
      <div data-testid="total">{usageStats.totalGenerations}</div>
      <button onClick={() => setPrefs({ selectedModel: 'balanced-cloud' })}>Set Model</button>
      <button onClick={() => setPrefs({ creativity: 0.8 })}>Set Creativity</button>
      <button onClick={() => addRecentPrompt('Brief one')}>Add Prompt</button>
      <button onClick={() => incrementUsage('twitter', 'bold')}>Use</button>
      <button onClick={resetPrefs}>Reset</button>
    </div>
  );
};

describe('useStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.persist.clearStorage();
    useStore.setState({ prefs: { selectedModel: 'balanced-cloud', creativity: 0.7, tone: 'professional', fontSize: 28, darkMode: true }, recentPrompts: [], usageStats: { totalGenerations: 0, platformCounts: {}, toneCounts: {}, lastGeneratedAt: null } });
  });

  it('provides current default preferences', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('selectedModel')).toHaveTextContent('balanced-cloud');
    expect(screen.getByTestId('creativity')).toHaveTextContent('0.7');
  });

  it('updates preferences and recent prompts', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    await user.click(screen.getByRole('button', { name: 'Set Model' }));
    await user.click(screen.getByRole('button', { name: 'Set Creativity' }));
    await user.click(screen.getByRole('button', { name: 'Add Prompt' }));
    expect(screen.getByTestId('selectedModel')).toHaveTextContent('balanced-cloud');
    expect(screen.getByTestId('creativity')).toHaveTextContent('0.8');
    expect(screen.getByTestId('recent')).toHaveTextContent('Brief one');
  });

  it('tracks usage stats', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);
    await user.click(screen.getByRole('button', { name: 'Use' }));
    expect(screen.getByTestId('total')).toHaveTextContent('1');
  });

  it('migrates obsolete model ids to balanced-cloud', () => {
    expect(normalizeModelPreference('local-gemma')).toBe('balanced-cloud');
    expect(normalizeModelPreference('google/gemma-3-27b-it:free')).toBe('balanced-cloud');
    expect(normalizeModelPreference('future-friendly-model')).toBe('future-friendly-model');
  });
});
