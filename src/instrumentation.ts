export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateServerEnvironment } = await import('./lib/server-environment');
    try {
      validateServerEnvironment({
        ...process.env,
        // Validate the public values actually embedded in this build.
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_LOCAL_DEV_MODE: process.env.NEXT_PUBLIC_LOCAL_DEV_MODE,
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      });
    } catch (error) {
      // Next 16 can keep its listener alive after a rejected instrumentation hook.
      // A misconfigured production instance must exit for its supervisor to detect it.
      if (process.env.NODE_ENV === 'production') {
        console.error(error instanceof Error ? error.message : 'Invalid server configuration.');
        process.exit(1);
      }
      throw error;
    }
  }
}
