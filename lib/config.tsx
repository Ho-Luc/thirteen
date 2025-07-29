interface AppConfig {
  appwrite: {
    endpoint: string;
    platform: string;
    projectId: string;
    databaseId: string;
    groupsCollectionId: string;
  };
  isDevelopment: boolean;
  isProduction: boolean;
}

class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): AppConfig {
    return {
      appwrite: {
        endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1',
        platform: process.env.EXPO_PUBLIC_APPWRITE_PLATFORM || 'com.ios.thirteen',
        projectId: this.getRequiredEnvVar('EXPO_PUBLIC_APPWRITE_PROJECT_ID'),
        databaseId: this.getRequiredEnvVar('EXPO_PUBLIC_APPWRITE_DATABASE_ID'),
        groupsCollectionId: this.getRequiredEnvVar('EXPO_PUBLIC_APPWRITE_GROUPS_COLLECTION_ID'),
      },
      isDevelopment: __DEV__,
      isProduction: !__DEV__,
    };
  }

  private getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  private validateConfig(): void {
    const { appwrite } = this.config;
    
    // Validate URLs
    if (!appwrite.endpoint.startsWith('http')) {
      throw new Error('Invalid Appwrite endpoint URL');
    }

    // Validate IDs are not empty
    if (!appwrite.projectId || !appwrite.databaseId || !appwrite.groupsCollectionId) {
      throw new Error('All Appwrite IDs must be provided');
    } 
  }

  public getAppwriteConfig() {
    return this.config.appwrite;
  }

  public isDev(): boolean {
    return this.config.isDevelopment;
  }

  public isProd(): boolean {
    return this.config.isProduction;
  }
}

export const configService = new ConfigService();
export default configService;