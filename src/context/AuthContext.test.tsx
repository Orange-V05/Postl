import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, AuthContext } from './AuthContext';

vi.mock('../firebase', () => ({ auth: { currentUser: { getIdToken: vi.fn() } }, firebaseReady: true, firebaseConfigError: '' }));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  getIdToken: vi.fn(async () => 'token-123'),
}));

const firebaseAuth = await import('firebase/auth');

describe('AuthProvider', () => {
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    unsubscribe = vi.fn();
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((_auth, callback: any) => {
      callback(null);
      return unsubscribe;
    });
    vi.clearAllMocks();
  });

  const Consumer = () => {
    const auth = React.useContext(AuthContext);
    return (
      <div>
        <div data-testid="user">{auth?.user ? 'logged in' : 'not logged in'}</div>
        <div data-testid="loading">{auth?.loading ? 'loading' : 'not loading'}</div>
        <button onClick={() => auth?.login('test@example.com', 'password')}>Login</button>
        <button onClick={() => auth?.logout()}>Logout</button>
        <button onClick={async () => screen.getByTestId('token').textContent = await auth?.getToken() || ''}>Token</button>
        <span data-testid="token" />
      </div>
    );
  };

  it('provides auth state and actions', async () => {
    const user = userEvent.setup();
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('not loading'));
    expect(screen.getByTestId('user')).toHaveTextContent('not logged in');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@example.com', 'password');
    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(firebaseAuth.signOut).toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = render(<AuthProvider><Consumer /></AuthProvider>);
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
