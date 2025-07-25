import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import GroupItem from '../../../components/group_management/groupItem';

jest.spyOn(Alert, 'alert');

describe('Group item tests', () => {
  const mockOnPress = jest.fn();
  const specificDate: Date = new Date('2025-06-25T10:30:00Z');

  const defaultProps = {
    group: {
        id: '1',
        name: 'ABC123',
        shareKey: 'SHARE1',
        createdAt: specificDate,
    },
    onPress: mockOnPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
        it('Renders when visible is true', () => {
            render(<GroupItem {...defaultProps} />);
            
            expect(screen.getByText('Share Key: SHARE1')).toBeTruthy();
            expect(screen.getByText('ABC123')).toBeTruthy();
            expect(screen.getByText('→')).toBeTruthy();
        });
    });

    it('Does not renders when visible is false', () => {
        render(<GroupItem {...defaultProps} />);
        const groupItemButton = screen.getByText('Share Key: SHARE1');

        fireEvent.press(groupItemButton);

        expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
});