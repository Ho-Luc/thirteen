import { storage, appwriteConfig, generateId } from '../lib/appwrite';
import { imageCompressionService } from './imageCompressionService';

class AvatarUploadService {
  
  async uploadAvatar(
    imageUri: string, 
    userId: string,
    onProgress?: (progress: any) => void
  ): Promise<string> {
    try {
      // Step 1: Compress the image
      const compressedUri = await this.compressAvatarImage(imageUri);
      
      // Step 2: Generate filename
      const fileName = this.generateAvatarFileName(userId);
      
      // Step 3: Upload to Appwrite using the best method
      const fileId = await this.uploadToAppwrite(compressedUri, fileName);
      
      // Step 4: Generate and return URL
      const publicUrl = this.getPublicUrl(fileId);
      
      return publicUrl;
      
    } catch (error: any) {
      throw new Error(`Failed to upload avatar: ${error.message || error}`);
    }
  }

  // Smart upload method that chooses the best approach
  private async uploadToAppwrite(
    imageUri: string,
    fileName: string
  ): Promise<string> {
    const fileId = generateId();
    
    // For React Native, always use FormData for local files
    // This avoids the "File not found in payload" SDK error
    if (imageUri.startsWith('file://')) {
      return await this.uploadWithFormData(imageUri, fileName, fileId);
    }
    
    // For remote URLs, try SDK first, then FormData
    try {
      return await this.uploadWithSDK(imageUri, fileName, fileId);
    } catch (sdkError: any) {
      return await this.uploadWithFormData(imageUri, fileName, fileId);
    }
  }

  // FormData upload method (works reliably for React Native)
  private async uploadWithFormData(
    imageUri: string,
    fileName: string,
    fileId: string
  ): Promise<string> {
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('fileId', fileId);
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName,
      } as any);
      
      // Upload using fetch
      const endpoint = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.avatarBucketId}/files`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Appwrite-Project': appwriteConfig.projectId,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: HTTP ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      return result.$id;
      
    } catch (error: any) {
      throw new Error(`FormData upload failed: ${error.message}`);
    }
  }

  // SDK upload method (fallback for remote URLs)
  private async uploadWithSDK(
    imageUri: string,
    fileName: string,
    fileId: string
  ): Promise<string> {
    try {
      const fileObject = {
        name: fileName,
        type: 'image/jpeg',
        uri: imageUri,
      };
      
      const response = await storage.createFile(
        appwriteConfig.avatarBucketId,
        fileId,
        fileObject
      );
      
      return response.$id;
      
    } catch (error: any) {
      throw error;
    }
  }

  // Compress avatar image with error handling
  private async compressAvatarImage(imageUri: string): Promise<string> {
    try {
      return await imageCompressionService.compressForAvatar(imageUri);
    } catch (error: any) {
      return imageUri;
    }
  }

  // Generate unique filename for avatar
  private generateAvatarFileName(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `avatar_${userId}_${timestamp}_${random}.jpg`;
  }

  // Get public URL for uploaded file
  private getPublicUrl(fileId: string): string {
    try {
      const url = storage.getFileView(appwriteConfig.avatarBucketId, fileId);
      return url.toString();
    } catch (error: any) {
      throw new Error(`Failed to generate public URL: ${error.message}`);
    }
  }

  // Test upload capabilities
  async testUploadCapability(): Promise<boolean> {
    try {
      if (!appwriteConfig.avatarBucketId) {
        return false;
      }
      
      // Test storage connection
      await storage.listFiles(appwriteConfig.avatarBucketId, [], 1);
      return true;
      
    } catch (error: any) {
      return false;
    }
  }

  // Delete old avatar file
  async deleteOldAvatar(avatarUrl: string): Promise<void> {
    try {
      if (!avatarUrl || !avatarUrl.includes('/files/')) {
        return;
      }

      const fileIdMatch = avatarUrl.match(/\/files\/([^\/]+)\//);
      if (!fileIdMatch) {
        return;
      }

      const fileId = fileIdMatch[1];
      
      await storage.deleteFile(appwriteConfig.avatarBucketId, fileId);
      
    } catch (error: any) {
      // Handle error silently
    }
  }

  // Get configuration info for debugging
  getUploadInfo() {
    return {
      bucketConfigured: !!appwriteConfig.avatarBucketId,
      bucketId: appwriteConfig.avatarBucketId || 'NOT_CONFIGURED',
      endpoint: appwriteConfig.endpoint,
      projectId: appwriteConfig.projectId.substring(0, 8) + '...',
    };
  }
}

export const avatarUploadService = new AvatarUploadService();