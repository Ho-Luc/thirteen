// utils/databaseFieldTest.ts
import { databases, appwriteConfig, generateId } from '../lib/appwrite';

/**
 * Test the actual character limit of the avatarUrl field
 */
export const testAvatarUrlFieldSize = async (): Promise<void> => {
  console.log('🧪 Testing avatarUrl field size...');
  
  const testUserId = 'test-user-' + Date.now();
  const testGroupId = 'test-group-' + Date.now();
  
  // Generate test URLs of different lengths
  const testUrls = [
    'https://short.url/test', // ~20 chars
    'https://medium.example.com/path/to/file/test.jpg', // ~50 chars
    'https://nyc.cloud.appwrite.io/v1/storage/buckets/user_avatars/files/test123456789/view?project=test', // ~100 chars
    'https://nyc.cloud.appwrite.io/v1/storage/buckets/user_avatars/files/test123456789012345678901234567890/view?project=test123456789012345678901234567890', // ~150 chars
    'https://nyc.cloud.appwrite.io/v1/storage/buckets/user_avatars/files/test123456789012345678901234567890123456789012345678901234567890/view?project=test123456789012345678901234567890123456789012345678901234567890', // ~200+ chars
  ];
  
  for (let i = 0; i < testUrls.length; i++) {
    const testUrl = testUrls[i];
    console.log(`\n📝 Test ${i + 1}: ${testUrl.length} characters`);
    console.log(`URL: ${testUrl}`);
    
    try {
      const testDoc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        generateId(),
        {
          userId: testUserId + i,
          groupId: testGroupId,
          joinedAt: new Date().toISOString(),
          userName: `Test User ${i + 1}`,
          avatarUrl: testUrl,
        }
      );
      
      console.log(`✅ SUCCESS: Created document with ${testUrl.length} char URL`);
      console.log(`📤 Sent: ${testUrl}`);
      console.log(`📥 Stored: ${testDoc.avatarUrl}`);
      console.log(`🔍 Match: ${testUrl === testDoc.avatarUrl ? 'YES' : 'NO - TRUNCATED!'}`);
      
      // Clean up test document
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId,
        testDoc.$id
      );
      console.log(`🧹 Cleaned up test document`);
      
    } catch (error: any) {
      console.log(`❌ FAILED: ${error.message}`);
      
      if (error.message.includes('too long') || error.message.includes('100')) {
        console.log(`🚨 FOUND THE LIMIT: Field still has 100 character limit!`);
        break;
      }
    }
  }
  
  console.log('\n🏁 Field size test completed');
};

/**
 * Test with a known working Appwrite URL format
 */
export const testRealAppwriteUrl = async (): Promise<void> => {
  console.log('\n🧪 Testing with realistic Appwrite URL...');
  
  // This is what a real Appwrite URL looks like (replace with your project ID)
  const projectId = appwriteConfig.projectId || 'your-project-id';
  const testFileId = 'test123456789012345678901234567890'; // 32 chars
  const realUrl = `https://nyc.cloud.appwrite.io/v1/storage/buckets/user_avatars/files/${testFileId}/view?project=${projectId}`;
  
  console.log(`🔗 Real URL length: ${realUrl.length} characters`);
  console.log(`📝 URL: ${realUrl}`);
  
  try {
    const testDoc = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupMembersCollectionId,
      generateId(),
      {
        userId: 'real-test-user',
        groupId: 'real-test-group',
        joinedAt: new Date().toISOString(),
        userName: 'Real Test User',
        avatarUrl: realUrl,
      }
    );
    
    console.log(`✅ SUCCESS: Real URL test passed`);
    console.log(`📤 Sent: ${realUrl}`);
    console.log(`📥 Stored: ${testDoc.avatarUrl}`);
    console.log(`🔍 Match: ${realUrl === testDoc.avatarUrl ? 'YES - PERFECT!' : 'NO - STILL TRUNCATED!'}`);
    
    if (realUrl !== testDoc.avatarUrl) {
      console.log(`❌ TRUNCATION DETECTED:`);
      console.log(`   Original length: ${realUrl.length}`);
      console.log(`   Stored length: ${testDoc.avatarUrl?.length || 0}`);
      console.log(`   Truncated at position: ${testDoc.avatarUrl?.length || 0}`);
    }
    
    // Clean up
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.groupMembersCollectionId,
      testDoc.$id
    );
    
  } catch (error: any) {
    console.log(`❌ Real URL test failed: ${error.message}`);
  }
};

/**
 * Run comprehensive field tests
 */
export const runFieldSizeTests = async (): Promise<void> => {
  console.log('🚀 Starting comprehensive database field tests...\n');
  
  try {
    await testAvatarUrlFieldSize();
    await testRealAppwriteUrl();
  } catch (error) {
    console.error('❌ Field size tests failed:', error);
  }
  
  console.log('\n✅ All database field tests completed');
};