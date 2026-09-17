/**
 * Error contract of this extension.
 *
 * Messages never contain the text being encoded: it may be a private profile or
 * a pairing secret, and callers surface messages to project authors.
 */
export type QrDisplayErrorCode =
  | 'empty-text'
  | 'text-too-long'
  | 'invalid-level'
  | 'invalid-target'
  | 'renderer-unavailable';

export class QrDisplayError extends Error {
  public readonly code: QrDisplayErrorCode;

  public constructor(code: QrDisplayErrorCode, message: string, options?: {cause?: unknown}) {
    super(message, options);
    this.name = 'QrDisplayError';
    this.code = code;
  }
}
