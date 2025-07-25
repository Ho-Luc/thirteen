import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {expect, describe, beforeEach, jest, it} from '@jest/globals';
import CreateGroupForm from '../../../components/group_management/createGroupForm';

jest.spyOn(Alert, 'alert');

describe('CreateGroupForm tests', () => {
  const mockOnClose = jest.fn();
  const mockOnCreateGroup = jest.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onCreateGroup: mockOnCreateGroup,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('Renders the modal when visible is true', () => {
      render(<CreateGroupForm {...defaultProps} />);
      
      expect(screen.getByText('Create New Group')).toBeTruthy();
      expect(screen.getByPlaceholderText('Enter group name')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Create')).toBeTruthy();
    });

    it('Does not render the modal when visible is false', () => {
      render(<CreateGroupForm {...defaultProps} visible={false} />);
      
      expect(screen.queryByText('Create New Group')).toBeNull();
    });
  });
  
  describe('Modal is opened', () => {  
    it('Successful group name is created', () => {
      render(<CreateGroupForm {...defaultProps} />);
      const textInput = screen.getByPlaceholderText('Enter group name');
      const createButton = screen.getByText('Create');
    
      fireEvent.changeText(textInput, 'Valid group name 1');
      fireEvent.press(createButton);

      expect(mockOnCreateGroup).toHaveBeenCalledWith('Valid group name 1');
      expect(mockOnCreateGroup).toHaveBeenCalledTimes(1);
    });

    it('No text is entered and create pressed', () => {
      
      render(<CreateGroupForm {...defaultProps} />);
      const createButton = screen.getByText('Create');
    
      fireEvent.press(createButton);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a group name');
      expect(mockOnCreateGroup).not.toHaveBeenCalled();
    });
    
    it('Text is entered', () => {
      render(<CreateGroupForm {...defaultProps} />);
      const textInput = screen.getByPlaceholderText('Enter group name');
    
      fireEvent.changeText(textInput, 'abc123');
    
      expect(textInput.props.value).toEqual('abc123');
    });

    it('Whitespace is entered', () => {
      render(<CreateGroupForm {...defaultProps} />);
      const textInput = screen.getByPlaceholderText('Enter group name');
      const createButton = screen.getByText('Create');
    
      fireEvent.changeText(textInput, '      ');
      fireEvent.press(createButton);

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a group name');
      expect(mockOnCreateGroup).not.toHaveBeenCalled();
    });

    it('Cancel button pressed', () => {
      render(<CreateGroupForm {...defaultProps} />);
      const cancelButton = screen.getByText('Cancel');
    
      fireEvent.press(cancelButton);
    
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('Clears input when modal visibility changes from false to true', () => {
      const { rerender } = render(<CreateGroupForm {...defaultProps} visible={false} />);

      rerender(<CreateGroupForm {...defaultProps} visible={true} />);
      
      const textInput = screen.getByPlaceholderText('Enter group name');
      expect(textInput.props.value).toBe('');
    });
  });
});