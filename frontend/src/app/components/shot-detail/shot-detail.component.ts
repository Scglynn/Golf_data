import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ShotService } from '../../services/shot.service';
import { ClubConfigService } from '../../services/club-config.service';
import { Shot, FeedbackItem } from '../../models/shot.model';

@Component({
  selector: 'app-shot-detail',
  templateUrl: './shot-detail.component.html',
  styleUrls: ['./shot-detail.component.css'],
})
export class ShotDetailComponent implements OnInit {
  shot: Shot | null = null;
  feedbackItems: FeedbackItem[] = [];
  isLoading = false;
  errorMessage = '';
  /** Label of the club + shaft setup used, when the shot was logged against one. */
  setupLabel = '';

  private shotId!: number;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly shotService: ShotService,
    private readonly clubConfigService: ClubConfigService,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.shotId = Number(idParam);
    this.loadDetail();
  }

  loadDetail(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.shotService.getFeedback(this.shotId).subscribe({
      next: ({ shot, feedback }) => {
        this.shot = shot;
        this.feedbackItems = feedback;
        this.isLoading = false;
        this.loadSetupLabel(shot.club_config_id);
      },
      error: (err: unknown) => {
        console.error('Failed to load shot detail:', err);
        this.errorMessage = 'Could not load shot details. The shot may not exist.';
        this.isLoading = false;
      },
    });
  }

  /** Look up the setup's label so the header can show which shaft was used. */
  private loadSetupLabel(configId: number | null): void {
    if (configId === null) {
      return;
    }
    this.clubConfigService.getAll().subscribe({
      next: (configs) => {
        const config = configs.find((c) => c.id === configId);
        this.setupLabel = config ? `${config.label} (${config.shaft_flex})` : '';
      },
      error: (err: unknown) => console.error('Failed to load club setups:', err),
    });
  }

  /** Ball speed ÷ club speed, or null when club speed wasn't recorded. */
  get smashFactor(): number | null {
    if (!this.shot || !this.shot.club_speed) {
      return null;
    }
    return this.shot.ball_speed / this.shot.club_speed;
  }

  editShot(): void {
    void this.router.navigate(['/edit', this.shotId]);
  }

  goBack(): void {
    void this.router.navigate(['/']);
  }
}
