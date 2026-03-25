// =============================================================================
// app.module.ts – Root NgModule that wires the whole application together
// =============================================================================
// NgModules are Angular's compilation context. Everything declared here is
// available to every component in this module without additional imports.
// =============================================================================

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ShotFormComponent } from './components/shot-form/shot-form.component';
import { ShotListComponent } from './components/shot-list/shot-list.component';

@NgModule({
  declarations: [
    // All components, directives, and pipes that belong to this module.
    AppComponent,
    ShotFormComponent,
    ShotListComponent,
  ],
  imports: [
    // BrowserModule provides essential browser-specific services and directives
    // (NgIf, NgFor, async pipe, etc.). Must only be imported once in the root module.
    BrowserModule,

    // ReactiveFormsModule provides FormBuilder, FormGroup, FormControl and the
    // [formGroup] / formControlName directives used by ShotFormComponent.
    ReactiveFormsModule,

    // HttpClientModule registers the Angular HTTP client and its interceptor chain.
    // Required for ShotService to make HTTP requests.
    HttpClientModule,

    // AppRoutingModule registers the router and the application's route table.
    AppRoutingModule,
  ],
  providers: [],
  // AppComponent is the root component that Angular inserts into index.html's
  // <app-root> element when the application starts.
  bootstrap: [AppComponent],
})
export class AppModule {}