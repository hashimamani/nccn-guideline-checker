import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { GuidelineResponse } from '../models/guideline';

@Injectable({ providedIn: 'root' })
export class OpenAiService {
  private http = inject(HttpClient);

  async getGuidelines(diagnosis: string): Promise<GuidelineResponse> {
    const body = { diagnosis };
    return await firstValueFrom(
      this.http.post<GuidelineResponse>('/api/guidelines', body)
    );
  }
}

