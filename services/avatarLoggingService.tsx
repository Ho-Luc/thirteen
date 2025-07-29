import { databases, appwriteConfig, generateId } from '../lib/appwrite';

export class AvatarLoggingService {
  
  /**
   * Test actual field capacity by attempting to store URLs of increasing length
   */
  static async testActualFieldCapacity(): Promise<void> {
    console.log('🧪 TESTING ACTUAL DATABASE FIELD CAPACITY...');
    console.log('📋 Database ID:', appwriteConfig.databaseId);
    console.log('📋 Collection ID:', appwriteConfig.groupMembersCollectionId);
    
    const testSizes = [100, 150, 200, 300, 500, 1000];
    const testUserId = `capacity-test-${Date.now()}`;
    const testGroupId = `test-group-${Date.now()}`;
    
    for (const targetSize of testSizes) {
      console.log(`\n📏 Testing ${targetSize} character URL...`);
      
      // Generate URL of exact target size
      const testUrl = this.generateUrlOfExactLength(targetSize);
      console.log(`📤 Generated test URL (${testUrl.length} chars):`, testUrl.substring(0, 80) + '...');
      
      try {
        const testDoc = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.groupMembersCollectionId,
          generateId(),
          {
            userId: testUserId,
            groupId: testGroupId,
            joinedAt: new Date().toISOString(),
            userName: `Test User ${targetSize}`,
            avatarUrl: testUrl,
          }
        );
        
        const storedUrl = testDoc.avatarUrl;
        const storedLength = storedUrl?.length || 0;
        const wasStored = storedUrl === testUrl;
        
        console.log(`📥 Stored length: ${storedLength} chars`);
        console.log(`🔍 Complete storage: ${wasStored ? 'YES ✅' : 'NO ❌ (TRUNCATED)'}`);
        
        if (!wasStored) {
          console.log(`📊 FIELD LIMIT DETECTED: ${storedLength} characters`);
          console.log(`📤 Sent: "${testUrl}"`);
          console.log(`📥 Got:  "${storedUrl}"`);
          
          // Cleanup and break - we found the limit
          await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.groupMembersCollectionId,
            testDoc.$id
          );
          break;
        }
        
        console.log(`✅ SUCCESS: Field can store ${targetSize}+ characters`);
        
        // Cleanup successful test
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.groupMembersCollectionId,
          testDoc.$id
        );
        
      } catch (error) {
        console.log(`❌ FAILED to store ${targetSize} char URL:`, error.message);
        
        if (error.message.includes('too long') || error.message.includes('100')) {
          console.log(`🚨 DATABASE ERROR CONFIRMS: Field limited to less than ${targetSize} chars`);
          break;
        }
      }
    }
    
    console.log('\n✅ Field capacity test completed');
  }
  
  /**
   * Deep inspection of a specific member's avatar data
   */
  static async inspectMemberAvatar(userId: string, groupId: string): Promise<void> {
    console.log(`\n🔍 DEEP AVATAR INSPECTION FOR USER: ${userId}`);
    console.log(`🏷️ Group: ${groupId}`);
    
    try {
      // Get the member record directly from database
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupMembersCollectionId
      );
      
      // Filter manually to avoid Query import issues
      const memberDocs = response.documents.filter(doc => 
        doc.userId === userId && doc.groupId === groupId
      );
      
      console.log(`📊 Query results: ${memberDocs.length} documents found`);
      
      if (memberDocs.length === 0) {
        console.log(`❌ No membership record found for user ${userId} in group ${groupId}`);
        return;
      }
      
      const memberDoc = memberDocs[0];
      console.log('\n📋 RAW MEMBER DOCUMENT:');
      console.log('Document ID:', memberDoc.$id);
      console.log('User ID:', memberDoc.userId);
      console.log('Group ID:', memberDoc.groupId);
      console.log('User Name:', memberDoc.userName || memberDoc.name || 'NOT SET');
      console.log('Avatar URL:', memberDoc.avatarUrl || 'NOT SET');
      console.log('Avatar URL Length:', memberDoc.avatarUrl?.length || 0);
      console.log('Document Created:', memberDoc.$createdAt);
      console.log('Document Updated:', memberDoc.$updatedAt);
      
      // Analyze the avatar URL
      if (memberDoc.avatarUrl) {
        this.analyzeAvatarUrl(memberDoc.avatarUrl);
      } else {
        console.log('⚠️ No avatar URL found in document');
      }
      
    } catch (error) {
      console.error('❌ Failed to inspect member avatar:', error);
    }
  }
  
  /**
   * Validate field size assumptions without circular imports
   */
  static async validateFieldSizeAssumptions(): Promise<void> {
    console.log('\n🔍 VALIDATING FIELD SIZE ASSUMPTIONS...');
    
    // What our code thinks the field size is
    const assumedFieldSize = 100; // From the service constants
    const recommendedFieldSize = 500;
    
    console.log(`🧠 Code assumes field size: ${assumedFieldSize} characters`);
    console.log(`💡 We want field size: ${recommendedFieldSize} characters`);
    
    // Test what the actual field size is
    await this.testActualFieldCapacity();
    
    // Test with a typical Appwrite URL
    const typicalAppwriteUrl = `https://nyc.cloud.appwrite.io/v1/storage/buckets/user_avatars/files/abc123def456ghi789jkl012mno345pqr/view?project=${appwriteConfig.projectId}`;
    console.log(`\n📏 Typical Appwrite URL length: ${typicalAppwriteUrl.length} characters`);
    console.log(`🔗 Example URL: ${typicalAppwriteUrl}`);
    
    if (typicalAppwriteUrl.length > assumedFieldSize) {
      console.log(`⚠️ PROBLEM: Typical URLs (${typicalAppwriteUrl.length} chars) exceed assumed field size (${assumedFieldSize} chars)`);
    }
  }
  
  // ============== PRIVATE HELPER METHODS ==============
  
  private static generateUrlOfExactLength(targetLength: number): string {
    const baseUrl = 'https://nyc.cloud.appwrite.io/v1/storage/buckets/user_avatars/files/';
    const viewPath = '/view?project=';
    const projectId = appwriteConfig.projectId;
    
    const fixedParts = baseUrl + viewPath + projectId;
    const neededFileIdLength = targetLength - fixedParts.length;
    
    if (neededFileIdLength <= 0) {
      // Target length is too small, just return minimum valid URL
      return baseUrl + 'a'.repeat(32) + viewPath + projectId;
    }
    
    const fileId = 'a'.repeat(neededFileIdLength);
    return baseUrl + fileId + viewPath + projectId;
  }
  
  private static analyzeAvatarUrl(avatarUrl: string): void {
    console.log('\n🔍 AVATAR URL ANALYSIS:');
    console.log(`📏 Length: ${avatarUrl.length} characters`);
    console.log(`🌐 Full URL: ${avatarUrl}`);
    
    // Check for common truncation patterns
    const truncationPatterns = [
      { pattern: /projec$/, name: 'project parameter truncated' },
      { pattern: /view\?proj$/, name: 'query parameter truncated' },
      { pattern: /files\/[a-f0-9]+\/view\?$/, name: 'missing project parameter' },
      { pattern: /\?project=[\w]*$/, name: 'project ID potentially truncated' }
    ];
    
    let truncationFound = false;
    truncationPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(avatarUrl)) {
        console.log(`🚨 TRUNCATION DETECTED: ${name}`);
        truncationFound = true;
      }
    });
    
    if (!truncationFound) {
      console.log('✅ No obvious truncation patterns detected');
    }
    
    // Validate URL structure
    try {
      const urlObj = new URL(avatarUrl);
      console.log(`🏠 Host: ${urlObj.hostname}`);
      console.log(`🛤️ Path: ${urlObj.pathname}`);
      console.log(`❓ Query: ${urlObj.search}`);
      
      // Check if it looks like a complete Appwrite URL
      const hasProjectParam = urlObj.searchParams.has('project');
      console.log(`🔑 Has project parameter: ${hasProjectParam ? 'YES ✅' : 'NO ❌'}`);
      
      if (hasProjectParam) {
        const projectParam = urlObj.searchParams.get('project');
        console.log(`🆔 Project ID: ${projectParam}`);
        console.log(`📏 Project ID length: ${projectParam?.length || 0} chars`);
      }
      
    } catch (error) {
      console.log(`❌ Invalid URL structure: ${error.message}`);
    }
  }
}