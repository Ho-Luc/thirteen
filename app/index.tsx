// app/index.tsx - Updated with complete donation flow
import React, { useState, useEffect } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserProfileCreator, { UserProfile } from '../components/user/userProfileCreator';
import WelcomeModal from '../components/user/welcomeModal';
import DonationBanner from '../components/donations/donationBanner';
import DonationModal from '../components/donations/donationModal';
import Bible from '../assets/images/bible.png';

const HomeScreen = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUserExists();
  }, []);

  // Check if user profile is stored in AsyncStorage
  const checkUserExists = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userProfile');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData) as UserProfile;
        setUserProfile(userData);
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  // Save user profile to AsyncStorage
  const saveUserProfile = async (profile: UserProfile) => {
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
      setUserProfile(profile);
    } catch (error) {
      Alert.alert('Error', 'Failed to save user profile. Please try again.');
    }
  };

  // Handle profile creation
  const handleProfileCreated = async (profile: UserProfile) => {
    try {
      await saveUserProfile(profile);
      setShowCreateProfile(false);
      
      // Check if this is truly the first time (no previous profile stored)
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      if (!hasSeenWelcome) {
        // Mark that they've seen the welcome and show it
        await AsyncStorage.setItem('hasSeenWelcome', 'true');
        setShowWelcomeModal(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  // Handle profile update
  const handleProfileUpdated = (profile: UserProfile) => {
    saveUserProfile(profile);
    setShowEditProfile(false);
  };

  // Handle donation banner press
  const handleDonationBannerPress = () => {
    setShowDonationModal(true);
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
      
      {userProfile ? (
        <>
          {/* User Profile Display */}
          <TouchableOpacity 
            style={styles.userProfileContainer}
            onPress={() => setShowEditProfile(true)}
            activeOpacity={0.7}
          >
            {userProfile.avatarUri ? (
              <Image source={{ uri: userProfile.avatarUri }} style={styles.userAvatar} />
            ) : (
              <View style={styles.defaultUserAvatar}>
                <Text style={styles.defaultUserAvatarText}>👤</Text>
              </View>
            )}
            <Text style={styles.welcomeText}>Welcome back, {userProfile.name}!</Text>
            <Text style={styles.editHint}>Tap to edit profile</Text>
          </TouchableOpacity>

          {/* My Groups Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/my-groups')}
          >
            <Text style={styles.buttonText}>My Groups</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Welcome Message for New Users */}
          <Text style={styles.subtitle}>
            Draw near to God and mark your progress today
          </Text>

          {/* Create Profile Button */}
          <TouchableOpacity
            style={[styles.button, styles.createProfileButton]}
            onPress={() => setShowCreateProfile(true)}
          >
            <Text style={styles.buttonText}>Create Profile</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Donation Banner - Always visible at bottom */}
      <DonationBanner onPress={handleDonationBannerPress} />

      {/* Welcome Modal for First-Time Users */}
      <WelcomeModal
        visible={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />

      {/* Create Profile Modal */}
      <UserProfileCreator
        visible={showCreateProfile}
        onClose={() => setShowCreateProfile(false)}
        onProfileCreated={handleProfileCreated}
        title="Create Your Profile"
        isEditing={false}
      />

      {/* Edit Profile Modal */}
      <UserProfileCreator
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onProfileCreated={handleProfileUpdated}
        title="Edit Your Profile"
        isEditing={true}
        existingProfile={userProfile || undefined}
      />

      {/* Donation Modal */}
      <DonationModal
        visible={showDonationModal}
        onClose={() => setShowDonationModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    paddingBottom: 100, // Extra space for donation banner
  },
  image: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  userProfileContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#4287f5',
  },
  defaultUserAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  defaultUserAvatarText: {
    fontSize: 30,
    color: '#999',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  editHint: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#4287f5',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    minWidth: 200,
  },
  createProfileButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});

export default HomeScreen;