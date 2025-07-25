import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface JoinGroupButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

const JoinGroupButton: React.FC<JoinGroupButtonProps> = ({ 
  onPress, 
  disabled = false 
}) => {
  return (
    <TouchableOpacity
      style={[styles.joinButton, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={[styles.joinButtonText, disabled && styles.disabledText]}>
        Join Group
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  joinButton: {
    position: "absolute",
    bottom: 80, // Position above the Create button
    right: 20,
    left: 20,
    backgroundColor: "#28a745", // Green color to distinguish from create button
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e7e34",
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#e9ecef",
    borderColor: "#dee2e6",
  },
  disabledText: {
    color: "#6c757d",
  },
});

export default JoinGroupButton;