import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.gustavo.partituras',
  appName: 'Cadenza',
  webDir: 'www',
  server: {
    url: 'https://sheet-music-study.vercel.app',
    cleartext: false,
  },
}

export default config
