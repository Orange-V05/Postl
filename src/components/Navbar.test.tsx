import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { AuthContext } from '../context/AuthContext';

vi.mock('../store/useStore', () => ({
  useStore: () => ({ prefs: { darkMode: true }, setPrefs: vi.fn() }),
}));

const authValue = { user: null, loading: false, login: vi.fn(), logout: vi.fn(), getToken: vi.fn() };

describe('Navbar', () => {
  it('renders unauthenticated navigation', () => {
    render(<MemoryRouter><AuthContext.Provider value={authValue as any}><Navbar /></AuthContext.Provider></MemoryRouter>);
    expect(screen.getByText('POSTL')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Join Free')).toBeInTheDocument();
  });
});
