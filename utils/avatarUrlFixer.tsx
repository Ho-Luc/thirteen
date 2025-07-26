// utils/avatarUrlFixer.ts
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
   * Process avatar URL with repair if needed
   */
  static processAvatarUrl(avatarUrl: string | null | undefined): string | undefined {
    if (!avatarUrl) {
      return undefined;
    }

    // If URL looks complete, use as-is
    if (avatarUrl.includes('?project=') && avatarUrl.length > 100) {
      console.log('✅ Avatar URL looks complete, using as-is');
      return avatarUrl;
    }

    // Try to repair if truncated
    const repairedUrl = this.repairTruncatedUrl(avatarUrl);
    if (repairedUrl) {
      console.log('🔧 Avatar URL repaired successfully');
      return repairedUrl;
    }

    // If we can't repair, log the issue but don't break the app
    console.warn('⚠️ Could not repair avatar URL:', avatarUrl);
    return undefined; // Return undefined to show default avatar
  }
}

/**
 * Helper function to fix avatar URLs in group member data
 */
export const fixAvatarUrls = (members: any[]): any[] => {
  return members.map(member => {
    let processedAvatarUrl;
    
    if (member.avatarUrl === null || member.avatarUrl === undefined) {
      // No avatar
      processedAvatarUrl = undefined;
    } else if (typeof member.avatarUrl === 'string' && member.avatarUrl.trim() !== '') {
      // Has avatar URL - process it
      const originalUrl = member.avatarUrl;
      
      // If URL looks complete, use as-is
      if (originalUrl.includes('?project=') && originalUrl.length > 100) {
        processedAvatarUrl = originalUrl;
        console.log(`✅ Using complete avatar URL for ${member.userName}: ${originalUrl.substring(0, 50)}...`);
      } else {
        // Try to repair if truncated
        const repairedUrl = AvatarUrlFixer.repairTruncatedUrl(originalUrl);
        if (repairedUrl) {
          processedAvatarUrl = repairedUrl;
          console.log(`🔧 Repaired avatar URL for ${member.userName}: ${repairedUrl.substring(0, 50)}...`);
        } else {
          // If we can't repair, log the issue but don't break the app
          console.warn('⚠️ Could not process avatar URL for', member.userName, ':', originalUrl);
          processedAvatarUrl = undefined;
        }
      }
    } else {
      // Invalid/empty URL
      processedAvatarUrl = undefined;
    }

    return {
      ...member,
      avatarUrl: processedAvatarUrl
    };
  });
};