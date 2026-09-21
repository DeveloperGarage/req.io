/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    DIST: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
// Security: Only window.api is exposed - no direct ipcRenderer access
interface Window {
  api: {
    fetch<T = unknown>(
      url: string,
      options?: RequestInit
    ): Promise<{
      ok: boolean;
      data?: T;
      error?: string;
      status?: number;
      statusText?: string;
      headers?: Record<string, string>;
    }>;
  };
}
