// =============================================================================
// shot-form.component.ts – Form for creating or editing a golf shot
// =============================================================================
// This single component handles both the "Add Shot" (/add) and "Edit Shot"
// (/edit/:id) routes. The presence of the :id route parameter determines which
// mode is active (isEditMode flag).
//
// Reactive forms are used instead of template-driven forms because:
//   - Validators and default values are co-located with the business logic
//   - The form model is testable without a DOM
//   - patchValue() makes pre-populating the edit form straightforward
// =============================================================================

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ShotService } from '../../services/shot.service';
import { Shot } from '../../models/shot.model';

@Component({
  selector: 'app-shot-form',
  templateUrl: './shot-form.component.html',
  styleUrls: ['./shot-form.component.css'],
})
export class ShotFormComponent implements OnInit {
  // -------------------------------------------------------------------------
  // Public state consumed by the template
  // -------------------------------------------------------------------------

  /** The reactive form group that the template binds to via [formGroup] */
  shotForm!: FormGroup;

  /** true when the route contains an :id param (edit mode), false for add mode */
  isEditMode = false;

  /**
   * Complete list of valid club names shown in the dropdown.
   * Order matches the typical bag layout from longest to shortest.
   */
  readonly clubs: string[] = [
    'Driver',
    '3-Wood',
    '5-Wood',
    '2-Iron',
    '3-Iron',
    '4-Iron',
    '5-Iron',
    '6-Iron',
    '7-Iron',
    '8-Iron',
    '9-Iron',
    'Pitching Wedge',
    'Gap Wedge',
    'Sand Wedge',
    'Lob Wedge',
    'Putter',
  ];

  // -------------------------------------------------------------------------
  // Private state
  // -------------------------------------------------------------------------

  /** Numeric id of the shot being edited; null in add mode */
  private editId: number | null = null;

  // -------------------------------------------------------------------------
  // Constructor – inject dependencies
  // -------------------------------------------------------------------------
  constructor(
    private readonly fb: FormBuilder,
    private readonly shotService: ShotService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  ngOnInit(): void {
    this.buildForm();
    this.detectEditMode();
  }

  // -------------------------------------------------------------------------
  // Form construction
  // -------------------------------------------------------------------------

  /**
   * Build the reactive form with sensible defaults and validators.
   * Validators mirror the database CHECK constraints so the user gets
   * instant feedback without needing a round-trip to the server.
   */
  private buildForm(): void {
    this.shotForm = this.fb.group({
      club: [
        '',
        [Validators.required],
      ],
      ball_speed: [
        null,
        [Validators.required, Validators.min(0), Validators.max(250)],
      ],
      launch_angle: [
        null,
        [Validators.required, Validators.min(-10), Validators.max(60)],
      ],
      back_spin: [
        null,
        [Validators.required, Validators.min(-10000), Validators.max(10000)],
      ],
      side_spin: [
        null,
        [Validators.required, Validators.min(-5000), Validators.max(5000)],
      ],
      club_path: [
        null,
        [Validators.required, Validators.min(-20), Validators.max(20)],
      ],
      carry_distance: [
        null,
        [Validators.required, Validators.min(0), Validators.max(500)],
      ],
      total_distance: [
        null,
        [Validators.required, Validators.min(0), Validators.max(600)],
      ],
    });
  }

  // -------------------------------------------------------------------------
  // Edit mode detection
  // -------------------------------------------------------------------------

  /**
   * Check the current route for an :id parameter.
   * If found, switch to edit mode and fetch the existing shot so the form
   * can be pre-populated via patchValue().
   */
  private detectEditMode(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam !== null) {
      const parsed = parseInt(idParam, 10);

      if (!isNaN(parsed)) {
        this.isEditMode = true;
        this.editId = parsed;
        this.loadShot(parsed);
      }
    }
  }

  /**
   * Fetch the shot from the API and patch the form values.
   * patchValue() is preferred over setValue() because it only updates the
   * fields that are supplied – safe even if the API adds new fields later.
   * @param id - The shot's primary key
   */
  private loadShot(id: number): void {
    this.shotService.getShotById(id).subscribe({
      next: (shot: Shot) => {
        this.shotForm.patchValue({
          club:           shot.club,
          ball_speed:     shot.ball_speed,
          launch_angle:   shot.launch_angle,
          back_spin:      shot.back_spin,
          side_spin:      shot.side_spin,
          club_path:      shot.club_path,
          carry_distance: shot.carry_distance,
          total_distance: shot.total_distance,
        });
      },
      error: (err: unknown) => {
        console.error('Failed to load shot for editing:', err);
        // Navigate away gracefully if the shot cannot be found
        void this.router.navigate(['/']);
      },
    });
  }

  // -------------------------------------------------------------------------
  // Form submission
  // -------------------------------------------------------------------------

  /**
   * Handle form submission.
   * Validates the form, then calls either createShot or updateShot depending
   * on the current mode. Navigates to the shot list on success.
   */
  onSubmit(): void {
    // Angular marks all controls as touched when we call this, revealing any
    // validation errors that were hidden because the user hadn't interacted yet.
    this.shotForm.markAllAsTouched();

    if (this.shotForm.invalid) {
      // Let the template show validation messages; do not submit.
      return;
    }

    const payload: Partial<Shot> = this.shotForm.value as Partial<Shot>;

    if (this.isEditMode && this.editId !== null) {
      this.shotService.updateShot(this.editId, payload).subscribe({
        next: () => void this.router.navigate(['/']),
        error: (err: unknown) => console.error('Failed to update shot:', err),
      });
    } else {
      this.shotService.createShot(payload).subscribe({
        next: () => void this.router.navigate(['/']),
        error: (err: unknown) => console.error('Failed to create shot:', err),
      });
    }
  }

  // -------------------------------------------------------------------------
  // Template helpers
  // -------------------------------------------------------------------------

  /**
   * Shorthand to retrieve a form control by name.
   * Used in the template to check validity and display error messages without
   * repeating `shotForm.get('fieldName')` everywhere.
   * @param name - The form control name
   */
  getControl(name: string) {
    // The non-null assertion is safe here because we only call this with
    // names that exist in the form group built by buildForm().
    return this.shotForm.get(name)!;
  }
}