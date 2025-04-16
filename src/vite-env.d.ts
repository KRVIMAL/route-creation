/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GOOGLE_MAP_API_KEY: string;
    // Add other VITE_ variables here as needed
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  