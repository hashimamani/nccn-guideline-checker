import { Component, Input } from '@angular/core';
import type { CarePlanRow } from '../../models/guideline';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-guideline-result',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './guideline-result.component.html',
  styleUrl: './guideline-result.component.scss'
})
export class GuidelineResultComponent {
  @Input() rows?: CarePlanRow[];
  @Input() loading = false;
  @Input() error?: string | null;

  toLines(value: string[] | string | undefined | null): string[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }
}
