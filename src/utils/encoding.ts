/**
 * Robust UTF-8 Base64 Utilities for Ethiopic (Ge'ez), Afaan Oromoo, Amharic, and standard text.
 * Prevents 'InvalidCharacterError: Failed to execute btoa on Window' when handling non-Latin1 characters.
 */

export function utf8ToBase64(str: string): string {
  if (!str) return '';
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const chunkSize = 0x8000; // 32k chunks to prevent call stack overflow
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  } catch (err) {
    console.warn('utf8ToBase64 primary failed, using fallback:', err);
    try {
      return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
          String.fromCharCode(parseInt(p1, 16))
        )
      );
    } catch (fallbackErr) {
      console.error('utf8ToBase64 fallback failed:', fallbackErr);
      return '';
    }
  }
}

export function base64ToUtf8(base64: string): string {
  if (!base64) return '';
  try {
    // Sanitize base64 string spacing or headers if present
    const cleanB64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const binary = atob(cleanB64.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (err) {
    console.warn('base64ToUtf8 primary failed, using fallback:', err);
    try {
      const cleanB64 = base64.includes(',') ? base64.split(',')[1] : base64;
      return decodeURIComponent(
        Array.prototype.map
          .call(atob(cleanB64.trim()), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (fallbackErr) {
      console.error('base64ToUtf8 fallback failed:', fallbackErr);
      return '';
    }
  }
}

export function safeStringId(str: string, prefix: string = 'doc'): string {
  if (!str) return `${prefix}_${Date.now()}`;
  try {
    const b64 = utf8ToBase64(str).replace(/[^a-zA-Z0-9]/g, '');
    return `${prefix}_${b64.substring(0, 24) || Date.now()}`;
  } catch {
    return `${prefix}_${Date.now()}`;
  }
}
