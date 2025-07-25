import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import JoinGroupModal from '../../../components/group_management/joinGroupModal';

jest.spyOn(Alert, 'alert');

describe('Join group modal tests', () => {
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
            expect(screen.getByText('0/6 characters')).toBeTruthy();            
            expect(screen.getByText('Cancel')).toBeTruthy();
            expect(screen.getByText('Join Group')).toBeTruthy();
        });

        it('Component does not show, when visible is false', () => {
            render(<JoinGroupModal {...defaultProps} visible={false} />)
            
            expect(screen.queryByText('Join a Group')).toBeNull();
            expect(screen.queryByText('Enter the 6-character share key to join an existing group')).toBeNull();
            expect(screen.queryByText('ABC123')).toBeNull();
            expect(screen.queryByText('Cancel')).toBeNull();
            expect(screen.queryByText('Join Group')).toBeNull();
        });

        it('Join Group button is disabled when input is empty', () => {
            render(<JoinGroupModal {...defaultProps} />);
      
             const joinButton = screen.getByText('Join Group');

             expect(joinButton).toBeTruthy();
        });
    });

    describe('User interactions', () => {
        it('Cancel is selected', () => {
            render(<JoinGroupModal {...defaultProps} />)
            const cancelButton = screen.getByText('Cancel');

            fireEvent.press(cancelButton);

            expect(mockOnClose).toBeCalledTimes(1);
            expect(mockOnJoinGroup).not.toBeCalled();
        });

        it('Valid share key is input and join group is selected', () => {
            render(<JoinGroupModal {...defaultProps} />)
            const joinGroupButton = screen.getByText('Join Group');
            const inputText = screen.getByPlaceholderText('ABC123');

            fireEvent.changeText(inputText, 'SHARE1');
            fireEvent.press(joinGroupButton);

            expect(mockOnJoinGroup).toBeCalledTimes(1);
            expect(mockOnJoinGroup).toBeCalledWith('SHARE1');
            expect(mockOnClose).not.toBeCalled();
        });
        
        it('Updates character count as user types', () => {
            render(<JoinGroupModal {...defaultProps} />);
            const inputText = screen.getByPlaceholderText('ABC123');
      
            fireEvent.changeText(inputText, 'ABC');
            expect(screen.getByText('3/6 characters')).toBeTruthy();
      
            fireEvent.changeText(inputText, 'ABCDEF');
            expect(screen.getByText('6/6 characters')).toBeTruthy();
        });

        describe('Input text', () => {
            it('Input text is converted to uppercase', () => {
                render(<JoinGroupModal {...defaultProps} />);
                const inputText = screen.getByPlaceholderText('ABC123');
                
                fireEvent.changeText(inputText, 'abc123');
                
                expect(inputText.props.value).toBe('ABC123');
            });
            
            it('Input text is limited to 6 characters', () => {
                render(<JoinGroupModal {...defaultProps} />);
                const inputText = screen.getByPlaceholderText('ABC123');
                
                fireEvent.changeText(inputText, 'ABCDEFGHIJK');
                
                expect(inputText.props.value).toBe('ABCDEF');
            });
            
            it('When less than 6 characters entered, join group button is disabled', () => {
                render(<JoinGroupModal {...defaultProps} />);
                const inputText = screen.getByPlaceholderText('ABC123');
                const joinButton = screen.getByText('Join Group');
                
                fireEvent.changeText(inputText, 'XYZ');
                fireEvent.press(joinButton);
                
                expect(mockOnJoinGroup).not.toBeCalled();
            });
        });
    });
});