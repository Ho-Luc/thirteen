import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import DeleteConfirmationModal from '../../../components/group_management/deleteConfirmationModal';

jest.spyOn(Alert, 'alert');

describe('Delete confirmation modal tests', () => {
    const mockOnCancel = jest.fn();
    const mockOnDelete = jest.fn();

    const defaultProps = {
        visible: true,
        groupName: 'ABC123',
        onCancel: mockOnCancel,
        onConfirm: mockOnDelete,
    };
    
    beforeEach(() => {
        jest.clearAllMocks();
    });


    describe('Rendering', () => {
        it('Renders when visible is true', () => {
            render(<DeleteConfirmationModal {...defaultProps} />);
            
            expect(screen.getByText('Delete Group')).toBeTruthy();
            expect(screen.getByText('Are you sure you want to delete "ABC123"?')).toBeTruthy();
            expect(screen.getByText('This action cannot be undone.')).toBeTruthy();
            expect(screen.getByText('Cancel')).toBeTruthy();
            expect(screen.getByText('Delete')).toBeTruthy();
        });

        it('Does not renders when visible is false', () => {
            render(<DeleteConfirmationModal {...defaultProps} visible={false} />);

            expect(screen.queryByText('Delete Group')).toBeNull();
        });
    });

    describe('User clicks buttons', () => {
        it('Cancel is selected', () => {
            render(<DeleteConfirmationModal {...defaultProps} />);
            const cancelButton = screen.getByText('Cancel');

            fireEvent.press(cancelButton);

            expect(mockOnCancel).toHaveBeenCalledTimes(1);
            expect(mockOnDelete).not.toHaveBeenCalled();
            expect(screen.queryByText('ABC123')).toBeNull();
        });

        it('Delete is selected', () => {
            render(<DeleteConfirmationModal {...defaultProps} />);
            const deleteButton = screen.getByText('Delete');

            fireEvent.press(deleteButton);

            expect(mockOnDelete).toHaveBeenCalledTimes(1);
            expect(mockOnCancel).not.toHaveBeenCalled();
        });

        it('Handles empty group name', () => {
            render(<DeleteConfirmationModal {...defaultProps} groupName="" />);
      
            expect(screen.getByText('Are you sure you want to delete ""?')).toBeTruthy();
        });
    });
});