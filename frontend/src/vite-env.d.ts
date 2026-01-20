/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_URL_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
