export interface TreatmentModality {
  name: string;
  details?: string;
}

export interface GuidelineResponse {
  diagnosis: string;
  workup: string[];
  treatment: TreatmentModality[];
  surveillance: string[];
  follow_up: string[];
}

