import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import SettingsModal from '../../../components/group_management/settingsModal';

jest.spyOn(Alert, 'alert');

describe('Setting modal tests', () => {
    const mockOnClose = jest.fn();
    const mockDeleteGroup = jest.fn();
    const specificDate: Date = new Date('2025-06-25T10:30:00Z');

    const defaultProps = {
        visible: true,
        groups: [
            {
              id: '1',
              name: 'first group',
              shareKey: 'SHARE1',
              createdAt: specificDate,
            },
            {
              id: '2',
              name: 'second group',
              shareKey: 'SHARE2',
              createdAt: new Date('2025-06-26T14:20:00Z'),
            },
            {
              id: '3',
              name: 'third group',
              shareKey: 'SHARE3',
              createdAt: new Date('2025-06-26T14:20:00Z'),
            },
        ],
        onClose: mockOnClose,
        onDeleteGroup: mockDeleteGroup,
    };
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('Rendering components', () => {
            render(<SettingsModal {...defaultProps} />)

            expect(screen.getByText('Manage Groups')).toBeTruthy();
            expect(screen.getByText('first group')).toBeTruthy();
            expect(screen.getByText('Key: SHARE1')).toBeTruthy();
            expect(screen.getByText('second group')).toBeTruthy();
            expect(screen.getByText('Key: SHARE2')).toBeTruthy();
            expect(screen.getByText('third group')).toBeTruthy();
            expect(screen.getByText('Key: SHARE3')).toBeTruthy();
            expect(screen.getByText('Close')).toBeTruthy();
            expect(screen.getAllByText(/🗑️/)).toBeTruthy();
        });

        it('Component does not show, when visible is false', () => {
            render(<SettingsModal {...defaultProps} visible={false} />)

            expect(screen.queryByText('Manage Groups')).toBeNull();
            expect(screen.queryByText('first group')).toBeNull();
            expect(screen.queryByText('Key: SHARE1')).toBeNull();
            expect(screen.queryByText('second group')).toBeNull();
            expect(screen.queryByText('Key: SHARE2')).toBeNull();
            expect(screen.queryByText('third group')).toBeNull();
            expect(screen.queryByText('Key: SHARE3')).toBeNull();
            expect(screen.queryByText('Close')).toBeNull();
            expect(screen.queryByText(/🗑️/)).toBeNull();
        });
    });

    describe('User input', () => {
        it('Close button is selected', () => {
            render(<SettingsModal {...defaultProps} />)
            const closeButton = screen.getByText('Close');

            fireEvent.press(closeButton);

            expect(mockOnClose).toBeCalledTimes(1);
            expect(mockDeleteGroup).not.toBeCalled();
        });

        it('Delete is selected', () => {
            render(<SettingsModal {...defaultProps} />)
            const deleteButton = screen.getAllByText(/🗑️/);

            fireEvent.press(deleteButton[1]);

            expect(mockDeleteGroup).toBeCalledTimes(1);
            expect(mockDeleteGroup).toHaveBeenCalledWith(defaultProps.groups[1]);
            expect(mockOnClose).not.toHaveBeenCalled();
        });

    });
});