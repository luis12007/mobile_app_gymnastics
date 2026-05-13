const { withAndroidManifest } = require('@expo/config-plugins');

// Adds android:largeHeap="true" to <application> so Android gives the process
// a larger Dalvik/ART heap. Mitigates OutOfMemoryError on devices that render
// many photos/views (whiteboard + scoring tables).
module.exports = function withLargeHeap(config) {
  return withAndroidManifest(config, (cfg) => {
    const application =
      cfg.modResults?.manifest?.application?.[0];
    if (application && application.$) {
      application.$['android:largeHeap'] = 'true';
    }
    return cfg;
  });
};
