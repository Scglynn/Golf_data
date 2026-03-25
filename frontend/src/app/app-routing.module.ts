// =============================================================================
// app-routing.module.ts – Application-level route configuration
// =============================================================================
// Routes are evaluated top-to-bottom; the wildcard (**) must come last so it
// only matches URLs that no other route claimed.
// =============================================================================

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ShotListComponent } from './components/shot-list/shot-list.component';
import { ShotFormComponent } from './components/shot-form/shot-form.component';

const routes: Routes = [
  // Default view – shows the full list of recorded shots
  { path: '', component: ShotListComponent },

  // Form for recording a brand-new shot
  { path: 'add', component: ShotFormComponent },

  // Form for editing an existing shot; :id is read by ShotFormComponent via
  // ActivatedRoute to fetch the current values and pre-populate the form.
  { path: 'edit/:id', component: ShotFormComponent },

  // Catch-all: redirect any unknown URL back to the shot list
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      // Use the default HTML5 History API (no hash in the URL).
      // Requires server-side fallback to index.html for deep links.
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}