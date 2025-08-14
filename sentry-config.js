// Sentry Configuration for CantoneseScribe Production
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || "production",
  
  // Performance Monitoring
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),
  
  // Session Replay
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  
  // Custom configuration
  beforeSend(event) {
    // Filter out development errors
    if (event.exception) {
      const error = event.exception.values[0];
      if (error.value?.includes("Development error")) {
        return null;
      }
    }
    
    // Add custom context
    event.tags = {
      ...event.tags,
      component: "cantonese-scribe",
      version: process.env.npm_package_version
    };
    
    return event;
  },
  
  // Performance monitoring
  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || "0.1"),
  
  // Integration configuration
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/cantonese-scribe\.vercel\.app/
      ]
    }),
    new Sentry.Replay()
  ]
});
