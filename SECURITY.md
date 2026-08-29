# Security Policy

## Security Architecture

REQ.IO implements comprehensive Electron security best practices to protect against common attack vectors. This document outlines the security measures in place.

### Threat Model

REQ.IO protects against:

- **Cross-Site Scripting (XSS)**: Malicious scripts injected into the renderer process
- **Server-Side Request Forgery (SSRF)**: Unauthorized requests to internal networks or local files
- **Clickjacking**: Embedding the application in malicious iframes
- **Privilege Escalation**: Renderer gaining unauthorized access to main process APIs
- **Data Exfiltration**: Malicious navigation or popup windows

### Security Measures

#### 1. Minimal Preload API Surface

**What**: The preload script only exposes a single, typed API (`window.api.fetch`) to the renderer process.

**Why**: Direct `ipcRenderer` access would allow malicious code in the renderer to send arbitrary IPC messages, potentially accessing Node.js APIs or file system operations.

**Implementation**:
- ✅ Only `window.api.fetch()` is exposed
- ❌ No direct `ipcRenderer` access
- ✅ Fully typed API with TypeScript

#### 2. IPC Request Validation

**What**: All HTTP requests from the renderer are validated before execution in the main process.

**Protection Against**:
- File URI access (`file://`) - prevents local file system access
- Private network requests (10.x.x.x, 192.168.x.x, 172.16-31.x.x) - prevents SSRF attacks
- Invalid URL schemes (ftp://, etc.) - only http/https allowed

**Special Cases**:
- Localhost (127.0.0.1) is allowed in development mode for testing local APIs
- Returns clear error messages (403 Forbidden) for blocked requests

**Location**: `electron/main.ts` - `shouldAllowUrl()` function

#### 3. Navigation Guards

**What**: Prevents the renderer from navigating to external URLs or opening popup windows.

**Implementation**:
- `will-navigate` event handler blocks navigation to any URL outside the app
- `setWindowOpenHandler` denies all popup/new window attempts
- Only allows navigation to Vite dev server (dev mode) or file:// protocol

**Location**: `electron/main.ts` - `createWindow()` function

#### 4. Permission Request Blocking

**What**: Automatically denies all permission requests (camera, microphone, geolocation, notifications, etc.).

**Why**: REQ.IO doesn't need device hardware access. Denying by default prevents malicious code from accessing sensors.

**Location**: `electron/main.ts` - `setPermissionRequestHandler()`

#### 5. Content Security Policy (CSP)

**What**: HTTP header that controls which resources the renderer can load.

**Directives**:
- `default-src 'self'` - Only load resources from the app itself
- `script-src 'self'` - Blocks inline scripts and eval()
- `style-src 'self' 'unsafe-inline'` - Allows app styles (needed for React/Vite)
- `connect-src 'self' ws: wss:` - Allows WebSocket for Vite HMR
- `frame-ancestors 'none'` - Prevents clickjacking
- `object-src 'none'` - Blocks plugins like Flash

**Location**: `index.html` - CSP meta tag

### Electron Security Checklist

REQ.IO follows the [official Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security):

- ✅ Enable Context Isolation
- ✅ Disable Node Integration
- ✅ Use Preload Scripts (with minimal API surface)
- ✅ Validate all IPC messages
- ✅ Handle navigation events
- ✅ Block permission requests
- ✅ Implement Content Security Policy
- ✅ No direct ipcRenderer exposure

## Development Security Guidelines

### For Contributors

When contributing to REQ.IO, follow these security practices:

1. **Never expose `ipcRenderer` directly** - Always use the typed `window.api` interface
2. **Validate all inputs** - Especially URLs and user-provided data
3. **Avoid `eval()` and inline scripts** - Violates CSP
4. **Don't weaken security measures** - CSP directives, URL validation, etc.
5. **Test security changes** - Run the validation test suite (`npm test`)

### Adding New IPC Handlers

If you need to add a new IPC handler:

1. Add validation logic to the handler (similar to the `rest` handler)
2. Expose via the typed `window.api` interface in `electron/preload.ts`
3. Update TypeScript definitions in `electron/electron-env.d.ts`
4. Write validation tests in `tests/electron/`

### Code Review Focus Areas

When reviewing security-related changes, pay attention to:

- Changes to `electron/preload.ts` - Ensure no direct API exposure
- Changes to `electron/main.ts` - Validate all IPC handlers
- Changes to `index.html` - Ensure CSP is not weakened
- URL handling - Verify validation logic is maintained

## Testing

Security measures are validated through automated tests:

```bash
# Run security validation tests
npm test -- tests/electron/ipc-handler.test.ts

# Run all tests
npm test
```

Key test suites:
- IPC URL validation (23 tests covering file://, private IPs, schemes, etc.)
- Content-Type handling
- Error handling

## Questions or Concerns?

If you have questions about REQ.IO's security architecture or suggestions for improvements, please open a discussion or contact the maintainers.
