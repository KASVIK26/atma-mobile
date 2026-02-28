const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Sets windowSoftInputMode="adjustNothing" on the MainActivity.
 *
 * Why: edgeToEdgeEnabled:true defaults Android to adjustResize which
 * physically shrinks the window height when the keyboard opens, causing
 * the entire screen to jump. With adjustNothing the OS does nothing —
 * our JS KeyboardAvoidingView handles it cleanly instead.
 */
module.exports = function withAndroidKeyboard(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (!mainApplication) return config;

    const activities = mainApplication.activity || [];
    const mainActivity = activities.find(
      (a) =>
        a.$?.['android:name'] === '.MainActivity' ||
        a.$?.['android:name'] === 'com.atma.atma_mobile.MainActivity'
    );

    if (mainActivity) {
      mainActivity.$['android:windowSoftInputMode'] = 'adjustNothing';
    } else if (activities.length > 0) {
      // Fallback: patch the first activity
      activities[0].$['android:windowSoftInputMode'] = 'adjustNothing';
    }

    return config;
  });
};
