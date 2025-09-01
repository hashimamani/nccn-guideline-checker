import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DiagnosisFormComponent } from './components/diagnosis-form/diagnosis-form.component';
import { GuidelineResultComponent } from './components/guideline-result/guideline-result.component';
import { OpenAiService } from './services/openai.service';
import type { GuidelineResponse } from './models/guideline';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DiagnosisFormComponent, GuidelineResultComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'NCCN Guideline Checker';
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<GuidelineResponse | undefined>(undefined);

  constructor(private openai: OpenAiService) {}

  async onSubmitDiagnosis(text: string) {
    this.error.set(null);
    this.loading.set(true);
    this.result.set(undefined);
    try {
      const res = await this.openai.getGuidelines(text);
      this.result.set(res);
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Request failed');
    } finally {
      this.loading.set(false);
    }
  }
}
