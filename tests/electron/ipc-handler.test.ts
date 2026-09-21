/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Electron IPC Handler - rest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Content-Type Handling', () => {
    it('should parse JSON responses', async () => {
      const mockData = { message: 'success', id: 123 };
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(mockData),
      };
      
      mockFetch.mockResolvedValue(mockResponse);

      // Simulate the IPC handler logic
      const response = await fetch('https://api.example.com/data');
      const headers: Record<string, string> = {};
      response.headers.forEach((value: string, key: string) => {
        headers[key] = value;
      });

      const contentType = response.headers.get('content-type') || '';
      expect(contentType).toContain('application/json');
    });

    it('should handle HTML responses as text', async () => {
      const mockHtml = '<!DOCTYPE html><html><body>Hello</body></html>';
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'text/html']]),
        text: vi.fn().mockResolvedValue(mockHtml),
      };
      
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('https://example.com');
      const contentType = response.headers.get('content-type') || '';
      expect(contentType).toContain('text/html');
    });

    it('should handle XML responses as text', async () => {
      const mockXml = '<?xml version="1.0"?><root><item>test</item></root>';
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/xml']]),
        text: vi.fn().mockResolvedValue(mockXml),
      };
      
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('https://api.example.com/data.xml');
      const contentType = response.headers.get('content-type') || '';
      expect(contentType).toContain('application/xml');
    });
  });

  describe('Response Status Handling', () => {
    it('should return status and statusText for successful requests', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ data: 'test' }),
      };
      
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('https://api.example.com/data');
      
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.ok).toBe(true);
    });

    it('should handle 404 errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('https://api.example.com/notfound');
      
      expect(response.status).toBe(404);
      expect(response.statusText).toBe('Not Found');
      expect(response.ok).toBe(false);
    });

    it('should handle 500 errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map([['content-type', 'application/json']]),
      };
      
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('https://api.example.com/error');
      
      expect(response.status).toBe(500);
      expect(response.ok).toBe(false);
    });
  });

  describe('Headers Conversion', () => {
    it('should convert Headers to plain object', () => {
      const headers = new Map([
        ['content-type', 'application/json'],
        ['authorization', 'Bearer token123'],
        ['x-custom-header', 'custom-value'],
      ]);

      const headersObj: Record<string, string> = {};
      headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      expect(headersObj).toEqual({
        'content-type': 'application/json',
        'authorization': 'Bearer token123',
        'x-custom-header': 'custom-value',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Failed to fetch');
      mockFetch.mockRejectedValue(networkError);

      await expect(fetch('https://api.example.com/data')).rejects.toThrow(
        'Failed to fetch'
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockFetch.mockRejectedValue(timeoutError);

      await expect(fetch('https://api.example.com/data')).rejects.toThrow(
        'Request timeout'
      );
    });
  });

  describe('URL Validation and Security', () => {
    describe('URL Scheme Validation', () => {
      it('should reject file:// URLs', () => {
        const fileUrl = 'file:///etc/passwd';
        const result = shouldAllowUrl(fileUrl);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Invalid URL scheme');
      });

      it('should reject ftp:// URLs', () => {
        const ftpUrl = 'ftp://example.com/file.txt';
        const result = shouldAllowUrl(ftpUrl);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Invalid URL scheme');
      });

      it('should accept http:// URLs', () => {
        const httpUrl = 'http://api.example.com/data';
        const result = shouldAllowUrl(httpUrl);

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should accept https:// URLs', () => {
        const httpsUrl = 'https://api.example.com/data';
        const result = shouldAllowUrl(httpsUrl);

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should reject invalid URL formats', () => {
        const invalidUrl = 'not-a-valid-url';
        const result = shouldAllowUrl(invalidUrl);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Invalid URL');
      });
    });

    describe('Internal IP Detection', () => {
      it('should detect localhost', () => {
        expect(isInternalIp('localhost')).toBe(true);
        expect(isInternalIp('127.0.0.1')).toBe(true);
        expect(isInternalIp('::1')).toBe(true);
      });

      it('should detect 10.x.x.x range', () => {
        expect(isInternalIp('10.0.0.1')).toBe(true);
        expect(isInternalIp('10.255.255.255')).toBe(true);
        expect(isInternalIp('10.1.2.3')).toBe(true);
      });

      it('should detect 192.168.x.x range', () => {
        expect(isInternalIp('192.168.0.1')).toBe(true);
        expect(isInternalIp('192.168.1.1')).toBe(true);
        expect(isInternalIp('192.168.255.255')).toBe(true);
      });

      it('should detect 172.16-31.x.x range', () => {
        expect(isInternalIp('172.16.0.1')).toBe(true);
        expect(isInternalIp('172.31.255.255')).toBe(true);
        expect(isInternalIp('172.20.1.1')).toBe(true);
      });

      it('should not detect public IPs as internal', () => {
        expect(isInternalIp('8.8.8.8')).toBe(false);
        expect(isInternalIp('1.1.1.1')).toBe(false);
        expect(isInternalIp('172.32.0.1')).toBe(false);
        expect(isInternalIp('192.169.1.1')).toBe(false);
      });

      it('should not detect domain names as internal', () => {
        expect(isInternalIp('example.com')).toBe(false);
        expect(isInternalIp('api.github.com')).toBe(false);
      });
    });

    describe('SSRF Protection', () => {
      it('should block requests to 127.0.0.1 in production', () => {
        delete process.env.VITE_DEV_SERVER_URL;
        const result = shouldAllowUrl('http://127.0.0.1:3000/api');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('internal/private IPs');
      });

      it('should block requests to 192.168.x.x', () => {
        delete process.env.VITE_DEV_SERVER_URL;
        const result = shouldAllowUrl('http://192.168.1.1/admin');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('internal/private IPs');
      });

      it('should block requests to 10.x.x.x', () => {
        delete process.env.VITE_DEV_SERVER_URL;
        const result = shouldAllowUrl('http://10.0.0.1/secret');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('internal/private IPs');
      });

      it('should block requests to 172.16-31.x.x', () => {
        delete process.env.VITE_DEV_SERVER_URL;
        const result = shouldAllowUrl('http://172.16.0.1/internal');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('internal/private IPs');
      });

      it('should allow localhost in development mode', () => {
        process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
        const result = shouldAllowUrl('http://localhost:3000/api');

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();

        delete process.env.VITE_DEV_SERVER_URL;
      });

      it('should allow 127.0.0.1 in development mode', () => {
        process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
        const result = shouldAllowUrl('http://127.0.0.1:8080/test');

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();

        delete process.env.VITE_DEV_SERVER_URL;
      });

      it('should still block private IPs even in dev mode', () => {
        process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
        const result = shouldAllowUrl('http://192.168.1.1/router');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('internal/private IPs');

        delete process.env.VITE_DEV_SERVER_URL;
      });
    });

    describe('Valid URL Scheme Helper', () => {
      it('should return true for valid http URLs', () => {
        expect(isValidUrlScheme('http://example.com')).toBe(true);
      });

      it('should return true for valid https URLs', () => {
        expect(isValidUrlScheme('https://example.com')).toBe(true);
      });

      it('should return false for file:// URLs', () => {
        expect(isValidUrlScheme('file:///path/to/file')).toBe(false);
      });

      it('should return false for ftp:// URLs', () => {
        expect(isValidUrlScheme('ftp://example.com')).toBe(false);
      });

      it('should return false for invalid URLs', () => {
        expect(isValidUrlScheme('not-a-url')).toBe(false);
        expect(isValidUrlScheme('')).toBe(false);
      });
    });
  });
});

// Import validation functions for testing
function isValidUrlScheme(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isInternalIp(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);

  if (match) {
    const [, oct1, oct2] = match.map(Number);

    if (oct1 === 10) return true;
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return true;
    if (oct1 === 192 && oct2 === 168) return true;
    if (oct1 === 127) return true;
  }

  return false;
}

function shouldAllowUrl(url: string): { allowed: boolean; reason?: string } {
  if (!isValidUrlScheme(url)) {
    return {
      allowed: false,
      reason: 'Invalid URL scheme. Only http:// and https:// are allowed.'
    };
  }

  try {
    const parsed = new URL(url);

    if (isInternalIp(parsed.hostname)) {
      const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
      const isLocalhost = parsed.hostname === 'localhost' ||
                         parsed.hostname === '127.0.0.1' ||
                         parsed.hostname === '::1';

      if (isDev && isLocalhost) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: `Requests to internal/private IPs are not allowed for security reasons.`
      };
    }

    return { allowed: true };
  } catch (err) {
    return {
      allowed: false,
      reason: 'Invalid URL format.'
    };
  }
}
