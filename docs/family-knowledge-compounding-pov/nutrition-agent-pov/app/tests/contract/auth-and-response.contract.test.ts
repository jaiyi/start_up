import { describe, expect, it } from 'vitest';
import { authenticateRequest } from '../../src/mcp/auth.js';
import { createErrorResponse, createSuccessResponse } from '../../src/mcp/response.js';

const config = {
  mcpAuthToken: 'test-token-value',
  nodeEnv: 'test'
};

describe('Milestone 0 MCP auth and response envelope', () => {
  it('rejects missing auth token', () => {
    const result = authenticateRequest({}, config);

    expect(result).toEqual({ ok: false, errorCode: 'AUTH_REQUIRED' });
  });

  it('rejects malformed auth token', () => {
    const result = authenticateRequest({ authorization: 'Basic test-token-value' }, config);

    expect(result).toEqual({ ok: false, errorCode: 'AUTH_REQUIRED' });
  });

  it('rejects incorrect auth token', () => {
    const result = authenticateRequest({ authorization: 'Bearer wrong-token' }, config);

    expect(result).toEqual({ ok: false, errorCode: 'AUTH_REQUIRED' });
  });

  it('accepts correct bearer token', () => {
    const result = authenticateRequest({ authorization: 'Bearer test-token-value' }, config);

    expect(result).toEqual({ ok: true });
  });

  it('accepts case-insensitive authorization headers', () => {
    const result = authenticateRequest({ Authorization: 'Bearer test-token-value' }, config);

    expect(result).toEqual({ ok: true });
  });

  it('creates a stable success envelope', () => {
    const response = createSuccessResponse({ status: 'ok' }, { requestId: 'req-1', traceId: 'trace-1' });

    expect(response).toEqual({
      success: true,
      data: { status: 'ok' },
      error: null,
      metadata: {
        request_id: 'req-1',
        trace_id: 'trace-1'
      }
    });
  });

  it('creates a sanitized error envelope', () => {
    const response = createErrorResponse(
      'INTERNAL_ERROR',
      'connection failed for postgresql://family:secret@localhost/db with token=test-token-value and API_KEY=abc123',
      { requestId: 'req-1', traceId: 'trace-1' }
    );

    expect(response.success).toBe(false);
    expect(response.data).toBeNull();
    expect(response.error?.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response)).not.toContain('secret');
    expect(JSON.stringify(response)).not.toContain('test-token-value');
    expect(JSON.stringify(response)).not.toContain('abc123');
    expect(JSON.stringify(response)).not.toContain('postgresql://');
  });

  it('truncates long error messages', () => {
    const response = createErrorResponse('INTERNAL_ERROR', 'x'.repeat(300));

    expect(response.error?.message.length).toBeLessThanOrEqual(240);
  });
});
