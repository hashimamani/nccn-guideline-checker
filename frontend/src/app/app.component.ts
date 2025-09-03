import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DiagnosisFormComponent } from './components/diagnosis-form/diagnosis-form.component';
import { GuidelineResultComponent } from './components/guideline-result/guideline-result.component';
import { OpenAiService } from './services/openai.service';
import type { CarePlanRow } from './models/guideline';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DiagnosisFormComponent, GuidelineResultComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Oncology Care Plan';
  loading = signal(false);
  error = signal<string | null>(null);
  rows = signal<CarePlanRow[] | undefined>(undefined);

  constructor(private openai: OpenAiService) {}

  async onSubmitDiagnosis(text: string) {
    this.error.set(null);
    this.loading.set(true);
    this.rows.set(undefined);
    try {
      const res = await this.openai.getGuidelines(text);
      this.rows.set(res);
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Request failed');
    } finally {
      this.loading.set(false);
    }
  }
}
