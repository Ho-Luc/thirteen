// utils/schemaInspector.ts
import { databases, appwriteConfig } from '../lib/appwrite';

interface CollectionAttribute {
  key: string;
  type: string;
  required: boolean;
  array?: boolean;
  default?: any;
}

interface CollectionSchema {
  collectionId: string;
  name: string;
  attributes: CollectionAttribute[];
}

class SchemaInspector {
  /**
   * Get the actual schema of a collection from Appwrite
   */
  async getCollectionSchema(collectionId: string): Promise<CollectionSchema> {
    try {
      // Note: This requires the Appwrite SDK's databases.getCollection method
      // If not available, we'll use a fallback method
      const collection = await databases.getCollection(
        appwriteConfig.databaseId,
        collectionId
      );

      return {
        collectionId: collection.$id,
        name: collection.name,
        attributes: collection.attributes.map((attr: any) => ({
          key: attr.key,
          type: attr.type,
          required: attr.required,
          array: attr.array,
          default: attr.default,
        })),
      };
    } catch (error) {
      console.error('Error getting collection schema:', error);
      throw new Error('Failed to inspect collection schema');
    }
  }

  /**
   * Validate if a document structure matches the collection schema
   */
  validateDocumentStructure(
    documentData: Record<string, any>, 
    schema: CollectionSchema
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for missing required fields
    const requiredFields = schema.attributes
      .filter(attr => attr.required)
      .map(attr => attr.key);
    
    for (const field of requiredFields) {
      if (!(field in documentData) || documentData[field] === undefined || documentData[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Check for unknown fields
    const validFields = schema.attributes.map(attr => attr.key);
    const documentFields = Object.keys(documentData);
    
    for (const field of documentFields) {
      if (!validFields.includes(field)) {
        errors.push(`Unknown field: ${field} (valid fields: ${validFields.join(', ')})`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get schema for group members collection specifically
   */
  async getGroupMembersSchema(): Promise<CollectionSchema> {
    return this.getCollectionSchema(appwriteConfig.groupMembersCollectionId);
  }

  /**
   * Get schema for chat messages collection specifically
   */
  async getChatMessagesSchema(): Promise<CollectionSchema> {
    return this.getCollectionSchema(appwriteConfig.chatMessagesCollectionId);
  }

  /**
   * Print schema information for debugging
   */
  async printCollectionInfo(collectionId: string): Promise<void> {
    try {
      const schema = await this.getCollectionSchema(collectionId);
      
      console.log(`\n=== Collection Schema: ${schema.name} ===`);
      console.log(`Collection ID: ${schema.collectionId}`);
      console.log(`\nAttributes:`);
      
      schema.attributes.forEach(attr => {
        const required = attr.required ? '(required)' : '(optional)';
        const array = attr.array ? '[]' : '';
        console.log(`  - ${attr.key}: ${attr.type}${array} ${required}`);
        if (attr.default !== undefined) {
          console.log(`    Default: ${attr.default}`);
        }
      });
      
      console.log(`\nRequired fields: ${schema.attributes.filter(a => a.required).map(a => a.key).join(', ')}`);
      console.log(`Optional fields: ${schema.attributes.filter(a => !a.required).map(a => a.key).join(', ')}`);
    } catch (error) {
      console.error('Failed to print collection info:', error);
    }
  }

  /**
   * Alternative method: Inspect by attempting to create a test document
   * Use this if getCollection API is not available
   */
  async inspectByTrialAndError(collectionId: string): Promise<string[]> {
    const commonFieldCombinations = [
      // For group members
      { userId: 'test', groupId: 'test', name: 'test' },
      { userId: 'test', groupId: 'test', userName: 'test' },
      { userId: 'test', groupId: 'test', displayName: 'test' },
      { userId: 'test', groupId: 'test', memberName: 'test' },
    ];

    const errors: string[] = [];

    for (const testData of commonFieldCombinations) {
      try {
        // Attempt to create document (this will fail, but give us schema info)
        await databases.createDocument(
          appwriteConfig.databaseId,
          collectionId,
          'test-id-will-fail',
          testData
        );
      } catch (error: any) {
        if (error.message) {
          errors.push(`Test ${JSON.stringify(testData)}: ${error.message}`);
        }
      }
    }

    return errors;
  }
}

export const schemaInspector = new SchemaInspector();

// Development helper function
export const debugCollectionSchema = async (collectionId: string) => {
  if (__DEV__) {
    console.log('🔍 Inspecting collection schema...');
    try {
      await schemaInspector.printCollectionInfo(collectionId);
    } catch (error) {
      console.log('📋 Schema inspection failed, trying trial and error method...');
      const errors = await schemaInspector.inspectByTrialAndError(collectionId);
      console.log('Trial and error results:', errors);
    }
  }
};