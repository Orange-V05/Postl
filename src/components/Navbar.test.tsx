import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import Navbar from './Navbar';
import { AuthContext } from '../context/AuthContext';

vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' }),
}));

const mockAuth = {
  user: { uid: 'test-user' },
  logout: vi.fn(),
};

const mockStore = {
  prefs: { darkMode: false },
  setPrefs: jest.fn(),
};

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (require('../store/useStore').useStore as vi.Mock).mockReturnValue(mockStore);
  });

  const renderComponent = (authValue = mockAuth) =>
    render(
      <MemoryRouter>
        <AuthContext.Provider value={authValue}>
          <Navbar />
        </AuthContext.Provider>
      </MemoryRouter>
    );

  it('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText('POSTL')).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = renderComponent();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows login and signup when no user', () => {
    renderComponent({ user: null, logout: jest.fn() });
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Join')).toBeInTheDocument();
  });

  it('shows dashboard and logout when user is logged in', () => {
    renderComponent();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('toggles dark mode', async () => {
    const user = userEvent.setup();
    renderComponent();

    const toggleButton = screen.getByRole('button', { name: /Switch to dark mode/i });
    await user.click(toggleButton);

    expect(mockStore.setPrefs).toHaveBeenCalledWith({ darkMode: true });
  });

  it('logs out user', async () => {
    const user = userEvent.setup();
    renderComponent();

    const logoutButton = screen.getByRole('button', { name: 'Logout' });
    await user.click(logoutButton);

    expect(mockAuth.logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('navigates to home on logo click', async () => {
    const user = userEvent.setup();
    renderComponent();

    const logoLink = screen.getByRole('link', { name: 'POSTL Home' });
    await user.click(logoLink);

    expect(logoLink).toHaveAttribute('href', '/');
  });
});