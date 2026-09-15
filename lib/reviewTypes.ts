export const TOOTH_TYPE_CHOICES = [
  "Not sure",
  "First Molar",
  "Second Molar",
  "Third Molar",
  "First Premolar",
  "Second Premolar",
  "Canine",
  "Central Incisor",
  "Lateral Incisor",
] as const;

export const ISSUE_REASONS = ["Wrong tooth type", "Boundary is off", "Not sure"] as const;
export type IssueReason = (typeof ISSUE_REASONS)[number];

export interface ToothIssue {
  toothNumber: number;
  annotationId: number;
  toothTypeAssigned: string;
  reasons: IssueReason[];
  suggestedType: string;
  comment: string;
}

export interface ToothRef {
  toothNumber: number;
  annotationId: number;
  toothType: string;
}

export interface ImageReview {
  imageId: number;
  imageFileName: string;
  reviewerName: string;
  missingTeeth: "Yes" | "No";
  missingDescription: string;
  phantomMarks: "Yes" | "No";
  phantomDescription: string;
  teeth: ToothRef[];
  issues: Record<number, ToothIssue>; // keyed by annotationId — only flagged teeth appear here
  reviewedAt: string;
}

export interface ExportRow {
  reviewer_name: string;
  image_id: number;
  image_filename: string;
  tooth_number: number;
  annotation_id: number;
  tooth_type_assigned: string;
  status: string;
  suggested_type: string;
  comment: string;
  missing_teeth: string;
  missing_description: string;
  phantom_marks: string;
  phantom_description: string;
  reviewed_at: string;
}
