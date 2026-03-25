// main.ts – Angular application bootstrap entry point
// platformBrowserDynamic compiles the AppModule at runtime (JIT compilation).
// For a production build, Angular CLI switches to AOT (Ahead-of-Time) which
// pre-compiles templates, resulting in faster startup and smaller bundles.

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error('Bootstrap error:', err));