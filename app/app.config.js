module.exports = ({ config }) => ({
  ...config,
  plugins: (config.plugins ?? []).map((plugin) =>
    plugin === 'expo-build-properties'
      ? [
          'expo-build-properties',
          { android: process.platform === 'win32' ? { cmakeVersion: '3.31.6' } : {} },
        ]
      : plugin,
  ),
});
