import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import JoinGroupButton from '../../../components/group_management/joinGroupButton';

jest.spyOn(Alert, 'alert');

describe('Join group button tests', () => {
    const mockOnPress = jest.fn();

    const defaultProps = {
        disabled: false,
        onPress: mockOnPress,
    };
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('Renders component', () => {
            render(<JoinGroupButton {...defaultProps} />)
            
            expect(screen.getByText('Join Group')).toBeTruthy();
        });
    });

    describe('User interacts with button', () => {
        it('Button is clicked', () => {
            render(<JoinGroupButton {...defaultProps} />)
            const joinGroupButton = screen.getByText('Join Group');

            fireEvent.press(joinGroupButton);
            
            expect(mockOnPress).toBeCalledTimes(1);
        });
    });
});