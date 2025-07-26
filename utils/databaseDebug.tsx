// utils/databaseDebug.ts
import { databases, appwriteConfig } from '../lib/appwrite';

/**
 * Debug helper to verify database schema and test document creation
 */
export class DatabaseDebugger {
  
  /**
   * Test creating a minimal group membership to see what fields are actually required
   */
  static async testGroupMembershipCreation(userId: string, groupId: string): Promise<void> {
    console.log('🧪 Testing group membership creation...');
    
    const testCases = [
      // Test case 1: Minimal required fields only
      {
        name: 'Minimal fields',
        payload: {
          userId: userId,
          groupId: groupId,
          joinedAt: new Date().toISOString(),
        }
      },
      // Test case 2: Add userName
      {
        name: 'With userName',
        payload: {
          userId: userId,
          groupId: groupId,
          joinedAt: new Date().toISOString(),
          userName: 'Test User',
        }
      },
      // Test case 3: Add avatarUrl
      {
        name: 'With userName and avatarUrl',
        payload: {
          userId: userId,
          groupId: groupId,
          joinedAt: new Date().toISOString(),
          userName: 'Test User',
          avatarUrl: null,
        }
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`📝 Testing: ${testCase.name}`);
        console.log(`📤 Payload:`, testCase.payload);
        
        const response = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.groupMembersCollectionId,
          `test-${Date.now()}`, // Unique ID for test
          testCase.payload
        );
        
        console.log(`✅ SUCCESS with ${testCase.name}:`, response.$id);
        
        // Clean up test document
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.groupMembersCollectionId,
          response.$id
        );
        
        console.log(`🧹 Cleaned up test document: ${response.$id}`);
        return; // Success - no need to test further
        
      } catch (error: any) {
        console.log(`❌ FAILED with ${testCase.name}:`, error.message);
        continue;
      }
    }
    
    console.log('🚨 All test cases failed - check your database schema!');
  }

  /**
   * Verify that required database collections exist and are accessible
   */
  static async verifyCollections(): Promise<void> {
    console.log('🔍 Verifying database collections...');
    
    const collections = [
      { name: 'Groups', id: appwriteConfig.groupsCollectionId },
      { name: 'Group Members', id: appwriteConfig.groupMembersCollectionId },
      { name: 'Calendar Entries', id: appwriteConfig.calendarEntriesCollectionId },
      { name: 'Chat Messages', id: appwriteConfig.chatMessagesCollectionId },
    ];

    for (const collection of collections) {
      try {
        console.log(`📋 Testing collection: ${collection.name} (${collection.id})`);
        
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          collection.id,
          []
        );
        
        console.log(`✅ ${collection.name}: Accessible, ${response.total} documents`);
        
      } catch (error: any) {
        console.log(`❌ ${collection.name}: ERROR - ${error.message}`);
      }
    }
  }

  /**
   * Check if user has required profile data
   */
  static async verifyUserProfile(): Promise<void> {
    console.log('👤 Verifying user profile...');
    
    try {
      const { userProfileService } = await import('../services/userProfileService');
      const profile = await userProfileService.getUserProfile();
      
      console.log('📋 User profile:', profile);
      
      if (!profile) {
        console.log('⚠️ No user profile found - this might cause userName to be "Anonymous User"');
      } else if (!profile.name || profile.name.trim() === '') {
        console.log('⚠️ User profile has empty name - this might cause issues');
      } else {
        console.log('✅ User profile looks good');
      }
      
    } catch (error: any) {
      console.log('❌ Error checking user profile:', error.message);
    }
  }
}

/**
 * Run all database diagnostics
 */
export const runDatabaseDiagnostics = async (userId: string, groupId: string): Promise<void> => {
  console.log('🚀 Starting comprehensive database diagnostics...\n');
  
  await DatabaseDebugger.verifyCollections();
  console.log('\n');
  
  await DatabaseDebugger.verifyUserProfile();
  console.log('\n');
  
  await DatabaseDebugger.testGroupMembershipCreation(userId, groupId);
  console.log('\n✅ Database diagnostics completed');
};