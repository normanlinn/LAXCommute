export function errorMessage(reason: unknown, fallback = 'Please retry.'): string {
  return reason &&
    typeof reason === 'object' &&
    'message' in reason &&
    typeof reason.message === 'string'
    ? reason.message
    : fallback;
}
