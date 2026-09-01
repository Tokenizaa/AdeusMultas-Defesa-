/**
 * Documenso Integration Types
 * Based on Documenso API v2 (Envelope-based architecture)
 * @see https://docs.documenso.com/docs/developers/api
 */

// ==========================================
// Core Enums
// ==========================================

export type EnvelopeStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type RecipientRole = 'SIGNER' | 'REVIEWER' | 'APPROVER' | 'RECIPIENT';

export type RecipientSigningStatus =
  | 'NOT_SENT'
  | 'SENT'
  | 'NOT_OPENED'
  | 'OPENED'
  | 'NOT_SIGNED'
  | 'SIGNED'
  | 'REJECTED'
  | 'COMPLETED';

export type RecipientReadStatus = 'NOT_OPENED' | 'OPENED' | 'READ';

export type FieldType = 'SIGNATURE' | 'INITIAL' | 'DATE' | 'TEXT' | 'CHECKBOX';

export type SigningOrder = 'SEQUENTIAL' | 'PARALLEL';

export type WebhookEvent =
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_SENT'
  | 'DOCUMENT_OPENED'
  | 'DOCUMENT_SIGNED'
  | 'DOCUMENT_RECIPIENT_COMPLETED'
  | 'DOCUMENT_COMPLETED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_CANCELLED'
  | 'RECIPIENT_EXPIRED'
  | 'DOCUMENT_REMINDER_SENT'
  | 'TEMPLATE_CREATED'
  | 'TEMPLATE_UPDATED'
  | 'TEMPLATE_DELETED'
  | 'TEMPLATE_USED';

// ==========================================
// Request Types
// ==========================================

export interface CreateEnvelopeDocument {
  name: string;
  fileUrl: string; // Will be replaced with presigned URL from Documenso
}

export interface CreateEnvelopeRecipient {
  email: string;
  name: string;
  role: RecipientRole;
  signingOrder: number;
}

export interface CreateEnvelopeField {
  documentId: string;      // Matches documents array index (e.g., "doc_0")
  recipientId: string;     // Matches recipients array index (e.g., "rec_0")
  type: FieldType;
  page: number;            // 1-indexed page number
  x: number;               // X position in PDF points (72 DPI)
  y: number;               // Y position in PDF points (72 DPI)
  width: number;           // Width in PDF points
  height: number;          // Height in PDF points
  required?: boolean;
}

export interface EnvelopeSettings {
  expiresInDays?: number;          // Default: 30
  signingOrder?: SigningOrder;     // Default: 'PARALLEL'
  reminderEnabled?: boolean;       // Default: true
  reminderIntervalDays?: number;   // Default: 7
}

export interface CreateEnvelopeRequest {
  title: string;
  documents: CreateEnvelopeDocument[];
  recipients: CreateEnvelopeRecipient[];
  fields: CreateEnvelopeField[];
  settings?: EnvelopeSettings;
  externalId: string;              // Our case ID for tracking
  metadata?: Record<string, any>;  // Additional metadata
}

// ==========================================
// Response Types
// ==========================================

export interface EnvelopeDocument {
  id: string;           // e.g., "doc_abc123"
  name: string;
  uploadUrl?: string;   // Presigned URL for uploading PDF
}

export interface EnvelopeRecipient {
  id: string;                    // e.g., "rec_abc123"
  email: string;
  name: string;
  role: RecipientRole;
  signingOrder: number;
  signingStatus: RecipientSigningStatus;
  readStatus: RecipientReadStatus;
  signingUrl?: string;           // Available after sending
  signedAt?: string;             // ISO timestamp
  rejectionReason?: string;
}

export interface EnvelopeField {
  id: string;
  documentId: string;
  recipientId: string;
  type: FieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  value?: string;                // Filled value after signing
}

export interface EnvelopeSettingsResponse {
  expiresInDays: number;
  signingOrder: SigningOrder;
  reminderEnabled: boolean;
  reminderIntervalDays: number;
  expirationDate?: string;
}

export interface EnvelopeResponse {
  id: string;                    // e.g., "env_abc123"
  title: string;
  status: EnvelopeStatus;
  externalId: string;
  documents: EnvelopeDocument[];
  recipients: EnvelopeRecipient[];
  fields: EnvelopeField[];
  settings: EnvelopeSettingsResponse;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  sentAt?: string;
}

export interface SigningUrlResponse {
  signingUrl: string;
  recipientId: string;
}

export interface ListEnvelopesQuery {
  page?: number;
  limit?: number;
  status?: EnvelopeStatus;
  externalId?: string;
}

export interface ListEnvelopesResponse {
  data: EnvelopeResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==========================================
// Webhook Types
// ==========================================

export interface WebhookRecipient {
  id: string;
  email: string;
  name: string;
  role: RecipientRole;
  signingStatus: RecipientSigningStatus;
  signedAt?: string;
  readStatus: RecipientReadStatus;
  rejectionReason?: string;
}

export interface WebhookPayload {
  event: WebhookEvent;
  payload: {
    id: string;
    title: string;
    status: EnvelopeStatus;
    externalId: string;
    completedAt?: string;
    sentAt?: string;
    recipients: WebhookRecipient[];
    createdAt: string;
  };
  createdAt: string;
  webhookEndpoint: string;
}

// ==========================================
// Internal Database Types
// ==========================================

export interface DocumensoEnvelopeRecord {
  id: string;                          // UUID
  documenso_envelope_id: string;       // env_xxx
  external_id: string;                 // Our case ID
  case_id: string;                     // UUID reference to cases table
  status: EnvelopeStatus;
  envelope_data: any;                  // Full envelope snapshot
  sent_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumensoRecipientRecord {
  id: string;                          // UUID
  envelope_id: string;                 // UUID reference to documenso_envelopes
  documenso_recipient_id: string;      // rec_xxx
  email: string;
  name: string;
  role: RecipientRole;
  signing_status: RecipientSigningStatus;
  signing_url?: string;
  signed_at?: string;
  read_status: RecipientReadStatus;
  created_at: string;
}

export interface DocumensoWebhookEventRecord {
  id: string;                          // UUID
  event_key: string;                   // env_xxx:DOCUMENT_COMPLETED
  processed_at: string;
}

// ==========================================
// Error Types
// ==========================================

export class DocumensoError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'DocumensoError';
  }

  static fromResponse(status: number, data: any): DocumensoError {
    return new DocumensoError(
      status,
      data.code || 'UNKNOWN_ERROR',
      data.message || 'Documenso API error',
      data
    );
  }
}

// ==========================================
// Embedding Types
// ==========================================

export interface EmbeddingTokenRequest {
  envelopeId: string;
  recipientId: string;
  redirectUrl?: string;
}

export interface EmbeddingTokenResponse {
  token: string;
  url: string;
  expiresAt: string;
}

// ==========================================
// Utility Types
// ==========================================

export interface DocumensoConfig {
  baseUrl: string;
  apiToken: string;
  webhookSecret: string;
  webhookUrl: string;
}

export const DOCUMENSO_API_VERSION = 'v2';
export const DOCUMENSO_BASE_PATH = `/api/${DOCUMENSO_API_VERSION}`;

export const DOCUMENSO_ENDPOINTS = {
  ENVELOPES: '/envelopes',
  ENVELOPE_BY_ID: (id: string) => `/envelopes/${id}`,
  ENVELOPE_SEND: (id: string) => `/envelopes/${id}/send`,
  ENVELOPE_DOWNLOAD: (id: string) => `/envelopes/${id}/download`,
  ENVELOPE_SIGNING_URL: (envelopeId: string, recipientId: string) =>
    `/envelopes/${envelopeId}/recipients/${recipientId}/signing-url`,
  EMBEDDING_TOKEN: '/embedding/create-presign-token',
} as const;