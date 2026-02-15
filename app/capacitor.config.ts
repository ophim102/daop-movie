import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.daop.phim',
  appName: 'DAOP Phim',
  webDir: '../public',
  server: {
    androidScheme: 'https',
  },
};

export default config;
