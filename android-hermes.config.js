// Hermes Configuration to prevent GC crashes
// This increases the JavaScript stack size to handle deep component hierarchies

module.exports = {
  // Increase stack size for Hermes GC (default is too small)
  hermesFlags: {
    "-Xmx": "512m",  // Max heap size
    "-Xms": "128m",  // Initial heap size
    "-XX:HeapGrowthLimit": "384m",
    "-XX:MaxPermSize": "256m"
  },
  
  // Enable GC optimizations
  enableHermes: true,
  enableHermesForDebugBuilds: true,
  
  // Disable aggressive optimizations that can cause GC issues
  inlineRequires: false,
};
