module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated debe ir siempre al final.
    plugins: ['react-native-reanimated/plugin'],
  };
};
