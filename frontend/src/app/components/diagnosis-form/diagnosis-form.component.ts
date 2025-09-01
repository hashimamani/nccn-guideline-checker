import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-diagnosis-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './diagnosis-form.component.html',
  styleUrl: './diagnosis-form.component.scss'
})
export class DiagnosisFormComponent {
  @Output() submitDiagnosis = new EventEmitter<string>();
  diagnosis = signal('');

  onSubmit() {
    const value = this.diagnosis().trim();
    if (value.length > 0) {
      this.submitDiagnosis.emit(value);
    }
  }
}

