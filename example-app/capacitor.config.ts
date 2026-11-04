import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'so.tapp.capacitor.example',
  appName: 'Tapp Capacitor Example',
  webDir: 'dist',
  // Capacitor debug logging prints plugin call arguments, including credentials.
  loggingBehavior: 'production',
};

export default config;
