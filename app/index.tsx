import React, { useState, useEffect } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Bible from '../assets/images/bible.png';

const HomeScreen = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [inputName, setInputName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user exists on component mount
  useEffect(() => {
    checkUserExists();
  }, []);

  // Check if user is stored in AsyncStorage
  const checkUserExists = async () => {
    try {
      const storedUserName = await AsyncStorage.getItem('userName');
      setUserName(storedUserName);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking user:', error);
      setIsLoading(false);
    }
  };

  // Save user name to AsyncStorage
  const saveUser = async (name: string) => {
    try {
      await AsyncStorage.setItem('userName', name);
      setUserName(name);
      console.log('User saved successfully:', name);
    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert('Error', 'Failed to save user. Please try again.');
    }
  };

  // Handle create user form submission
  const handleCreateUser = () => {
    if (inputName.trim() === '') {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    saveUser(inputName.trim());
    setInputName('');
    setShowCreateUserForm(false);
  };

  // Handle form cancellation
  const handleCancelCreateUser = () => {
    setInputName('');
    setShowCreateUserForm(false);
  };

  // Clear user data (for testing purposes)
  const clearUser = async () => {
    try {
      await AsyncStorage.removeItem('userName');
      setUserName(null);
      console.log('User data cleared');
    } catch (error) {
      console.error('Error clearing user:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={Bible} style={styles.image} />
      <Text style={styles.title}>Welcome to Thirteen!</Text>
      
      {userName ? (
        <Text style={styles.subtitle}>Welcome back, {userName}!</Text>
      ) : (
        <Text style={styles.subtitle}>Draw near to God and mark your progress today</Text>
      )}

      {/* Show Create User button if no user exists */}
      {!userName && (
        <TouchableOpacity
          style={[styles.button, styles.createUserButton]}
          onPress={() => setShowCreateUserForm(true)}
        >
          <Text style={styles.buttonText}>Create User</Text>
        </TouchableOpacity>
      )}

      {/* Show My Groups button only if user exists */}
      {userName && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/my-groups')}
        >
          <Text style={styles.buttonText}>My Groups</Text>
        </TouchableOpacity>
      )}

      {/* Create User Form Modal */}
      <Modal
        visible={showCreateUserForm}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelCreateUser}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Your Profile</Text>
            <Text style={styles.modalSubtitle}>What should we call you?</Text>
            
            <TextInput
              style={styles.textInput}
              placeholder="Enter your name"
              value={inputName}
              onChangeText={setInputName}
              autoFocus={true}
              maxLength={30}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelCreateUser}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateUser}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  image: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#4287f5",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
    minWidth: 200,
  },
  createUserButton: {
    backgroundColor: "#28a745",
  },
  debugButton: {
    backgroundColor: "#dc3545",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 25,
    paddingBottom: 30,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#28a745',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;