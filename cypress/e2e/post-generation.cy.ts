describe('Post Generation Workflow', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
    cy.visit('/dashboard');
  });

  it('should generate a post', () => {
    cy.get('textarea').type('A motivational post about perseverance');
    cy.get('button').contains('GENERATE MAGIC').click();
    cy.contains('AI GENERATION').should('be.visible');
    cy.contains('Motivational').should('be.visible');
  });

  it('should schedule a post', () => {
    cy.get('textarea').type('Tech post about AI');
    cy.get('input[type=checkbox]').check();
    cy.get('input[type=datetime-local]').type('2026-03-29T10:00');
    cy.get('button').contains('GENERATE MAGIC').click();
    cy.contains('Scheduled').should('be.visible');
  });

  it('should copy generated post', () => {
    cy.get('textarea').type('Test post');
    cy.get('button').contains('GENERATE MAGIC').click();
    cy.get('button[aria-label*="Copy post"]').click();
    cy.contains('COPIED').should('be.visible');
  });
});