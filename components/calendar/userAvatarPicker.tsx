import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { imageCompressionService } from '../../services/imageCompressionService';

interface UserAvatarPickerProps {
  visible: boolean;
  onClose: () => void;
  onAvatarSelected: (avatarUrl: string) => void;
  currentAvatarUrl?: string;
}

const UserAvatarPicker: React.FC<UserAvatarPickerProps> = ({
  visible,
  onClose,
  onAvatarSelected,
  currentAvatarUrl,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your photo library to select an avatar.'
      );
      return false;
    }
    return true;
  };

  const pickImageFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setUploadProgress('Selecting image...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPreviewUri(asset.uri);
        setUploadProgress('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from library');
      console.error('Image picker error:', error);
      setUploadProgress('');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permission to take a photo.'
      );
      return;
    }

    try {
      setUploadProgress('Opening camera...');
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPreviewUri(asset.uri);
        setUploadProgress('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error('Camera error:', error);
      setUploadProgress('');
    }
  };

  const uploadAvatar = async () => {
    if (!previewUri) return;

    try {
      setIsUploading(true);
      setUploadProgress('Preparing image...');

      // Compress the image first
      setUploadProgress('Compressing image...');
      const compressedUri = await imageCompressionService.compressForAvatar(previewUri);
      
      setUploadProgress('Uploading to cloud storage...');
      
      // Call the parent handler which will handle the actual upload
      onAvatarSelected(compressedUri);
      
      // Reset state after successful upload
      resetState();
      
    } catch (error: any) {
      setUploadProgress('');
      Alert.alert(
        'Upload Failed', 
        'Failed to process avatar. Please try again.\n\nDetails: ' + error.message
      );
      console.error('Avatar processing error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setPreviewUri(null);
    setIsUploading(false);
    setUploadProgress('');
  };

  const handleClose = () => {
    if (isUploading) {
      Alert.alert(
        'Upload in Progress',
        'Please wait for the avatar upload to complete.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    resetState();
    onClose();
  };

  const removeCurrentAvatar = () => {
    Alert.alert(
      'Remove Avatar',
      'Are you sure you want to remove your current avatar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onAvatarSelected(''); // Empty string to remove avatar
            handleClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Update Avatar</Text>

          {/* Current or Preview Avatar */}
          <View style={styles.avatarPreview}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.previewImage} />
            ) : currentAvatarUrl ? (
              <Image source={{ uri: currentAvatarUrl }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={styles.placeholderText}>👤</Text>
              </View>
            )}
          </View>

          {/* Upload Progress */}
          {uploadProgress && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {!previewUri ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, isUploading && styles.disabledButton]}
                  onPress={pickImageFromLibrary}
                  disabled={isUploading}
                >
                  <Text style={styles.primaryButtonText}>📱 Choose from Library</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, isUploading && styles.disabledButton]}
                  onPress={takePhoto}
                  disabled={isUploading}
                >
                  <Text style={styles.primaryButtonText}>📷 Take Photo</Text>
                </TouchableOpacity>

                {currentAvatarUrl && (
                  <TouchableOpacity
                    style={[styles.button, styles.dangerButton, isUploading && styles.disabledButton]}
                    onPress={removeCurrentAvatar}
                    disabled={isUploading}
                  >
                    <Text style={styles.dangerButtonText}>🗑️ Remove Avatar</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.successButton, isUploading && styles.disabledButton]}
                  onPress={uploadAvatar}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={styles.loadingText}>Processing...</Text>
                    </View>
                  ) : (
                    <Text style={styles.successButtonText}>✓ Use This Photo</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton, isUploading && styles.disabledButton]}
                  onPress={() => setPreviewUri(null)}
                  disabled={isUploading}
                >
                  <Text style={styles.secondaryButtonText}>🔄 Choose Different</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={[
              styles.button, 
              styles.cancelButton, 
              isUploading && styles.disabledButton
            ]}
            onPress={handleClose}
            disabled={isUploading}
          >
            <Text style={styles.cancelButtonText}>
              {isUploading ? 'Please wait...' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  avatarPreview: {
    marginBottom: 15,
    alignItems: 'center',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#4287f5',
  },
  placeholderAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  placeholderText: {
    fontSize: 40,
    color: '#999',
  },
  progressContainer: {
    marginBottom: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderLeft: 4,
    borderLeftColor: '#2196f3',
  },
  progressText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: '#4287f5',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successButton: {
    backgroundColor: '#28a745',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#e9ecef',
    borderColor: '#dee2e6',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserAvatarPicker;