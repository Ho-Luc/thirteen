import React from 'react';
import GroupCalendar from '../../../app/group_calendar/index';
import { render, screen } from '@testing-library/react-native';
import {expect} from '@jest/globals';


// Mock the current date to make tests predictable
const mockDate = new Date('2024-01-15T10:00:00.000Z'); // Monday, January 15, 2024

test('basic group calendar test', () => {
  render(<GroupCalendar />);
  expect(screen.getAllByRole('button', { name: 'start' })).toBeOnTheScreen();
});