import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ShotService } from '../../services/shot.service';
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

  private shotId!: number;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly shotService: ShotService,
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
      },
      error: (err: unknown) => {
        console.error('Failed to load shot detail:', err);
        this.errorMessage = 'Could not load shot details. The shot may not exist.';
        this.isLoading = false;
      },
    });
  }

  editShot(): void {
    void this.router.navigate(['/edit', this.shotId]);
  }

  goBack(): void {
    void this.router.navigate(['/']);
  }
}
