import { databases, appwriteConfig, generateId } from '../lib/appwrite';

export class AvatarLoggingService {
  
  /**
   * Test actual field capacity by attempting to store URLs of increasing length
   */
  static async testActualFieldCapacity(): Promise<void> {
    const testSizes = [100, 150, 200, 300, 500, 1000];
    const testUserId = `capacity-test-${Date.now()}`;
    const testGroupId = `test-group-${Date.now()}`;
    
    for (const targetSize of testSizes) {
      
      // Generate URL of exact target size
      const testUrl = this.generateUrlOfExactLength(targetSize);
      
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
        
        if (!wasStored) {
          // Cleanup and break - we found the limit
          await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.groupMembersCollectionId,
            testDoc.$id
          );
          break;
        }
        
        // Cleanup successful test
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.groupMembersCollectionId,
          testDoc.$id
        ); 
      } catch (error) {
      }
    }
  }
  
  /**
   * Deep inspection of a specific member's avatar data
   */
  static async inspectMemberAvatar(userId: string, groupId: string): Promise<void> {
    
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
            
      if (memberDocs.length === 0) {
        return;
      }
      
      const memberDoc = memberDocs[0];
      
      // Analyze the avatar URL
      if (memberDoc.avatarUrl) {
        this.analyzeAvatarUrl(memberDoc.avatarUrl);
      } else {
      }
      
    } catch (error) {
    }
  }
  
  /**
   * Validate field size assumptions without circular imports
   */
  static async validateFieldSizeAssumptions(): Promise<void> {    
    // What our code thinks the field size is
    const assumedFieldSize = 100; // From the service constants
    const recommendedFieldSize = 500;
    
    // Test what the actual field size is
    await this.testActualFieldCapacity();
    
    // Test with a typical Appwrite URL
    const typicalAppwriteUrl = `https://nyc.cloud.appwrite.io/v1/storage/buckets/user_avatars/files/abc123def456ghi789jkl012mno345pqr/view?project=${appwriteConfig.projectId}`;
    
    if (typicalAppwriteUrl.length > assumedFieldSize) {
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
        truncationFound = true;
      }
    });
    
    // Validate URL structure
    try {
      const urlObj = new URL(avatarUrl);
      
      // Check if it looks like a complete Appwrite URL
      const hasProjectParam = urlObj.searchParams.has('project');
      
      if (hasProjectParam) {
        const projectParam = urlObj.searchParams.get('project');
      }
      
    } catch (error) {
    }
  }
}