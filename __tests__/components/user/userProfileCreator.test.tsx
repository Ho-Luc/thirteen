import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import UserProfileCreator from '../../../components/user/userProfileCreator';

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


    beforeEach(() => {
        jest.clearAllMocks();
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

});
