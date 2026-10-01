import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thekirankumarv.fairsplit',
  appName: 'FairSplit',
  webDir: 'dist',
  android: {
    backgroundColor: '#0c0a09',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#0c0a09',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0c0a09',
      overlaysWebView: false,
    },
  },
};

export default config;
