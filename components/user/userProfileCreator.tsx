import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { imageCompressionService } from '../../services/imageCompressionService';
import { autoCloudUploadService } from '../../services/autoCloudUploadService';
import { userService } from '../../services/userService';

export interface UserProfile {
  name: string;
  avatarUri?: string;
}

interface UserProfileCreatorProps {
  visible: boolean;
  onClose: () => void;
  onProfileCreated: (profile: UserProfile) => void;
  title?: string;
  isEditing?: boolean;
  existingProfile?: UserProfile;
}

const UserProfileCreator: React.FC<UserProfileCreatorProps> = ({
  visible,
  onClose,
  onProfileCreated,
  title = "Create Your Profile",
  isEditing = false,
  existingProfile,
}) => {
  const [inputName, setInputName] = useState(existingProfile?.name || '');
  const [selectedAvatarUri, setSelectedAvatarUri] = useState(existingProfile?.avatarUri || '');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (visible) {
      setInputName(existingProfile?.name || '');
      setSelectedAvatarUri(existingProfile?.avatarUri || '');
    }
  }, [visible, existingProfile]);

  // Request camera/photo permissions
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

  // Pick image from library
  const pickImageFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setIsProcessing(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Compress the image
        const compressedUri = await imageCompressionService.compressForAvatar(asset.uri);
        setSelectedAvatarUri(compressedUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from library');
      console.error('Image picker error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Take photo with camera
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
      setIsProcessing(true);
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Compress the image
        const compressedUri = await imageCompressionService.compressForAvatar(asset.uri);
        setSelectedAvatarUri(compressedUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error('Camera error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle form submission with auto cloud upload
  const handleSubmit = async () => {
    if (inputName.trim() === '') {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      setIsProcessing(true);
      
      const profile: UserProfile = {
        name: inputName.trim(),
        avatarUri: selectedAvatarUri || undefined,
      };

      // Save profile locally first
      onProfileCreated(profile);
      
      // If this is an update and user is in groups, sync avatar to cloud
      if (isEditing && selectedAvatarUri) {
        try {

          // Get current user ID
          const userId = await userService.getOrCreateUserId();
          
          // Process avatar for all groups (non-blocking)
          autoCloudUploadService.processUserAvatar(userId).then(() => {
          }).catch((error) => {
          });
          
        } catch (syncError: any) {
          // Don't show error to user - this is background enhancement
        }
      }
      
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle form cancellation
  const handleCancel = () => {
    // Reset form to original state
    setInputName(existingProfile?.name || '');
    setSelectedAvatarUri(existingProfile?.avatarUri || '');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          
          {/* Avatar Selection Section */}
          <View style={styles.avatarSection}>
            <Text style={styles.avatarLabel}>
              {isEditing ? 'Update your avatar' : 'Choose your avatar (optional)'}
            </Text>
            
            <View style={styles.avatarPreview}>
              {selectedAvatarUri ? (
                <Image source={{ uri: selectedAvatarUri }} style={styles.previewAvatar} />
              ) : (
                <View style={styles.placeholderAvatar}>
                  <Text style={styles.placeholderText}>👤</Text>
                </View>
              )}
            </View>
            
            <View style={styles.avatarButtons}>
              <TouchableOpacity
                style={[styles.avatarButton, isProcessing && styles.disabledButton]}
                onPress={pickImageFromLibrary}
                disabled={isProcessing}
              >
                <Text style={styles.avatarButtonText}>
                  {isProcessing ? '⏳' : '📱'} Gallery
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.avatarButton, isProcessing && styles.disabledButton]}
                onPress={takePhoto}
                disabled={isProcessing}
              >
                <Text style={styles.avatarButtonText}>
                  {isProcessing ? '⏳' : '📷'} Camera
                </Text>
              </TouchableOpacity>
              
              {selectedAvatarUri && (
                <TouchableOpacity
                  style={[styles.avatarButton, styles.removeButton]}
                  onPress={() => setSelectedAvatarUri('')}
                  disabled={isProcessing}
                >
                  <Text style={styles.removeButtonText}>🗑️ Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Enhanced info text for group visibility */}
          {selectedAvatarUri && (
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                ✅ Your avatar will be visible to all group members
              </Text>
              <Text style={styles.infoSubtext}>
                Avatar will be automatically uploaded to cloud storage for group sharing
              </Text>
            </View>
          )}
          
          {/* Name Input Section */}
          <Text style={styles.modalSubtitle}>
            {isEditing ? 'Update your name' : 'What should we call you?'}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your name"
            value={inputName}
            onChangeText={setInputName}
            autoFocus={!isEditing}
            maxLength={30}
            editable={!isProcessing}
          />
          
          {/* Action Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalButton, 
                styles.submitButton,
                (isProcessing || inputName.trim() === '') && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={isProcessing || inputName.trim() === ''}
            >
              <Text style={styles.submitButtonText}>
                {isProcessing ? 'Processing...' : (isEditing ? 'Update Profile' : 'Create Profile')}
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 30,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  avatarPreview: {
    marginBottom: 15,
  },
  previewAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#4287f5',
  },
  placeholderAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  placeholderText: {
    fontSize: 35,
    color: '#999',
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  avatarButton: {
    backgroundColor: '#4287f5',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  avatarButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#dc3545',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  infoSection: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  infoText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 16,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#28a745',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserProfileCreator;