// app.component.ts – Root component: renders the nav bar and the router outlet

import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  /** Application title displayed in the navbar brand */
  readonly title = 'Golf Tracker';
}