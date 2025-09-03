import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { CarePlanRow } from '../models/guideline';

@Injectable({ providedIn: 'root' })
export class OpenAiService {
  private http = inject(HttpClient);

  async getGuidelines(diagnosis: string): Promise<CarePlanRow[]> {
    // diagnosis is currently unused by the server; kept for API shape stability
    const body = { diagnosis };
    return await firstValueFrom(
      this.http.post<CarePlanRow[]>('/api/guidelines', body)
    );
  }
}
