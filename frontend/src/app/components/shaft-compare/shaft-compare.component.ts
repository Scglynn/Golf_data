// =============================================================================
// shaft-compare.component.ts – Side-by-side stats for one or two club setups
// =============================================================================
// The golfer picks setup A (and optionally setup B for the same club). The
// component shows averages and spread for every shot logged with each setup,
// highlights the better value per row, and lists the shaft-fit feedback.
// =============================================================================

import { Component, OnInit } from '@angular/core';

import { ClubConfigService } from '../../services/club-config.service';
import { ClubConfig, ClubConfigStats, ClubConfigStatsResponse } from '../../models/shot.model';

/** One row of the comparison table. */
interface MetricRow {
  label: string;
  unit: string;
  key: keyof ClubConfigStats;
  /** Decimal places for DecimalPipe, e.g. '1.1-1' */
  format: string;
  /**
   * How to pick the better of two values: 'higher', 'lower', 'closerToZero',
   * or null when neither is better (e.g. launch angle depends on the club).
   */
  better: 'higher' | 'lower' | 'closerToZero' | null;
}

@Component({
  selector: 'app-shaft-compare',
  templateUrl: './shaft-compare.component.html',
  styleUrls: ['./shaft-compare.component.css'],
})
export class ShaftCompareComponent implements OnInit {
  configs: ClubConfig[] = [];
  selectedA: number | null = null;
  selectedB: number | null = null;
  results: ClubConfigStatsResponse[] = [];
  isLoading = false;
  errorMessage = '';

  readonly metrics: MetricRow[] = [
    { label: 'Shots logged',        unit: '',     key: 'shots',          format: '1.0-0', better: null },
    { label: 'Club speed',          unit: 'mph',  key: 'club_speed_avg', format: '1.1-1', better: 'higher' },
    { label: 'Club speed spread',   unit: '± mph', key: 'club_speed_sd', format: '1.1-1', better: 'lower' },
    { label: 'Smash factor',        unit: '',     key: 'smash_avg',      format: '1.2-2', better: 'higher' },
    { label: 'Ball speed',          unit: 'mph',  key: 'ball_speed_avg', format: '1.1-1', better: 'higher' },
    { label: 'Launch angle',        unit: '°',    key: 'launch_avg',     format: '1.1-1', better: null },
    { label: 'Back spin',           unit: 'rpm',  key: 'spin_avg',       format: '1.0-0', better: null },
    { label: 'Carry',               unit: 'yds',  key: 'carry_avg',      format: '1.1-1', better: 'higher' },
    { label: 'Carry spread',        unit: '± yds', key: 'carry_sd',      format: '1.1-1', better: 'lower' },
    { label: 'Average offline',     unit: 'yds',  key: 'offline_avg',    format: '1.1-1', better: 'closerToZero' },
    { label: 'Left-right spread',   unit: '± yds', key: 'offline_sd',    format: '1.1-1', better: 'lower' },
  ];

  constructor(private readonly clubConfigService: ClubConfigService) {}

  ngOnInit(): void {
    this.clubConfigService.getAll().subscribe({
      next: (configs: ClubConfig[]) => (this.configs = configs),
      error: (err: unknown) => {
        console.error('Failed to load club setups:', err);
        this.errorMessage = 'Could not load your bag. Is the backend running?';
      },
    });
  }

  /** Setup B must be the same club as setup A for a fair shaft comparison. */
  get optionsForB(): ClubConfig[] {
    const a = this.configs.find((c) => c.id === this.selectedA);
    return a ? this.configs.filter((c) => c.club === a.club && c.id !== a.id) : [];
  }

  onSelectA(): void {
    if (!this.optionsForB.some((c) => c.id === this.selectedB)) {
      this.selectedB = null;
    }
    this.loadStats();
  }

  loadStats(): void {
    const ids = [this.selectedA, this.selectedB].filter((id): id is number => id !== null);
    if (ids.length === 0) {
      this.results = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.clubConfigService.getStats(ids).subscribe({
      next: (results: ClubConfigStatsResponse[]) => {
        this.results = results;
        this.isLoading = false;
      },
      error: (err: unknown) => {
        console.error('Failed to load setup stats:', err);
        this.errorMessage = 'Could not load stats for these setups.';
        this.isLoading = false;
      },
    });
  }

  /**
   * True when result `index` has the better value for this metric. Only
   * applies when two setups are compared and both have a value.
   */
  isBetter(metric: MetricRow, index: number): boolean {
    if (this.results.length < 2 || metric.better === null) {
      return false;
    }
    const values = this.results.map((r) => r.stats[metric.key]);
    if (values.some((v) => v === null)) {
      return false;
    }
    const [a, b] = values.map((v) => {
      const n = v as number;
      return metric.better === 'closerToZero' ? -Math.abs(n) : metric.better === 'lower' ? -n : n;
    });
    if (a === b) {
      return false;
    }
    return index === 0 ? a > b : b > a;
  }
}
