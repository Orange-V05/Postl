import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { server } from '../mocks/server';
import GeneratePost from './GeneratePost';
import { AuthContext } from '../context/AuthContext';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock react-datepicker
vi.mock('react-datepicker', () => ({
  default: function MockDatePicker({ onChange, selected, ...props }: any) {
    return (
      <input
        {...props}
        type="datetime-local"
        value={selected ? selected.toISOString().slice(0, 16) : ''}
        onChange={(e) => onChange(new Date(e.target.value))}
      />
    );
  },
}));

// Mock firebase
vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

// Mock useStore
vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

const mockAuth = {
  user: { uid: 'test-user-id' },
  login: vi.fn(),
  logout: vi.fn(),
};

const mockStore = {
  prefs: {
    aiModel: 'cloud' as const,
    tone: 'professional' as const,
    creativity: 0.7,
    fontSize: 32,
  },
  setPrefs: vi.fn(),
};

describe('GeneratePost', () => {
  beforeAll(() => server.listen());
  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
    (require('../store/useStore').useStore as vi.Mock).mockReturnValue(mockStore);
  });
  afterAll(() => server.close());

  const renderComponent = () =>
    render(
      <AuthContext.Provider value={mockAuth}>
        <GeneratePost />
      </AuthContext.Provider>
    );

  it('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText('GENERATE MAGIC')).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = renderComponent();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('updates prompt on input change', async () => {
    const user = userEvent.setup();
    renderComponent();

    const textarea = screen.getByPlaceholderText(/e.g. A motivational post/);
    await user.type(textarea, 'Test prompt');

    expect(textarea).toHaveValue('Test prompt');
  });

  it('selects category on button click', async () => {
    const user = userEvent.setup();
    renderComponent();

    const categoryButton = screen.getByRole('button', { name: /tech/i });
    await user.click(categoryButton);

    expect(categoryButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles AI model', async () => {
    const user = userEvent.setup();
    renderComponent();

    const localButton = screen.getByRole('button', { name: /Local \(GPT-2\)/i });
    await user.click(localButton);

    expect(mockStore.setPrefs).toHaveBeenCalledWith({ aiModel: 'local' });
  });

  it('enables scheduling when checkbox is checked', async () => {
    const user = userEvent.setup();
    renderComponent();

    const checkbox = screen.getByRole('checkbox', { name: /Schedule Post/i });
    await user.click(checkbox);

    expect(screen.getByPlaceholderText('Select date and time')).toBeInTheDocument();
  });

  it('disables generate button when prompt is empty', () => {
    renderComponent();

    const generateButton = screen.getByRole('button', { name: /Generate post/i });
    expect(generateButton).toBeDisabled();
  });

  it('generates post on button click', async () => {
    const user = userEvent.setup();
    renderComponent();

    const textarea = screen.getByPlaceholderText(/e.g. A motivational post/);
    await user.type(textarea, 'Test prompt');

    const generateButton = screen.getByRole('button', { name: /Generate post/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('AI GENERATION')).toBeInTheDocument();
    });
  });

  it('copies text to clipboard', async () => {
    const user = userEvent.setup();
    renderComponent();

    // First generate a post
    const textarea = screen.getByPlaceholderText(/e.g. A motivational post/);
    await user.type(textarea, 'Test prompt');
    const generateButton = screen.getByRole('button', { name: /Generate post/i });
    await user.click(generateButton);

    await waitFor(() => {
      const copyButton = screen.getByRole('button', { name: /Copy post to clipboard/i });
      return copyButton;
    });

    const copyButton = screen.getByRole('button', { name: /Copy post to clipboard/i });
    await user.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test generated content');
  });
});