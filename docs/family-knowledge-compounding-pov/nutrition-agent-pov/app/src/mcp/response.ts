export type ResponseMetadata = {
  readonly requestId?: string;
  readonly traceId?: string;
  readonly auditId?: string;
};

export type ResponseEnvelope<TData> = {
  readonly success: boolean;
  readonly data: TData | null;
  readonly error: { readonly code: string; readonly message: string } | null;
  readonly metadata: {
    readonly request_id?: string;
    readonly trace_id?: string;
    readonly audit_id?: string;
  };
};

const SECRET_PATTERNS = [
  /postgres(?:ql)?:\/\/[^\s,;]+/gi,
  /Bearer\s+[^\s,;]+/gi,
  /Authorization\s*[:=]\s*[^\s,;]+/gi,
  /(?:password|passwd|pwd|token|secret|api[_-]?key|connection[_-]?string)\s*[:=]\s*[^\s,;]+/gi
] as const;

const sanitizeMessage = (message: string): string => {
  const sanitized = SECRET_PATTERNS.reduce(
    (currentMessage, pattern) => currentMessage.replace(pattern, '[redacted]'),
    message
  );

  return sanitized.length > 240 ? `${sanitized.slice(0, 237)}...` : sanitized;
};

const createMetadata = (metadata: ResponseMetadata): ResponseEnvelope<unknown>['metadata'] => ({
  ...(metadata.requestId ? { request_id: metadata.requestId } : {}),
  ...(metadata.traceId ? { trace_id: metadata.traceId } : {}),
  ...(metadata.auditId ? { audit_id: metadata.auditId } : {})
});

export const createSuccessResponse = <TData>(
  data: TData,
  metadata: ResponseMetadata = {}
): ResponseEnvelope<TData> => ({
  success: true,
  data,
  error: null,
  metadata: createMetadata(metadata)
});

export const createErrorResponse = (
  code: string,
  message: string,
  metadata: ResponseMetadata = {}
): ResponseEnvelope<null> => ({
  success: false,
  data: null,
  error: {
    code,
    message: sanitizeMessage(message)
  },
  metadata: createMetadata(metadata)
});
