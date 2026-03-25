// environment.prod.ts – Production environment configuration
// Angular CLI substitutes this file for environment.ts during a production
// build. Tree-shaking then removes development-only code paths that check
// environment.production.

export const environment = {
  production: true,
  apiUrl: 'http://localhost:3000/api',
};