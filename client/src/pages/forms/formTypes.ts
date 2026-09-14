export interface FormApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  clientIds: string[];
  allowedOrigins: string[] | null;
  createdBy: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface FormSubmission {
  id: string;
  formKeyId: string;
  formName: string;
  clientId: string;
  fields: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  ipHash: string | null;
  submittedAt: string;
}

export interface NewKeyResponse {
  key: string;
  metadata: FormApiKey;
}
