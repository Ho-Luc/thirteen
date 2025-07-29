// utils/avatarUrlFixer.tsx - Cleaned for production (TODO #5)
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
      // Extract the file ID from the truncated URL
      const fileIdMatch = truncatedUrl.match(/files\/([a-f0-9]+)\/view/);
      
      if (fileIdMatch && fileIdMatch[1]) {
        const fileId = fileIdMatch[1];
        const projectId = appwriteConfig.projectId;
        
        // Reconstruct the full URL
        const repairedUrl = `https://nyc.cloud.appwrite.io/v1/storage/buckets/user_avatars/files/${fileId}/view?project=${projectId}`;
        
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

    // HANDLE LOCAL FILE URLS - Don't try to "fix" these
    if (avatarUrl.startsWith('file://')) {
      return avatarUrl;
    }

    // HANDLE CLOUD URLS
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      // If URL looks complete, use as-is
      if (avatarUrl.includes('?project=') && avatarUrl.length > 100) {
        return avatarUrl;
      }

      // Try to repair if truncated
      const repairedUrl = this.repairTruncatedUrl(avatarUrl);
      if (repairedUrl) {
        return repairedUrl;
      }

      // If we can't repair but it's a cloud URL, keep it
      return avatarUrl;
    }

    // FALLBACK - If it's neither local nor http, keep as-is
    return avatarUrl;
  }
}

/**
 * Helper function to fix avatar URLs in group member data
 */
export const fixAvatarUrls = (members: any[]): any[] => {
  return members.map(member => {
    let processedAvatarUrl;
    
    if (member.avatarUrl === null || member.avatarUrl === undefined || member.avatarUrl === '') {
      // No avatar
      processedAvatarUrl = undefined;
    } else {
      // Process the avatar URL
      processedAvatarUrl = AvatarUrlFixer.processAvatarUrl(member.avatarUrl);
    }

    const result = {
      ...member,
      avatarUrl: processedAvatarUrl
    };
    
    return result;
  });
};