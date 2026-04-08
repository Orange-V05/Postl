import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AuthProvider, AuthContext } from './AuthContext';

// Mock firebase auth
vi.mock('../firebase', () => ({
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

const { onAuthStateChanged, signInWithEmailAndPassword, signOut } = require('firebase/auth');

const { onAuthStateChanged, signInWithEmailAndPassword, signOut } = require('firebase/auth');

describe('AuthProvider', () => {
  let mockUnsubscribe: vi.Mock;

  beforeEach(() => {
    mockUnsubscribe = vi.fn();
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null); // Initially no user
      return mockUnsubscribe;
    });
    vi.clearAllMocks();
  });

  const TestComponent = () => {
    const auth = React.useContext(AuthContext);
    return (
      <div>
        <div data-testid="user">{auth?.user ? 'logged in' : 'not logged in'}</div>
        <div data-testid="loading">{auth?.loading ? 'loading' : 'not loading'}</div>
        <button onClick={() => auth?.login('test@example.com', 'password')}>Login</button>
        <button onClick={() => auth?.logout()}>Logout</button>
      </div>
    );
  };

  const renderComponent = () =>
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

  it('renders without crashing', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not loading');
    });
  });

  it('provides initial loading state', () => {
    onAuthStateChanged.mockImplementationOnce((auth, callback) => {
      // Don't call callback immediately to simulate loading
      return mockUnsubscribe;
    });

    renderComponent();
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
  });

  it('updates user state on auth change', async () => {
    const mockUser = { uid: 'test-user' };
    onAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(mockUser), 0);
      return mockUnsubscribe;
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('logged in');
    });
  });

  it('calls login function', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not loading');
    });

    const loginButton = screen.getByRole('button', { name: 'Login' });
    await user.click(loginButton);

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'test@example.com',
      'password'
    );
  });

  it('calls logout function', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not loading');
    });

    const logoutButton = screen.getByRole('button', { name: 'Logout' });
    await user.click(logoutButton);

    expect(signOut).toHaveBeenCalledWith({});
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderComponent();
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});