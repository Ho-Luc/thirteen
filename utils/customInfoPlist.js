const { withInfoPlist } = require("@expo/config-plugins");

function withCustomInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    // Force add the photo library permissions
    config.modResults.NSPhotoLibraryUsageDescription = 
      "Thirteen needs access to your photo library to let you select a profile picture for your Bible reading groups.";
    
    config.modResults.NSCameraUsageDescription = 
      "Thirteen needs access to your camera to let you take a profile picture for your Bible reading groups.";
    
    config.modResults.NSPhotoLibraryAddUsageDescription = 
      "Thirteen needs permission to save photos to your photo library when you want to save images shared in your Bible reading groups.";
    
    return config;
  });
}

module.exports = withCustomInfoPlist;