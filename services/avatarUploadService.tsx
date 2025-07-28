class AvatarUploadService {
  
  async uploadAvatar(
    imageUri: string, 
    userId: string,
    onProgress?: (progress: any) => void
  ): Promise<string> {
    try {
      console.log('🚀 Starting ENHANCED avatar upload process...');
      console.log('📁 Original image URI:', imageUri);
      
      // Step 1: Verify source file exists and has content
      const sourceFileInfo = await FileSystem.getInfoAsync(imageUri);
      console.log('📋 Source file info:', {
        exists: sourceFileInfo.exists,
        size: sourceFileInfo.size,
        isDirectory: sourceFileInfo.isDirectory
      });
      
      if (!sourceFileInfo.exists) {
        throw new Error('Source image file does not exist');
      }
      
      if (sourceFileInfo.size === 0) {
        throw new Error('Source image file is empty');
      }
      
      console.log(`✅ Source file verified: ${(sourceFileInfo.size / 1024).toFixed(2)} KB`);
      
      // Step 2: Compress the image
      const compressedUri = await this.compressAvatarImage(imageUri);
      console.log('✂️ Image compressed successfully');
      
      // Step 3: Verify compressed file
      const compressedFileInfo = await FileSystem.getInfoAsync(compressedUri);
      console.log('📋 Compressed file info:', {
        exists: compressedFileInfo.exists,
        size: compressedFileInfo.size
      });
      
      if (compressedFileInfo.size === 0) {
        throw new Error('Compressed image file is empty');
      }
      
      // Step 4: Enhanced file preparation with validation
      const fileData = await this.prepareFileForUploadEnhanced(compressedUri);
      console.log('📦 File prepared for upload:', {
        size: `${(fileData.size / 1024).toFixed(2)} KB`,
        type: fileData.type,
        blobSize: fileData.blob.size
      });
      
      // Step 5: Validate blob has content
      if (fileData.blob.size === 0) {
        throw new Error('Prepared blob is empty - file preparation failed');
      }
      
      // Step 6: Generate filename and upload
      const fileName = this.generateAvatarFileName(userId);
      console.log('📝 Generated filename:', fileName);
      
      // Step 7: Enhanced upload with content validation
      const fileId = await this.uploadToStorageEnhanced(fileData.blob, fileName, fileData.type);
      console.log('☁️ Uploaded to storage with ID:', fileId);
      
      // Step 8: Verify uploaded file has content
      await this.verifyUploadedFile(fileId);
      
      // Step 9: Generate and return URL
      const publicUrl = this.getPublicUrl(fileId);
      console.log('🔗 Public URL generated:', publicUrl);
      
      return publicUrl;
      
    } catch (error) {
      console.error('❌ Enhanced avatar upload failed:', error);
      throw new Error(`Failed to upload avatar: ${error.message || error}`);
    }
  }

  // Enhanced file preparation with better validation
  private async prepareFileForUploadEnhanced(imageUri: string): Promise<{
    blob: Blob;
    size: number;
    type: string;
  }> {
    try {
      console.log('📤 Enhanced file preparation starting...');
      console.log('📁 Processing URI:', imageUri);
      
      // Get file info first
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      console.log('📋 File info:', fileInfo);
      
      if (!fileInfo.exists) {
        throw new Error('Image file not found during preparation');
      }

      // Read file as base64 first to verify content
      console.log('📖 Reading file as base64...');
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log(`📏 Base64 length: ${base64.length} characters`);
      
      if (base64.length === 0) {
        throw new Error('File content is empty (base64 read failed)');
      }
      
      // Convert base64 to blob
      console.log('🔄 Converting base64 to blob...');
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      console.log('📦 Blob created:', {
        size: blob.size,
        type: blob.type
      });
      
      if (blob.size === 0) {
        throw new Error('Blob creation resulted in empty file');
      }
      
      return {
        blob,
        size: blob.size,
        type: 'image/jpeg',
      };
    } catch (error) {
      console.error('❌ Enhanced file preparation failed:', error);
      throw new Error(`Failed to prepare file: ${error.message}`);
    }
  }

  // Enhanced upload with explicit content type
  private async uploadToStorageEnhanced(
    blob: Blob,
    fileName: string,
    contentType: string
  ): Promise<string> {
    try {
      console.log('☁️ Enhanced storage upload starting...');
      console.log('📋 Upload details:', {
        fileName,
        blobSize: blob.size,
        contentType,
        bucketId: appwriteConfig.avatarBucketId
      });
      
      // Create File object with explicit type
      const file = new File([blob], fileName, { 
        type: contentType,
        lastModified: Date.now()
      });
      
      console.log('📁 File object created:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      if (file.size === 0) {
        throw new Error('File object is empty before upload');
      }
      
      // Upload with detailed logging
      console.log('📤 Initiating Appwrite storage upload...');
      const response = await storage.createFile(
        appwriteConfig.avatarBucketId,
        generateId(),
        file
      );
      
      console.log('✅ Upload response:', {
        fileId: response.$id,
        name: response.name,
        sizeUploaded: response.sizeOriginal,
        mimeType: response.mimeType
      });
      
      return response.$id;
    } catch (error) {
      console.error('❌ Enhanced storage upload failed:', error);
      throw error;
    }
  }

  // Verify uploaded file has content
  private async verifyUploadedFile(fileId: string): Promise<void> {
    try {
      console.log('🔍 Verifying uploaded file...');
      
      // Get file info from Appwrite
      const fileInfo = await storage.getFile(appwriteConfig.avatarBucketId, fileId);
      console.log('📋 Uploaded file info:', {
        id: fileInfo.$id,
        name: fileInfo.name,
        size: fileInfo.sizeOriginal,
        mimeType: fileInfo.mimeType
      });
      
      if (fileInfo.sizeOriginal === 0) {
        console.error('🚨 UPLOADED FILE IS EMPTY!');
        throw new Error('File uploaded successfully but contains no data');
      }
      
      if (!fileInfo.mimeType?.startsWith('image/')) {
        console.warn('⚠️ Uploaded file has wrong MIME type:', fileInfo.mimeType);
      }
      
      console.log('✅ File verification passed');
    } catch (error) {
      console.error('❌ File verification failed:', error);
      throw new Error(`Uploaded file verification failed: ${error.message}`);
    }
  }

  // Keep existing helper methods
  private async compressAvatarImage(imageUri: string): Promise<string> {
    return await imageCompressionService.compressForAvatar(imageUri);
  }

  private generateAvatarFileName(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `avatar_${userId}_${timestamp}_${random}.jpg`;
  }

  private getPublicUrl(fileId: string): string {
    try {
      const url = storage.getFileView(appwriteConfig.avatarBucketId, fileId);
      return url.toString();
    } catch (error) {
      throw new Error(`Failed to generate public URL: ${error.message}`);
    }
  }
}
