import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'png';
}

class ImageCompressionService {
  private defaultOptions: CompressionOptions = {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.7,
    format: 'jpeg',
  };

  /**
   * Compress an image to reduce file size while maintaining quality
   * @param imageUri - URI of the image to compress
   * @param options - Compression options
   * @returns Promise<string> - URI of the compressed image
   */
  async compressImage(
    imageUri: string, 
    options: CompressionOptions = {}
  ): Promise<string> {
    try {
      const compressionOptions = { ...this.defaultOptions, ...options };
      
      // Get original image info
      const imageInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (imageInfo.exists && 'size' in imageInfo) {
        console.log('Original image size:', (imageInfo.size / 1024).toFixed(2) + ' KB');
      } else {
        console.log('Could not get original image size');
      }

      // Resize and compress the image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: compressionOptions.maxWidth,
              height: compressionOptions.maxHeight,
            },
          },
        ],
        {
          compress: compressionOptions.quality,
          format: compressionOptions.format === 'jpeg' 
            ? ImageManipulator.SaveFormat.JPEG 
            : ImageManipulator.SaveFormat.PNG,
          base64: false,
        }
      );

      // Get compressed image info
      const compressedInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
      
      if (compressedInfo.exists && 'size' in compressedInfo) {
        console.log('Compressed image size:', (compressedInfo.size / 1024).toFixed(2) + ' KB');
        
        // Calculate compression ratio if both sizes are available
        if (imageInfo.exists && 'size' in imageInfo) {
          const compressionRatio = ((imageInfo.size - compressedInfo.size) / imageInfo.size * 100).toFixed(1);
        }
      } else {
      }

      return manipulatedImage.uri;
    } catch (error) {
      return imageUri;
    }
  }

  /**
   * Compress multiple images
   * @param imageUris - Array of image URIs to compress
   * @param options - Compression options
   * @returns Promise<string[]> - Array of compressed image URIs
   */
  async compressMultipleImages(
    imageUris: string[], 
    options: CompressionOptions = {}
  ): Promise<string[]> {
    try {
      const compressionPromises = imageUris.map(uri => 
        this.compressImage(uri, options)
      );
      
      return await Promise.all(compressionPromises);
    } catch (error) {
      return imageUris; // Return original URIs if compression fails
    }
  }

  /**
   * Get image dimensions and file size
   * @param imageUri - URI of the image
   * @returns Promise with image info
   */
  async getImageInfo(imageUri: string) {
    try {
      const [fileInfo, imageInfo] = await Promise.all([
        FileSystem.getInfoAsync(imageUri),
        ImageManipulator.manipulateAsync(imageUri, [], { base64: false })
      ]);

      return {
        uri: imageUri,
        size: (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size : undefined,
        width: imageInfo.width,
        height: imageInfo.height,
        exists: fileInfo.exists,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Create thumbnail from image
   * @param imageUri - URI of the image
   * @param size - Thumbnail size (width and height)
   * @returns Promise<string> - URI of the thumbnail
   */
  async createThumbnail(imageUri: string, size: number = 100): Promise<string> {
    return this.compressImage(imageUri, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.8,
      format: 'jpeg',
    });
  }

  /**
   * Compress image for avatar use
   * @param imageUri - URI of the image
   * @returns Promise<string> - URI of the compressed avatar
   */
  async compressForAvatar(imageUri: string): Promise<string> {
    return this.compressImage(imageUri, {
      maxWidth: 200,
      maxHeight: 200,
      quality: 0.8,
      format: 'jpeg',
    });
  }

  /**
   * Compress image for profile picture use
   * @param imageUri - URI of the image
   * @returns Promise<string> - URI of the compressed profile picture
   */
  async compressForProfile(imageUri: string): Promise<string> {
    return this.compressImage(imageUri, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.85,
      format: 'jpeg',
    });
  }
}

export const imageCompressionService = new ImageCompressionService();