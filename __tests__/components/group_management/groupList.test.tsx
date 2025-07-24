import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { expect, describe, beforeEach, jest, it } from '@jest/globals';
import GroupList from '../../../components/group_management/groupList';

jest.spyOn(Alert, 'alert');

describe('GroupList Component Tests', () => {
  const mockOnGroupPress = jest.fn();
  const specificDate = new Date('2025-06-25T10:30:00Z');
  
  const defaultProps = {
    groups: [
      {
        id: '1',
        name: 'ABC123',
        shareKey: 'SHARE1',
        createdAt: specificDate,
      },
      {
        id: '2',
        name: 'XYZ789',
        shareKey: 'SHARE2',
        createdAt: new Date('2025-06-26T14:20:00Z'),
      }
    ],
    onGroupPress: mockOnGroupPress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all groups when provided', () => {
      render(<GroupList {...defaultProps} />);
      
      expect(screen.getByText('ABC123')).toBeTruthy();
      expect(screen.getByText('Share Key: SHARE1')).toBeTruthy();
    
      expect(screen.getByText('XYZ789')).toBeTruthy();
      expect(screen.getByText('Share Key: SHARE2')).toBeTruthy();
      
      expect(screen.getAllByText('→')).toHaveLength(2);
    });

    it('renders empty state when no groups provided', () => {
      render(<GroupList groups={[]} onGroupPress={mockOnGroupPress} />);
      
      expect(screen.queryByText('Share Key:')).toBeFalsy();
    });

    it('renders single group correctly', () => {
      const singleGroupProps = {
        groups: [defaultProps.groups[0]],
        onGroupPress: mockOnGroupPress,
      };
      
      render(<GroupList {...singleGroupProps} />);
      
      expect(screen.getByText('ABC123')).toBeTruthy();
      expect(screen.getByText('Share Key: SHARE1')).toBeTruthy();
      expect(screen.getByText('→')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onGroupPress when group item is pressed', () => {
      render(<GroupList {...defaultProps} />);
      
      const firstGroupButton = screen.getByText('ABC123');
      fireEvent.press(firstGroupButton);
      
      expect(mockOnGroupPress).toHaveBeenCalledTimes(1);
      expect(mockOnGroupPress).toHaveBeenCalledWith(defaultProps.groups[0]);
    });

    it('handles multiple rapid presses correctly', () => {
      render(<GroupList {...defaultProps} />);
      
      const groupButton = screen.getByText('ABC123');

      fireEvent.press(groupButton);
      fireEvent.press(groupButton);
      fireEvent.press(groupButton);
      
      expect(mockOnGroupPress).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Edge cases', () => {
    it('handles special characters in group names and share keys', () => {
      const specialCharProps = {
        groups: [
          {
            id: '1',
            name: 'Group @#$%^&*()',
            shareKey: 'KEY-123_ABC',
            createdAt: specificDate,
          }
        ],
        onGroupPress: mockOnGroupPress,
      };
      
      render(<GroupList {...specialCharProps} />);
      expect(screen.getByText('Group @#$%^&*()')).toBeTruthy();
      expect(screen.getByText('Share Key: KEY-123_ABC')).toBeTruthy();
    });
  });
  
  it('handles large number of groups efficiently', () => {
    const manyGroups = Array.from({ length: 100 }, (_, index) => ({
      id: `${index + 1}`,
      name: `Group ${index + 1}`,
      shareKey: `SHARE${index + 1}`,
      createdAt: new Date(),
    }));

    const largeListProps = {
      groups: manyGroups,
      onGroupPress: mockOnGroupPress,
    };

    expect(() => {
      render(<GroupList {...largeListProps} />);
    }).not.toThrow();

    expect(screen.getByText('Group 1')).toBeTruthy();
  });
});