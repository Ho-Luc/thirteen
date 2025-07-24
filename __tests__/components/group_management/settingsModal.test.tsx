import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import SettingsModal from '../../../components/group_management/settingsModal';

jest.spyOn(Alert, 'alert');

describe('Delete confirmation modal tests', () => {
    const mockOnPress = jest.fn();

    const defaultProps = {
        disabled: false,
        onPress: mockOnPress,
    };
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        render(<SettingsModal {...defaultProps} />)
    });
});