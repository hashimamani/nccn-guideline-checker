import { Component, Input } from '@angular/core';
import type { GuidelineResponse } from '../../models/guideline';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-guideline-result',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './guideline-result.component.html',
  styleUrl: './guideline-result.component.scss'
})
export class GuidelineResultComponent {
  @Input() result?: GuidelineResponse;
  @Input() loading = false;
  @Input() error?: string | null;
}

