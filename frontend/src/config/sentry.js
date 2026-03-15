import * as Sentry from '@sentry/react';

const isProduction = import.meta.env.PROD;
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (isProduction && sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    allowUrls: [
      /https?:\/\/.*oretech.*\.vercel\.app/,
      /https?:\/\/.*rockops.*\.onrender\.com/,
    ],
    environment: import.meta.env.VITE_ENVIRONMENT || 'production',
  });
}

export default Sentry;
