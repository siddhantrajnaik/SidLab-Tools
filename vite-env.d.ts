/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Gemini API key used by the AI Illustrator page.
   * This is embedded in the client bundle at build time and is therefore public —
   * restrict it by HTTP referrer and quota, or move the call behind a server.
   */
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
