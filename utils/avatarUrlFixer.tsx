// utils/avatarUrlFixer.tsx - Fixed to handle local file URLs properly

import { appwriteConfig } from '../lib/appwrite';

/**
 * Repairs truncated Appwrite avatar URLs
 */
export class AvatarUrlFixer {
  
  /**
   * Detect if a URL is truncated and attempt to repair it
   */
  static repairTruncatedUrl(truncatedUrl: string): string | null {
    if (!truncatedUrl || truncatedUrl.length < 50) {
      return null; // Too short to be a truncated Appwrite URL
    }
    
    // Check if it's a truncated Appwrite URL
    const appwritePattern = /^https:\/\/[^\/]+\.appwrite\.io\/v1\/storage\/buckets\/user_avatars\/files\/[a-f0-9]+\/view\?projec$/;
    
    if (appwritePattern.test(truncatedUrl)) {
      console.log('🔧 Detected truncated Appwrite URL, attempting repair...');
      
      // Extract the file ID from the truncated URL
      const fileIdMatch = truncatedUrl.match(/files\/([a-f0-9]+)\/view/);
      
      if (fileIdMatch && fileIdMatch[1]) {
        const fileId = fileIdMatch[1];
        const projectId = appwriteConfig.projectId;
        
        // Reconstruct the full URL
        const repairedUrl = `https://nyc.cloud.appwrite.io/v1/storage/buckets/user_avatars/files/${fileId}/view?project=${projectId}`;
        
        console.log('✅ URL repaired:', {
          original: truncatedUrl,
          repaired: repairedUrl,
          fileId: fileId
        });
        
        return repairedUrl;
      }
    }
    
    return null; // Cannot repair
  }
  
  /**
   * Process avatar URL with repair if needed - FIXED VERSION
   */
  static processAvatarUrl(avatarUrl: string | null | undefined): string | undefined {
    if (!avatarUrl) {
      return undefined;
    }

    console.log(`🔍 Processing avatar URL: ${avatarUrl.substring(0, 80)}...`);

    // HANDLE LOCAL FILE URLS - Don't try to "fix" these
    if (avatarUrl.startsWith('file://')) {
      console.log('📁 Local file URL detected - keeping as-is');
      return avatarUrl;
    }

    // HANDLE CLOUD URLS
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      // If URL looks complete, use as-is
      if (avatarUrl.includes('?project=') && avatarUrl.length > 100) {
        console.log('✅ Cloud URL looks complete, using as-is');
        return avatarUrl;
      }

      // Try to repair if truncated
      const repairedUrl = this.repairTruncatedUrl(avatarUrl);
      if (repairedUrl) {
        console.log('🔧 Cloud URL repaired successfully');
        return repairedUrl;
      }

      // If we can't repair but it's a cloud URL, log warning but keep it
      console.warn('⚠️ Could not repair cloud URL, but keeping it:', avatarUrl.substring(0, 50));
      return avatarUrl;
    }

    // FALLBACK - If it's neither local nor http, keep as-is
    console.log('🤷 Unknown URL format, keeping as-is');
    return avatarUrl;
  }
}

/**
 * Helper function to fix avatar URLs in group member data - FIXED VERSION
 */
export const fixAvatarUrls = (members: any[]): any[] => {
  return members.map(member => {
    console.log(`\n🔧 Processing avatar for: ${member.userName}`);
    console.log(`📥 Original avatar URL: ${member.avatarUrl || 'NONE'}`);
    
    let processedAvatarUrl;
    
    if (member.avatarUrl === null || member.avatarUrl === undefined || member.avatarUrl === '') {
      // No avatar
      processedAvatarUrl = undefined;
      console.log('📝 No avatar to process');
    } else {
      // Process the avatar URL
      processedAvatarUrl = AvatarUrlFixer.processAvatarUrl(member.avatarUrl);
      console.log(`📤 Processed avatar URL: ${processedAvatarUrl ? processedAvatarUrl.substring(0, 80) + '...' : 'NONE'}`);
    }

    const result = {
      ...member,
      avatarUrl: processedAvatarUrl
    };

    console.log(`✅ Final result for ${member.userName}: ${result.avatarUrl ? 'HAS AVATAR' : 'NO AVATAR'}`);
    
    return result;
  });
};