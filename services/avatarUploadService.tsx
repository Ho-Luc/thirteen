// services/avatarUploadService.tsx - Simplified React Native compatible version
import { storage, appwriteConfig, generateId } from '../lib/appwrite';
import { imageCompressionService } from './imageCompressionService';

class AvatarUploadService {
  
  async uploadAvatar(
    imageUri: string, 
    userId: string,
    onProgress?: (progress: any) => void
  ): Promise<string> {
    try {
      console.log('🚀 Starting simplified avatar upload for React Native...');
      console.log('📁 Original image URI:', imageUri);
      
      // Step 1: Compress the image
      const compressedUri = await this.compressAvatarImage(imageUri);
      console.log('✂️ Image compressed successfully:', compressedUri);
      
      // Step 2: Generate filename
      const fileName = this.generateAvatarFileName(userId);
      console.log('📝 Generated filename:', fileName);
      
      // Step 3: Use Appwrite SDK with simple file object
      const fileId = await this.uploadToAppwriteSimple(compressedUri, fileName);
      console.log('☁️ Uploaded to storage with ID:', fileId);
      
      // Step 4: Generate and return URL
      const publicUrl = this.getPublicUrl(fileId);
      console.log('🔗 Public URL generated:', publicUrl);
      
      return publicUrl;
      
    } catch (error: any) {
      console.error('❌ Simplified avatar upload failed:', error);
      throw new Error(`Failed to upload avatar: ${error.message || error}`);
    }
  }

  // Simplified upload using direct file URI
  private async uploadToAppwriteSimple(
    imageUri: string,
    fileName: string
  ): Promise<string> {
    try {
      console.log('☁️ Simplified Appwrite upload...');
      console.log('📋 Upload details:', {
        fileName,
        imageUri: imageUri.substring(0, 50) + '...',
        bucketId: appwriteConfig.avatarBucketId
      });
      
      // Generate unique file ID
      const fileId = generateId();
      
      // Create simple file object for React Native
      const fileObject = {
        name: fileName,
        type: 'image/jpeg',
        uri: imageUri,
      };
      
      console.log('📤 Calling Appwrite createFile with simple object...');
      
      try {
        const response = await storage.createFile(
          appwriteConfig.avatarBucketId,
          fileId,
          fileObject
        );
        
        console.log('✅ Upload successful:', {
          fileId: response.$id,
          name: response.name,
          sizeUploaded: response.sizeOriginal,
          mimeType: response.mimeType
        });
        
        return response.$id;
        
      } catch (appwriteError: any) {
        console.error('❌ Appwrite upload error details:', {
          message: appwriteError.message,
          code: appwriteError.code,
          type: appwriteError.type
        });
        
        // Try alternative approach with FormData
        console.log('🔄 Trying alternative FormData approach...');
        return await this.uploadWithFormData(imageUri, fileName, fileId);
      }
      
    } catch (error: any) {
      console.error('❌ Simplified upload failed:', error);
      throw error;
    }
  }

  // Alternative upload using FormData
  private async uploadWithFormData(
    imageUri: string,
    fileName: string,
    fileId: string
  ): Promise<string> {
    try {
      console.log('📤 Using FormData upload approach...');
      
      // Create FormData
      const formData = new FormData();
      formData.append('fileId', fileId);
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName,
      } as any);
      
      // Manual upload using fetch (if Appwrite SDK fails)
      const endpoint = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.avatarBucketId}/files`;
      
      console.log('🌐 Manual upload endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Appwrite-Project': appwriteConfig.projectId,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ FormData upload successful:', result);
      
      return result.$id;
      
    } catch (error: any) {
      console.error('❌ FormData upload failed:', error);
      throw new Error(`FormData upload failed: ${error.message}`);
    }
  }

  // Compress avatar image with error handling
  private async compressAvatarImage(imageUri: string): Promise<string> {
    try {
      return await imageCompressionService.compressForAvatar(imageUri);
    } catch (error: any) {
      console.warn('⚠️ Image compression failed, using original:', error.message);
      // Return original URI if compression fails
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

  // Test method to verify upload capabilities
  async testUploadCapability(): Promise<boolean> {
    try {
      console.log('🧪 Testing upload capability...');
      
      // Check if required services are available
      if (!appwriteConfig.avatarBucketId) {
        console.log('❌ No avatar bucket configured');
        return false;
      }
      
      // Test storage connection
      try {
        await storage.listFiles(appwriteConfig.avatarBucketId, [], 1);
        console.log('✅ Storage connection working');
        return true;
      } catch (storageError: any) {
        console.log('❌ Storage connection failed:', storageError.message);
        return false;
      }
      
    } catch (error: any) {
      console.log('❌ Upload capability test failed:', error.message);
      return false;
    }
  }

  // Delete old avatar file from storage
  async deleteOldAvatar(avatarUrl: string): Promise<void> {
    try {
      if (!avatarUrl || !avatarUrl.includes('/files/')) {
        console.log('⚠️ Invalid avatar URL for deletion:', avatarUrl);
        return;
      }

      // Extract file ID from URL
      const urlParts = avatarUrl.split('/files/');
      if (urlParts.length < 2) {
        console.log('⚠️ Could not extract file ID from URL:', avatarUrl);
        return;
      }

      const fileIdPart = urlParts[1].split('/')[0];
      
      if (!fileIdPart) {
        console.log('⚠️ Empty file ID extracted from URL:', avatarUrl);
        return;
      }

      console.log('🗑️ Deleting old avatar file:', fileIdPart);
      
      await storage.deleteFile(appwriteConfig.avatarBucketId, fileIdPart);
      console.log('✅ Old avatar deleted successfully');
    } catch (error: any) {
      // Don't throw error for old avatar deletion to avoid blocking new avatar upload
      console.warn('⚠️ Failed to delete old avatar (non-critical):', error.message);
    }
  }
}

// Export a singleton instance
export const avatarUploadService = new AvatarUploadService();