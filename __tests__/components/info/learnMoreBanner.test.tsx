import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import LearnMoreBanner from '../../../components/info/learnMoreBanner';

jest.spyOn(Alert, 'alert');

describe('Learn more banner tests', () => {
    const mockOnPress = jest.fn();

    const defaultProps = {
        onPress: mockOnPress,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    it('Renders when visible is true', () => {
        render(<LearnMoreBanner {...defaultProps} />);

        expect(screen.getByText('Learn More About Thirteen')).toBeTruthy();
        expect(screen.getByText('Discover the heart behind this Bible reading community')).toBeTruthy();
        expect(screen.getByText('→')).toBeTruthy();
    });

    it('Banner is pressed', () => {
        render(<LearnMoreBanner {...defaultProps} />);
        const bannerPress = screen.getByText('Learn More About Thirteen');

        fireEvent.press(bannerPress);

        expect(mockOnPress).toBeCalledTimes(1);

    });
});