// =============================================================================
// shot-list.component.ts – Displays all recorded golf shots in a table
// =============================================================================
// This component is intentionally kept "dumb" with respect to HTTP: all API
// calls go through ShotService. The component only manages local state
// (the shots array) and user interaction (navigate to edit, confirm delete).
// =============================================================================

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { ShotService } from '../../services/shot.service';
import { Shot } from '../../models/shot.model';

@Component({
  selector: 'app-shot-list',
  templateUrl: './shot-list.component.html',
  styleUrls: ['./shot-list.component.css'],
})
export class ShotListComponent implements OnInit {
  /** The array of shots rendered in the table. Empty until the API responds. */
  shots: Shot[] = [];

  /**
   * Track whether an API call is in flight so a loading indicator can be shown
   * and to prevent duplicate submissions.
   */
  isLoading = false;

  /** Holds an error message when the API call fails, shown in the template. */
  errorMessage = '';

  constructor(
    private readonly shotService: ShotService,
    private readonly router: Router,
  ) {}

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  ngOnInit(): void {
    this.loadShots();
  }

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  /**
   * Fetch all shots from the API and populate the table.
   * Called on init and after any delete operation to keep the view in sync.
   */
  loadShots(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.shotService.getAllShots().subscribe({
      next: (shots: Shot[]) => {
        this.shots = shots;
        this.isLoading = false;
      },
      error: (err: unknown) => {
        console.error('Failed to load shots:', err);
        this.errorMessage = 'Could not load shots. Is the backend running?';
        this.isLoading = false;
      },
    });
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * Navigate to the edit form for the given shot.
   * Using the Router instead of a plain routerLink allows us to add any
   * pre-navigation logic (e.g. confirming unsaved changes) in the future.
   * @param id - The shot's primary key
   */
  editShot(id: number): void {
    void this.router.navigate(['/edit', id]);
  }

  /**
   * Ask the user to confirm, then delete the shot and reload the list.
   * A native confirm() dialog is used for simplicity. In a production app
   * this would be replaced by a modal component.
   * @param id - The shot's primary key
   */
  deleteShot(id: number): void {
    const confirmed = window.confirm(
      'Are you sure you want to delete this shot? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    this.shotService.deleteShot(id).subscribe({
      next: () => {
        // Rather than splicing the local array, reload from the server to
        // guarantee the view is always consistent with the database.
        this.loadShots();
      },
      error: (err: unknown) => {
        console.error('Failed to delete shot:', err);
        this.errorMessage = 'Failed to delete shot. Please try again.';
      },
    });
  }
}