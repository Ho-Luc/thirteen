import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import JoinGroupModal from '../../../components/group_management/joinGroupModal';

jest.spyOn(Alert, 'alert');

describe('Delete confirmation modal tests', () => {
    const mockOnClose = jest.fn();
    const mockOnJoinGroup = jest.fn();

    const defaultProps = {
        visible: true,
        isLoading: false,
        onClose: mockOnClose,
        onJoinGroup: mockOnJoinGroup,
    };
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('Render components', () => {
            render(<JoinGroupModal {...defaultProps} />)

            expect(screen.getByText('Join a Group')).toBeTruthy();
            expect(screen.getByText('Enter the 6-character share key to join an existing group')).toBeTruthy();
            expect(screen.getByPlaceholderText('ABC123')).toBeTruthy();
            expect(screen.getByText('Cancel')).toBeTruthy();
            expect(screen.getByText('Join Group')).toBeTruthy();
        })
    });
});