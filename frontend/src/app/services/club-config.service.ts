// =============================================================================
// club-config.service.ts – HTTP calls for club + shaft setups and shaft stats
// =============================================================================

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ClubConfig, ClubConfigStatsResponse } from '../models/shot.model';

@Injectable({
  providedIn: 'root',
})
export class ClubConfigService {
  /** Base URL for all setup endpoints, e.g. http://localhost:3000/api/club-configs */
  private readonly baseUrl = `${environment.apiUrl}/club-configs`;

  constructor(private readonly http: HttpClient) {}

  /** Fetch every setup in the bag, grouped by club. */
  getAll(): Observable<ClubConfig[]> {
    return this.http.get<ClubConfig[]>(this.baseUrl);
  }

  create(config: Partial<ClubConfig>): Observable<ClubConfig> {
    return this.http.post<ClubConfig>(this.baseUrl, config);
  }

  update(id: number, config: Partial<ClubConfig>): Observable<ClubConfig> {
    return this.http.put<ClubConfig>(`${this.baseUrl}/${id}`, config);
  }

  /** Delete a setup. Shots logged against it are kept. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Fetch aggregated stats and shaft-fit feedback for one or more setups,
   * returned in the same order as the ids.
   * @param ids - Setup ids to compare
   */
  getStats(ids: number[]): Observable<ClubConfigStatsResponse[]> {
    return this.http.get<ClubConfigStatsResponse[]>(`${this.baseUrl}/stats`, {
      params: { ids: ids.join(',') },
    });
  }
}
