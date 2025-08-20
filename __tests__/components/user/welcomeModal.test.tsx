import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import WelcomeModal from '../../../components/user/welcomeModal';

jest.spyOn(Alert, 'alert');

describe('Welcome modal tests', () => {
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
            render(<WelcomeModal {...defaultProps} />)

            expect(screen.getByText('Welcome to Thirteen!')).toBeTruthy();
            expect(screen.getByText('An app where followers of Jesus can create/join daily bible reading groups.')).toBeTruthy();
            expect(screen.getByText('The goal is through community, we all encourage each other to build up a daily habit of sitting with God\'s word.')).toBeTruthy();
            expect(screen.getByText('Remember to:')).toBeTruthy();
            expect(screen.getByText('Make sure to keep the streak and mark the day green, when you have done the reading.')).toBeTruthy();
            expect(screen.getByText('"So then faith comes by hearing, and hearing by the word of God."')).toBeTruthy();
            expect(screen.getByText('— Romans 10:17')).toBeTruthy();
            expect(screen.getByText('Close')).toBeTruthy();
        });

        it('Does not render with visible is false', () => {
            render(<WelcomeModal {...defaultProps} visible={false} />);

            expect(screen.queryByText('Welcome to Thirteen!')).toBeNull();
            expect(screen.queryByText('An app where followers of Jesus can create/join daily bible reading groups.')).toBeNull();
            expect(screen.queryByText('The goal is through community, we all encourage each other to build up a daily habit of sitting with God\'s word.')).toBeNull();
            expect(screen.queryByText('Remember to:')).toBeNull();
            expect(screen.queryByText('Make sure to keep the streak and mark the day green, when you have done the reading.')).toBeNull();
            expect(screen.queryByText('"So then faith comes by hearing, and hearing by the word of God."')).toBeNull();
            expect(screen.queryByText('— Romans 10:17')).toBeNull();
            expect(screen.queryByText('Close')).toBeNull();
        });
    });

    describe('User clicks button', () => {
        it('Close is selected', () => {
            render(<WelcomeModal {...defaultProps} />)
            const closeButton = screen.getByText('Close');

            fireEvent.press(closeButton);

            expect(mockOnClose).toBeCalledTimes(1);
        });
    });
});
