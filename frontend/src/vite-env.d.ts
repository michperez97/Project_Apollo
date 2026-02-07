/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUBSCRIPTION_MONTHLY_PRICE?: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
  readonly VITE_CLOUDINARY_UPLOAD_PRESET?: string;
  readonly VITE_CLOUDINARY_DEFAULT_FOLDER?: string;
  readonly VITE_USE_MOCK_TELEMETRY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
