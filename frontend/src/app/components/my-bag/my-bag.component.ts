// =============================================================================
// my-bag.component.ts – Manage club + shaft setups
// =============================================================================
// Lists every setup in the bag with an inline form for adding or editing one.
// Shots can then be logged against a setup and compared on the Shaft Compare
// page.
// =============================================================================

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ClubConfigService } from '../../services/club-config.service';
import { ClubConfig } from '../../models/shot.model';
import { CLUBS } from '../../models/clubs';

@Component({
  selector: 'app-my-bag',
  templateUrl: './my-bag.component.html',
  styleUrls: ['./my-bag.component.css'],
})
export class MyBagComponent implements OnInit {
  configs: ClubConfig[] = [];
  configForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  /** Id of the setup being edited; null when adding a new one. */
  editingId: number | null = null;

  /** Putter is excluded because shaft fit isn't analysed for it. */
  readonly clubs = CLUBS.filter((c) => c !== 'Putter');
  readonly flexOptions = [
    { value: 'L', label: 'L – Ladies' },
    { value: 'A', label: 'A – Senior' },
    { value: 'R', label: 'R – Regular' },
    { value: 'S', label: 'S – Stiff' },
    { value: 'X', label: 'X – Extra Stiff' },
  ];
  readonly kickOptions = ['low', 'mid', 'high'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly clubConfigService: ClubConfigService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadConfigs();
  }

  /** Validators mirror the club_configs CHECK constraints. */
  private buildForm(): void {
    this.configForm = this.fb.group({
      club:           ['', [Validators.required]],
      label:          ['', [Validators.required, Validators.maxLength(100)]],
      shaft_flex:     ['', [Validators.required]],
      shaft_weight_g: [null, [Validators.min(20), Validators.max(150)]],
      kick_point:     [null],
      torque:         [null, [Validators.min(0), Validators.max(10)]],
      length_in:      [null, [Validators.min(30), Validators.max(48)]],
      loft:           [null, [Validators.min(0), Validators.max(70)]],
    });
  }

  loadConfigs(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.clubConfigService.getAll().subscribe({
      next: (configs: ClubConfig[]) => {
        this.configs = configs;
        this.isLoading = false;
      },
      error: (err: unknown) => {
        console.error('Failed to load club setups:', err);
        this.errorMessage = 'Could not load your bag. Is the backend running?';
        this.isLoading = false;
      },
    });
  }

  /** Fill the form with an existing setup so it can be edited. */
  startEdit(config: ClubConfig): void {
    this.editingId = config.id;
    this.configForm.patchValue(config);
  }

  cancelEdit(): void {
    this.editingId = null;
    this.configForm.reset({ club: '', label: '', shaft_flex: '' });
  }

  onSubmit(): void {
    this.configForm.markAllAsTouched();
    if (this.configForm.invalid) {
      return;
    }

    const payload = this.configForm.value as Partial<ClubConfig>;
    const request = this.editingId !== null
      ? this.clubConfigService.update(this.editingId, payload)
      : this.clubConfigService.create(payload);

    request.subscribe({
      next: () => {
        this.cancelEdit();
        this.loadConfigs();
      },
      error: (err: unknown) => {
        console.error('Failed to save club setup:', err);
        this.errorMessage = 'Failed to save setup. Please try again.';
      },
    });
  }

  deleteConfig(config: ClubConfig): void {
    const confirmed = window.confirm(
      `Delete "${config.label}"? Shots logged with it are kept but will no longer be linked to a setup.`
    );
    if (!confirmed) {
      return;
    }

    this.clubConfigService.delete(config.id).subscribe({
      next: () => {
        if (this.editingId === config.id) {
          this.cancelEdit();
        }
        this.loadConfigs();
      },
      error: (err: unknown) => {
        console.error('Failed to delete club setup:', err);
        this.errorMessage = 'Failed to delete setup. Please try again.';
      },
    });
  }

  getControl(name: string) {
    return this.configForm.get(name)!;
  }
}
