// services/avatarUploadService.ts
import { storage, appwriteConfig, generateId } from '../lib/appwrite';
import { imageCompressionService } from './imageCompressionService';
import * as FileSystem from 'expo-file-system';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Service for handling avatar uploads to Appwrite storage
 * Handles compression, upload, and URL generation
 */
class AvatarUploadService {
  
  /**
   * Upload an avatar image to Appwrite storage
   * @param imageUri - Local image URI (from camera/gallery)
   * @param userId - User ID for unique naming
   * @returns Public URL of uploaded image
   */
  async uploadAvatar(
    imageUri: string, 
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      console.log('🚀 Starting avatar upload process...');
      console.log('📁 Original image URI:', imageUri);
      
      // Step 1: Compress the image for optimal storage
      const compressedUri = await this.compressAvatarImage(imageUri);
      console.log('✂️ Image compressed successfully');
      
      // Step 2: Prepare file for upload
      const fileData = await this.prepareFileForUpload(compressedUri);
      console.log('📦 File prepared for upload:', {
        size: `${(fileData.size / 1024).toFixed(2)} KB`,
        type: fileData.type
      });
      
      // Step 3: Generate unique filename
      const fileName = this.generateAvatarFileName(userId);
      console.log('📝 Generated filename:', fileName);
      
      // Step 4: Delete old avatar if exists
      await this.deleteOldAvatar(userId);
      
      // Step 5: Upload to Appwrite storage
      const fileId = await this.uploadToStorage(fileData.blob, fileName, onProgress);
      console.log('☁️ Uploaded to storage with ID:', fileId);
      
      // Step 6: Get public URL
      const publicUrl = this.getPublicUrl(fileId);
      console.log('🔗 Public URL generated:', publicUrl);
      
      // Step 7: Cleanup compressed file
      await this.cleanupTempFile(compressedUri);
      
      return publicUrl;
      
    } catch (error) {
      console.error('❌ Avatar upload failed:', error);
      throw new Error(`Failed to upload avatar: ${error.message || error}`);
    }
  }

  /**
   * Delete user's current avatar from storage
   */
  async deleteUserAvatar(userId: string): Promise<void> {
    try {
      await this.deleteOldAvatar(userId);
      console.log('🗑️ User avatar deleted successfully');
    } catch (error) {
      console.error('Error deleting avatar:', error);
      // Don't throw - avatar deletion failure shouldn't break the app
    }
  }

  /**
   * Get avatar URL for a user (if exists)
   */
  getAvatarUrl(fileId: string): string {
    return this.getPublicUrl(fileId);
  }

  // ============== PRIVATE METHODS ==============

  /**
   * Compress image specifically for avatar use
   */
  private async compressAvatarImage(imageUri: string): Promise<string> {
    return imageCompressionService.compressForAvatar(imageUri);
  }

  /**
   * Convert image URI to blob for upload
   */
  private async prepareFileForUpload(imageUri: string): Promise<{
    blob: Blob;
    size: number;
    type: string;
  }> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (!fileInfo.exists) {
        throw new Error('Image file not found');
      }

      // Convert to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return {
        blob,
        size: fileInfo.size || blob.size,
        type: blob.type || 'image/jpeg',
      };
    } catch (error) {
      throw new Error(`Failed to prepare file: ${error.message}`);
    }
  }

  /**
   * Generate unique filename for avatar
   */
  private generateAvatarFileName(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `avatar_${userId}_${timestamp}_${random}.jpg`;
  }

  /**
   * Upload blob to Appwrite storage
   */
  private async uploadToStorage(
    blob: Blob,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      // Create File object from blob
      const file = new File([blob], fileName, { type: blob.type });
      
      // Upload to Appwrite storage
      const response = await storage.createFile(
        appwriteConfig.avatarBucketId,
        generateId(),
        file
      );
      
      return response.$id;
    } catch (error) {
      if (error.message?.includes('bucket')) {
        throw new Error('Avatar storage not configured. Please check avatarBucketId in environment variables.');
      }
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Get public URL for uploaded file
   */
  private getPublicUrl(fileId: string): string {
    try {
      const url = storage.getFileView(appwriteConfig.avatarBucketId, fileId);
      const urlString = url.toString();
      
      // Log the URL length to help with debugging
      console.log(`🔗 Generated avatar URL length: ${urlString.length} chars`);
      
      // Updated message since we now support 500 chars
      if (urlString.length > 500) {
        console.warn(`⚠️ Avatar URL is ${urlString.length} chars - may be truncated in database (500 char limit)`);
        console.log('💡 Consider increasing avatarUrl field size in database to 1000+ characters');
      } else if (urlString.length > 100) {
        console.log(`✅ Avatar URL (${urlString.length} chars) should fit in 500-char database field`);
      }
      
      return urlString;
    } catch (error) {
      throw new Error(`Failed to generate public URL: ${error.message}`);
    }
  }

  /**
   * Delete old avatar files for user
   */
  private async deleteOldAvatar(userId: string): Promise<void> {
    try {
      // List all files in the bucket
      const files = await storage.listFiles(appwriteConfig.avatarBucketId);
      
      // Find files that start with this user's avatar prefix
      const userAvatarFiles = files.files.filter(file => 
        file.name.startsWith(`avatar_${userId}_`)
      );
      
      // Delete old avatar files
      const deletePromises = userAvatarFiles.map(file =>
        storage.deleteFile(appwriteConfig.avatarBucketId, file.$id)
          .catch(error => {
            console.warn(`Failed to delete old avatar ${file.$id}:`, error);
          })
      );
      
      await Promise.allSettled(deletePromises);
      
      if (userAvatarFiles.length > 0) {
        console.log(`🧹 Cleaned up ${userAvatarFiles.length} old avatar files`);
      }
    } catch (error) {
      console.warn('Error cleaning up old avatars:', error);
      // Don't throw - old file cleanup failure shouldn't break new upload
    }
  }

  /**
   * Clean up temporary compressed file
   */
  private async cleanupTempFile(tempUri: string): Promise<void> {
    try {
      if (tempUri.startsWith('file://')) {
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
        console.log('🧹 Temporary file cleaned up');
      }
    } catch (error) {
      console.warn('Failed to cleanup temp file:', error);
      // Don't throw - temp file cleanup is not critical
    }
  }

  /**
   * Validate image file before upload
   */
  private validateImageFile(blob: Blob): void {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (blob.size > maxSize) {
      throw new Error('Image too large. Please choose an image under 5MB.');
    }
    
    if (!allowedTypes.includes(blob.type)) {
      throw new Error('Invalid image format. Please use JPEG, PNG, or WebP.');
    }
  }

  /**
   * Extract file ID from Appwrite URL
   */
  extractFileIdFromUrl(avatarUrl: string): string | null {
    try {
      // Appwrite URLs typically end with the file ID
      const urlParts = avatarUrl.split('/');
      return urlParts[urlParts.length - 1] || null;
    } catch (error) {
      return null;
    }
  }
}

export const avatarUploadService = new AvatarUploadService();