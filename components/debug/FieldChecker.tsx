// components/debug/FieldChecker.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { databases, appwriteConfig, generateId } from '../../lib/appwrite';

const FieldChecker: React.FC = () => {
  const testFieldSize = async () => {
    try {
      console.log('🧪 Testing avatarUrl field size...');
      
      // Test with a 150-character URL
      const longUrl = 'https://nyc.cloud.appwrite.io/v1/storage/buckets/user_avatars/files/test123456789012345678901234567890/view?project=test123456789012345678901234567890';
      
      console.log(`📏 Test URL length: ${longUrl.length} characters`);
      
      const testDoc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        generateId(),
        {
          userId: 'field-test-' + Date.now(),
          groupId: 'test-group',
          joinedAt: new Date().toISOString(),
          userName: 'Field Test User',
          avatarUrl: longUrl,
        }
      );
      
      const storedLength = testDoc.avatarUrl?.length || 0;
      const success = testDoc.avatarUrl === longUrl;
      
      console.log(`✅ Field test results:`);
      console.log(`📤 Sent: ${longUrl.length} chars`);
      console.log(`📥 Stored: ${storedLength} chars`);
      console.log(`🔍 Complete: ${success ? 'YES' : 'NO - TRUNCATED'}`);
      
      // Clean up
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        testDoc.$id
      );
      
      Alert.alert(
        'Field Test Result', 
        success 
          ? `✅ Field supports ${storedLength} chars - WORKING!`
          : `❌ Field truncated to ${storedLength} chars - NEEDS FIX`
      );
      
    } catch (error: any) {
      console.error('❌ Field test failed:', error);
      Alert.alert('Field Test Failed', error.message);
    }
  };

  // Only show in development
  if (!__DEV__) return null;

  return (
    <TouchableOpacity style={styles.testButton} onPress={testFieldSize}>
      <Text style={styles.testButtonText}>🧪 Test DB Field</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  testButton: {
    backgroundColor: '#ff9500',
    padding: 10,
    borderRadius: 5,
    margin: 10,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default FieldChecker;