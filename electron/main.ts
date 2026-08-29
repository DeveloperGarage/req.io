import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { ApiResponse } from '../src/api/types'

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  const win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'reqio.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },

    width: 1450,
    height: 900,
  })

  // Security: Prevent navigation to external URLs
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    const validOrigins: string[] = VITE_DEV_SERVER_URL
      ? [new URL(VITE_DEV_SERVER_URL).origin, 'file://']
      : ['file://']

    const isValidNavigation = validOrigins.some(origin =>
      origin === 'file://' ? parsedUrl.protocol === 'file:' : navigationUrl.startsWith(origin)
    )

    if (!isValidNavigation) {
      console.warn('Navigation blocked:', navigationUrl)
      event.preventDefault()
    }
  })

  // Security: Block popup windows and external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.warn('Blocked attempt to open new window:', url)
    return { action: 'deny' }
  })

  // Security: Deny all permission requests (camera, microphone, geolocation, etc.)
  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    console.warn('Permission request denied:', permission)
    callback(false)
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
});

// Security: URL validation helpers
function isValidUrlScheme(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isInternalIp(hostname: string): boolean {
  // Check for localhost variations
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // Check for private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);

  if (match) {
    const [, oct1, oct2] = match.map(Number);

    // 10.0.0.0/8
    if (oct1 === 10) return true;

    // 172.16.0.0/12
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return true;

    // 192.168.0.0/16
    if (oct1 === 192 && oct2 === 168) return true;

    // 127.0.0.0/8 (loopback)
    if (oct1 === 127) return true;
  }

  return false;
}

function shouldAllowUrl(url: string): { allowed: boolean; reason?: string } {
  // Validate URL scheme
  if (!isValidUrlScheme(url)) {
    return {
      allowed: false,
      reason: 'Invalid URL scheme. Only http:// and https:// are allowed.'
    };
  }

  try {
    const parsed = new URL(url);

    // Check for internal IPs (SSRF protection)
    if (isInternalIp(parsed.hostname)) {
      // Allow localhost only in development mode
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

ipcMain.handle("rest", async (_event: any, url: string, options?: RequestInit): Promise<ApiResponse> => {
  try {
    // Security: Validate URL before making request
    const validation = shouldAllowUrl(url);
    if (!validation.allowed) {
      console.warn('IPC Handler - Blocked request:', url, validation.reason);
      return {
        ok: false,
        error: validation.reason || 'Request blocked for security reasons.',
        status: 403,
        statusText: 'Forbidden'
      };
    }

    const response = await fetch(url, options);
    
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    const contentType = response.headers.get('content-type') || '';
    let data: any;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      data = await response.text();
    } else if (contentType.includes('text/html')) {
      data = await response.text();
    } else if (contentType.includes('text/')) {
      data = await response.text();
    } else if (contentType.includes('application/octet-stream') || 
               contentType.includes('image/') || 
               contentType.includes('application/pdf')) {
      const buffer = await response.arrayBuffer();
      data = Buffer.from(buffer).toString('base64');
    } else {
      data = await response.text();
    }
    
    return { 
      ok: response.ok,
      data,
      status: response.status,
      statusText: response.statusText,
      headers
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('IPC Handler - Error:', error);
    return { ok: false, error };
  }
});

app.whenReady().then(createWindow)
