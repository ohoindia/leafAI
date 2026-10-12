const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withFertilizerApp(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.queries = manifest.queries || [];
    const query = manifest.queries[0] || {};
    query.package = query.package || [];
    if (
      !query.package.some(
        (item) => item.$?.["android:name"] === "com.agristack.fsas",
      )
    ) {
      query.package.push({ $: { "android:name": "com.agristack.fsas" } });
    }
    manifest.queries[0] = query;
    return config;
  });
};
