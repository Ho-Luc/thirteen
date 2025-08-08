// components/info/learnMoreBanner.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface LearnMoreBannerProps {
  onPress: () => void;
}

const LearnMoreBanner: React.FC<LearnMoreBannerProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.bannerContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.bannerContent}>
        <View style={styles.textContainer}>
          <Text style={styles.bannerTitle}>Learn More About Thirteen</Text>
          <Text style={styles.bannerSubtitle}>
            Discover the heart behind this Bible reading community
          </Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#4287f5',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#dbeafe',
    lineHeight: 18,
  },
  arrow: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default LearnMoreBanner;