describe('Login Workflow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display login form', () => {
    cy.get('input[name=email]').should('be.visible');
    cy.get('input[name=password]').should('be.visible');
    cy.get('button[type=submit]').should('contain', 'Login');
  });

  it('should login successfully', () => {
    cy.get('input[name=email]').type('test@example.com');
    cy.get('input[name=password]').type('password123');
    cy.get('button[type=submit]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should show error on invalid credentials', () => {
    cy.get('input[name=email]').type('invalid@example.com');
    cy.get('input[name=password]').type('wrongpassword');
    cy.get('button[type=submit]').click();
    cy.contains('Invalid credentials').should('be.visible');
  });
});