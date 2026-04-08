import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from './useStore';

const TestComponent = () => {
  const { prefs, setPrefs, resetPrefs } = useStore();

  return (
    <div>
      <div data-testid="aiModel">{prefs.aiModel}</div>
      <div data-testid="creativity">{prefs.creativity}</div>
      <button onClick={() => setPrefs({ aiModel: 'cloud' })}>Set AI Model</button>
      <button onClick={() => setPrefs({ creativity: 0.8 })}>Set Creativity</button>
      <button onClick={resetPrefs}>Reset</button>
    </div>
  );
};

describe('useStore', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
  });

  it('provides default preferences', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('aiModel')).toHaveTextContent('local');
    expect(screen.getByTestId('creativity')).toHaveTextContent('0.7');
  });

  it('updates preferences', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    const setModelButton = screen.getByRole('button', { name: 'Set AI Model' });
    await user.click(setModelButton);

    expect(screen.getByTestId('aiModel')).toHaveTextContent('cloud');

    const setCreativityButton = screen.getByRole('button', { name: 'Set Creativity' });
    await user.click(setCreativityButton);

    expect(screen.getByTestId('creativity')).toHaveTextContent('0.8');
  });

  it('resets preferences', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    // Change some prefs
    const setModelButton = screen.getByRole('button', { name: 'Set AI Model' });
    await user.click(setModelButton);

    const resetButton = screen.getByRole('button', { name: 'Reset' });
    await user.click(resetButton);

    expect(screen.getByTestId('aiModel')).toHaveTextContent('local');
  });

  it('persists preferences to localStorage', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TestComponent />);

    const setModelButton = screen.getByRole('button', { name: 'Set AI Model' });
    await user.click(setModelButton);

    unmount();

    // Re-render
    render(<TestComponent />);
    expect(screen.getByTestId('aiModel')).toHaveTextContent('cloud');
  });
});