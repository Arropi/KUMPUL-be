export interface DocumentVerificationResult {
  is_verified: boolean;
  document_type: string;
  document_number?: string | null;
  issuer?: string | null;
  expiration_date?: string | null;
  is_expired: boolean;
  hygiene_compliance: boolean;
  legal_compliance: boolean;
  analysis_summary: string;
  rejection_reason?: string | null;
}

export interface VerifyDocumentInput {
  file_url: string;
  commodity_name?: string;
  supplier_name?: string;
}
