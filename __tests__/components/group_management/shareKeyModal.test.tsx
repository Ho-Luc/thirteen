import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import ShareKeyModal from '../../../components/group_management/shareKeyModal';

jest.spyOn(Alert, 'alert');

describe('Share key modal tests', () => {
    const mockOnClose = jest.fn();
    const mockOnCopyKey = jest.fn();

    const defaultProps = {
        visible: true,
        shareKey: 'SHARE1',
        onClose: mockOnClose,
        onCopyKey: mockOnCopyKey,
    };
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('Render components', () => {
            render(<ShareKeyModal {...defaultProps} />)
            
            expect(screen.getByText('Group Created!')).toBeTruthy();
            expect(screen.getByText('Your share key is:')).toBeTruthy();
            expect(screen.getByText('Copy')).toBeTruthy();
            expect(screen.getByText('SHARE1')).toBeTruthy();
            expect(screen.getByText('Share this key with others so they can join your group!')).toBeTruthy();
            expect(screen.getByText('Done')).toBeTruthy();            
        });

         it('Components not rendered if visible is false', () => {
            render(<ShareKeyModal {...defaultProps} visible={false} />)

            expect(screen.queryByText('Group Created!')).toBeNull();
            expect(screen.queryByText('Your share key is:')).toBeNull();
            expect(screen.queryByText('Copy')).toBeNull();
            expect(screen.queryByText('SHARE1')).toBeNull();            
            expect(screen.queryByText('Share this key with others so they can join your group!')).toBeNull();
            expect(screen.queryByText('Done')).toBeNull(); 
        });
    });

    describe('User interactions', () => {
        it('Copy button is selected', () => {
            render(<ShareKeyModal {...defaultProps} />)
            const copyButton = screen.getByText('Copy');

            fireEvent.press(copyButton);

            expect(mockOnCopyKey).toBeCalled();
        });

        it('Done button is selected', () => {
            render(<ShareKeyModal {...defaultProps} />)
            const doneButton = screen.getByText('Done');

            fireEvent.press(doneButton);

            expect(mockOnClose).toBeCalled();
        });
    });
});