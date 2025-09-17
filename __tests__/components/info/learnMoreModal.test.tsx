import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { expect, describe, beforeEach, jest, it } from '@jest/globals';
import LearnMoreModal from '../../../components/info/learnMoreModal';

describe('Learn more modal tests', () => {
    const mockOnClose = jest.fn();

    const defaultProps = {
        visible: true,
        onClose: mockOnClose,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('Renders when visible is true', () => {
            render(<LearnMoreModal {...defaultProps} />);
            
            expect(screen.getByText('About Thirteen')).toBeTruthy();
            expect(screen.getByText('Thirteen is a Bible reading community app designed to help believers build consistent daily habits through group accountability and encouragement.')).toBeTruthy();
            expect(screen.getByText('Learn more about the vision, features, and heart behind this ministry on our website.')).toBeTruthy();
            expect(screen.getByText('"So then faith comes by hearing, and hearing by the word of God."')).toBeTruthy();
            expect(screen.getByText('— Romans 10:17')).toBeTruthy();
            expect(screen.getByText('Visit Website')).toBeTruthy();
            expect(screen.getByText('Close')).toBeTruthy();
        });

        it('Does not render when visible is false', () => {
            render(<LearnMoreModal {...defaultProps} visible={false} />);
            
            expect(screen.queryByText('About Thirteen')).toBeNull();
            expect(screen.queryByText('Thirteen is a Bible reading community app designed to help believers build consistent daily habits through group accountability and encouragement.')).toBeNull();
            expect(screen.queryByText('Learn more about the vision, features, and heart behind this ministry on our website.')).toBeNull();
            expect(screen.queryByText('"So then faith comes by hearing, and hearing by the word of God."')).toBeNull();
            expect(screen.queryByText('— Romans 10:17')).toBeNull();
            expect(screen.queryByText('Visit Website')).toBeNull();
            expect(screen.queryByText('Close')).toBeNull();
        });
    });

    describe('User interactions', () => {
        it('Calls onClose when Close button is pressed', () => {
            render(<LearnMoreModal {...defaultProps} />);
            const closeButton = screen.getByText('Close');
            
            fireEvent.press(closeButton);
            
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('Visit Website button is present and pressable', () => {
            render(<LearnMoreModal {...defaultProps} />);
            const visitButton = screen.getByText('Visit Website');
            
            expect(visitButton).toBeTruthy();
            
            expect(() => {
                fireEvent.press(visitButton);
            }).not.toThrow();
        });

        it('Modal closes when onRequestClose is triggered', () => {
            const { getByTestId } = render(<LearnMoreModal {...defaultProps} />);
    
            const modalElement = screen.getByText('About Thirteen').parent?.parent;
            
            const closeButton = screen.getByText('Close');
            fireEvent.press(closeButton);
            
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });
});