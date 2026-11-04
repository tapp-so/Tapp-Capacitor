import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'so.tapp.capacitor.example',
  appName: 'Tapp Capacitor Example',
  webDir: 'dist',
  // 'none' turns Capacitor bridge logging off entirely, so plugin call
  // arguments, including credentials, are never logged.
  loggingBehavior: 'none',
};

export default config;
