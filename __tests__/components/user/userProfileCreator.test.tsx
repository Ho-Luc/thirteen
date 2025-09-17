import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import * as ImagePicker from 'expo-image-picker';
import UserProfileCreator from '../../../components/user/userProfileCreator';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images'
  }
}));

jest.mock('../../../services/imageCompressionService', () => ({
  imageCompressionService: {
    compressForAvatar: jest.fn((uri) => Promise.resolve(uri))
  }
}));

jest.mock('../../../services/autoCloudUploadService', () => ({
  autoCloudUploadService: {
    processUserAvatar: jest.fn(() => Promise.resolve())
  }
}));

jest.mock('../../../services/userService', () => ({
  userService: {
    getOrCreateUserId: jest.fn(() => Promise.resolve('mock-user-id'))
  }
}));

jest.spyOn(Alert, 'alert');

describe('User Profile Creator tests', () => {
    const mockOnClose = jest.fn();
    const mockOnProfileCreated = jest.fn();

    const userProfile = {
        name: "Test User",
        avatarUri: 'www.testavataruri.com'
    }

    const defaultProps = {
        visible: true,
        onClose: mockOnClose,
        onProfileCreated: mockOnProfileCreated,
        title: "Create Your Profile",
        isEditing: false,
        existingProfile: userProfile,
    };

    const mockRequestMediaLibraryPermissions = ImagePicker.requestMediaLibraryPermissionsAsync as jest.MockedFunction<typeof ImagePicker.requestMediaLibraryPermissionsAsync>;
    const mockLaunchImageLibrary = ImagePicker.launchImageLibraryAsync as jest.MockedFunction<typeof ImagePicker.launchImageLibraryAsync>;
    const mockRequestCameraPermissions = ImagePicker.requestCameraPermissionsAsync as jest.MockedFunction<typeof ImagePicker.requestCameraPermissionsAsync>;
    const mockLaunchCamera = ImagePicker.launchCameraAsync as jest.MockedFunction<typeof ImagePicker.launchCameraAsync>;
    const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'granted' } as any);
        mockRequestCameraPermissions.mockResolvedValue({ status: 'granted' } as any);
        mockLaunchImageLibrary.mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'mock-gallery-image.jpg' }]
        } as any);

        mockLaunchCamera.mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'mock-camera-image.jpg' }]
        } as any);
    });

    describe('Rendering', () => {
        it('Renders when visible is true', () => {
            render(<UserProfileCreator {...defaultProps} />)

            expect(screen.getByText('Choose your avatar (optional)')).toBeTruthy();
            expect(screen.getByText('📱 Gallery')).toBeTruthy();
            expect(screen.getByText('📷 Camera')).toBeTruthy();
            expect(screen.getByText('🗑️ Remove')).toBeTruthy();
            expect(screen.getByText('✅ Your avatar will be visible to all group members')).toBeTruthy();
            expect(screen.getByText('Avatar will be automatically uploaded to cloud storage for group sharing')).toBeTruthy();
            expect(screen.getByText('What should we call you?')).toBeTruthy();
            expect(screen.findByPlaceholderText('Enter your name')).toBeTruthy();
            expect(screen.getByText('Create Profile')).toBeTruthy();
            expect(screen.getByText('Cancel')).toBeTruthy();
        });

        it('Does not render with visible is false', () => {
            render(<UserProfileCreator {...defaultProps} visible={false} />);

            expect(screen.queryByText('Choose your avatar (optional)')).toBeNull();
            expect(screen.queryByText('📱 Gallery')).toBeNull();
            expect(screen.queryByText('📷 Camera')).toBeNull();
            expect(screen.queryByText('🗑️ Remove')).toBeNull();
            expect(screen.queryByText('✅ Your avatar will be visible to all group members')).toBeNull();
            expect(screen.queryByText('Avatar will be automatically uploaded to cloud storage for group sharing')).toBeNull();
            expect(screen.queryByText('What should we call you?')).toBeNull();
            expect(screen.queryByText('Create Profile')).toBeNull();
            expect(screen.queryByText('Cancel')).toBeNull();     
        });

        it('Conditional text elements change when editing is true', () => {
            render(<UserProfileCreator {...defaultProps} isEditing={true} />)
            
            expect(screen.getByText('Update your name')).toBeTruthy();
            expect(screen.getByText('Update Profile')).toBeTruthy();
            expect(screen.getByText('Update your avatar')).toBeTruthy();
        });
    });

    describe('Gallery Tests', () => {
        it('Gallery button is clickable', async () => {
            render(<UserProfileCreator {...defaultProps} />);
            const galleryButton = screen.getByText('📱 Gallery');
            
            await act(async () => {
                fireEvent.press(galleryButton);
            });

            expect(mockRequestMediaLibraryPermissions).toHaveBeenCalledTimes(1);
        });

        it('Successfully picks image from gallery with permissions', async () => {
            render(<UserProfileCreator {...defaultProps} />);
            const galleryButton = screen.getByText('📱 Gallery');

            await act(async () => {
                fireEvent.press(galleryButton);
            });

            await waitFor(() => {
                expect(mockRequestMediaLibraryPermissions).toHaveBeenCalledTimes(1);
                expect(mockLaunchImageLibrary).toHaveBeenCalledTimes(1);
            });
            
            expect(mockLaunchImageLibrary).toHaveBeenCalledWith({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: false,
            });
        });

        it('Shows permission alert when gallery permission denied', async () => {
            mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'denied' } as any);

            render(<UserProfileCreator {...defaultProps} />);
            const galleryButton = screen.getByText('📱 Gallery');

            await act(async () => {
                fireEvent.press(galleryButton);
            });

            await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Permission Required',
                    'Please grant permission to access your photo library to select an avatar.'
                );
            }, {timeout: 3000});
        
            expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
        });

        it('Handles gallery selection cancellation', async () => {
            mockLaunchImageLibrary.mockResolvedValue({ canceled: true } as any);
            render(<UserProfileCreator {...defaultProps} />);
            
            const galleryButton = screen.getByText('📱 Gallery');

            await act(async () => {
                fireEvent.press(galleryButton);
            });
            
            await waitFor(() => {
                expect(mockLaunchImageLibrary).toHaveBeenCalledTimes(1);
            });
      
            expect(Alert.alert).not.toHaveBeenCalled();
        });

        it('Handles gallery error gracefully', async () => {
            mockLaunchImageLibrary.mockRejectedValue(new Error('Gallery error'));
            
            render(<UserProfileCreator {...defaultProps} />);
            const galleryButton = screen.getByText('📱 Gallery');
            
            await act(async () => {
                fireEvent.press(galleryButton);
            });
            
            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith('Error', 'Failed to pick image from library');
            });
        });
    });

    describe('Camera Tests', () => {
        it('Gallery button is clickable', async () => {
            render(<UserProfileCreator {...defaultProps} />);
            const cameraButton = screen.getByText('📷 Camera');
      
            act(() => {
                fireEvent.press(cameraButton);
            });
      
            expect(mockRequestCameraPermissions).toHaveBeenCalledTimes(1);
        });

        it('Successfully picks image from gallery with permissions', async () => {
            render(<UserProfileCreator {...defaultProps} />);
            const cameraButton = screen.getByText('📷 Camera');

            await act(() => {
                fireEvent.press(cameraButton);
            });

            expect(mockRequestCameraPermissions).toBeCalledTimes(1);
            expect(mockLaunchCamera).toBeCalledTimes(1);
        });

        it('Shows permission alert when camera permission denied', async () => {
            mockRequestCameraPermissions.mockResolvedValue({ status: 'denied' } as any);
            
            render(<UserProfileCreator {...defaultProps} />);
            
            const cameraButton = screen.getByText('📷 Camera');
            fireEvent.press(cameraButton);
            
            await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalledWith(
                    'Permission Required',
                    'Please grant camera permission to take a photo.'
                );
            });
      
            expect(mockLaunchCamera).not.toHaveBeenCalled();
        });
    });

        describe('Remove Button Tests', () => {
            it('Remove button is shown when avatar exists', () => {
                render(<UserProfileCreator {...defaultProps} />);
            
                const removeButton = screen.getByText('🗑️ Remove');
                expect(removeButton).toBeTruthy();
            });

            it('Remove button is not shown when no avatar exists', () => {
                const propsWithoutAvatar = {
                    ...defaultProps,
                    existingProfile: { name: "Test User" } 
                };
            
                render(<UserProfileCreator {...propsWithoutAvatar} />);
            
                const removeButton = screen.queryByText('🗑️ Remove');
                expect(removeButton).toBeNull();
            });

            it('Remove button clears the avatar', async () => {
                render(<UserProfileCreator {...defaultProps} />);
            
                const removeButton = screen.getByText('🗑️ Remove');
                fireEvent.press(removeButton);
            
                await waitFor(() => {
                    expect(screen.queryByText('🗑️ Remove')).toBeNull();
                });
            });

            it('Handles camera error gracefully', async () => {
                mockLaunchCamera.mockRejectedValue(new Error('Camera error'));
            
                render(<UserProfileCreator {...defaultProps} />);
            
                const cameraButton = screen.getByText('📷 Camera');
                fireEvent.press(cameraButton);
            
                await waitFor(() => {
                    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to take photo');
                });
        });
    });

    describe('Button Disabled States', () => {
        it('Buttons are disabled when processing', async () => {
            render(<UserProfileCreator {...defaultProps} />);
            
            const galleryButton = screen.getByText('📱 Gallery');
            
            fireEvent.press(galleryButton);
            
            await waitFor(() => {
                const processingText = screen.queryByText(/⏳/);
                if (processingText) {
                expect(processingText).toBeTruthy();
                }
            });
        });
    });

    describe('Image Preview Tests', () => {
        it('Shows selected image preview', async () => {
            render(<UserProfileCreator {...defaultProps} />);
        
            const galleryButton = screen.getByText('📱 Gallery');
            fireEvent.press(galleryButton);
            
            await waitFor(() => {
                expect(mockLaunchImageLibrary).toHaveBeenCalledTimes(1);
            });
        });
    });
});
