/**
 * Standardized Meta Integration Error Hierarchy
 * Provides human-readable, actionable diagnostic messages for the Admin and logs.
 */

export class MetaIntegrationError extends Error {
  public code: string;
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, code = 'META_UNKNOWN_ERROR', statusCode = 500, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MetaOAuthCancelledError extends MetaIntegrationError {
  constructor(details?: any) {
    super('Autorização cancelada pelo usuário na tela da Meta.', 'META_OAUTH_CANCELLED', 400, details);
  }
}

export class MetaOAuthInvalidCodeError extends MetaIntegrationError {
  constructor(message = 'Código de autorização OAuth inválido ou expirado.', details?: any) {
    super(message, 'META_OAUTH_INVALID_CODE', 400, details);
  }
}

export class MetaTokenExpiredError extends MetaIntegrationError {
  constructor(message = 'O token de acesso da Meta expirou. É necessário reconectar.', details?: any) {
    super(message, 'META_TOKEN_EXPIRED', 401, details);
  }
}

export class MetaTokenRevokedError extends MetaIntegrationError {
  constructor(message = 'O acesso do aplicativo foi revogado nas configurações da Meta.', details?: any) {
    super(message, 'META_TOKEN_REVOKED', 401, details);
  }
}

export class MetaInsufficientPermissionsError extends MetaIntegrationError {
  public missingPermissions: string[];
  constructor(missing: string[], details?: any) {
    super(
      `Permissões insuficientes. Faltam: ${missing.join(', ')}. Reconecte concedendo todos os acessos.`,
      'META_INSUFFICIENT_PERMISSIONS',
      403,
      { missingPermissions: missing, ...details }
    );
    this.missingPermissions = missing;
  }
}

export class MetaPageNotFoundError extends MetaIntegrationError {
  constructor(pageId: string) {
    super(`Página do Facebook com ID "${pageId}" não foi encontrada ou não possui permissão de gestão.`, 'META_PAGE_NOT_FOUND', 404, { pageId });
  }
}

export class MetaInstagramNotBusinessError extends MetaIntegrationError {
  constructor(details?: any) {
    super(
      'A conta do Instagram vinculada à página não é uma Conta Comercial/Profissional (Business/Creator).',
      'META_INSTAGRAM_NOT_BUSINESS',
      400,
      details
    );
  }
}

export class MetaRateLimitError extends MetaIntegrationError {
  public retryAfterSeconds: number;
  constructor(retryAfterSeconds = 60, details?: any) {
    super(
      `Limite de requisições da Meta Graph API atingido (Rate Limit). Aguarde ${retryAfterSeconds}s.`,
      'META_RATE_LIMIT_EXCEEDED',
      429,
      { retryAfterSeconds, ...details }
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class MetaContentPolicyRejectionError extends MetaIntegrationError {
  constructor(reason: string, details?: any) {
    super(`Conteúdo rejeitado pelas políticas de publicação da Meta: ${reason}`, 'META_CONTENT_REJECTED', 422, details);
  }
}

export class MetaWebhookSignatureInvalidError extends MetaIntegrationError {
  constructor(details?: any) {
    super('Assinatura HMAC SHA-256 do webhook Meta inválida.', 'META_WEBHOOK_SIGNATURE_INVALID', 401, details);
  }
}

export class MetaTemporaryApiError extends MetaIntegrationError {
  constructor(message = 'Erro temporário nos servidores da Meta. Nova tentativa será agendada.', details?: any) {
    super(message, 'META_TEMPORARY_API_ERROR', 503, details);
  }
}
