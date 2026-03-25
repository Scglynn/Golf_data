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
import { Shot } from '../models/shot.model';

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
   * `Partial<Shot>` is used because `id` and `created_at` are supplied by
   * the database and must not be sent from the client.
   * @param shot - Object containing all user-supplied shot fields
   */
  createShot(shot: Partial<Shot>): Observable<Shot> {
    return this.http.post<Shot>(this.baseUrl, shot);
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