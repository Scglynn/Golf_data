// =============================================================================
// shot.service.ts – Angular service for all HTTP communication with the API
// =============================================================================
// Centralising HTTP calls here means:
//   - Components stay lean (no fetch/HttpClient boilerplate)
//   - The API base URL is defined in one place (environment.apiUrl)
//   - Mocking in tests only requires replacing this single service
// =============================================================================

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Shot, FeedbackItem, ShotCreateResponse } from '../models/shot.model';

@Injectable({
  // providedIn: 'root' means a single shared instance is created for the
  // entire application. There is no reason to have multiple instances because
  // the service holds no mutable state.
  providedIn: 'root',
})
export class ShotService {
  /** Base URL for all shot endpoints, e.g. http://localhost:3000/api/shots */
  private readonly baseUrl = `${environment.apiUrl}/shots`;

  // HttpClient is injected by Angular's DI container – no need to instantiate.
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch every shot ordered by most-recent first.
   * Used by ShotListComponent on initialisation.
   */
  getAllShots(): Observable<Shot[]> {
    return this.http.get<Shot[]>(this.baseUrl);
  }

  /**
   * Fetch a single shot by its primary key.
   * Used by ShotFormComponent when entering edit mode so the form can be
   * pre-populated with the existing values.
   * @param id - The shot's numeric database id
   */
  getShotById(id: number): Observable<Shot> {
    return this.http.get<Shot>(`${this.baseUrl}/${id}`);
  }

  /**
   * Send a new shot to the API for insertion.
   * The server responds with both the saved shot record and swing feedback so
   * the form can display analysis immediately without a second request.
   * @param shot - Object containing all user-supplied shot fields
   */
  createShot(shot: Partial<Shot>): Observable<ShotCreateResponse> {
    return this.http.post<ShotCreateResponse>(this.baseUrl, shot);
  }

  /**
   * Fetch swing analysis feedback for an existing shot by id.
   * Useful for reviewing analysis on previously logged shots.
   * @param id - The shot's numeric database id
   */
  getFeedback(id: number): Observable<{ shot: Shot; feedback: FeedbackItem[] }> {
    return this.http.get<{ shot: Shot; feedback: FeedbackItem[] }>(`${this.baseUrl}/${id}/feedback`);
  }

  /**
   * Replace all editable fields of an existing shot.
   * The server validates that the id exists and returns 404 otherwise.
   * @param id   - The shot to update
   * @param shot - New values for all editable fields
   */
  updateShot(id: number, shot: Partial<Shot>): Observable<Shot> {
    return this.http.put<Shot>(`${this.baseUrl}/${id}`, shot);
  }

  /**
   * Permanently delete a shot by id.
   * The return type is void because the API returns a simple success message
   * that the component does not need to parse; it just reloads the list.
   * @param id - The shot to delete
   */
  deleteShot(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}