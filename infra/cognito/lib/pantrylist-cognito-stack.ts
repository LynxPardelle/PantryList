import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

type ContextValue = string | undefined;

interface SocialProviderConfig {
  enabled: boolean;
  clientId: string;
  clientSecretName: string;
}

export class PantryListCognitoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const projectName = this.readContext('projectName', 'pantrylist');
    const stage = this.readContext('stage', 'dev');
    const localFrontendBaseUrl = this.readContext(
      'localFrontendBaseUrl',
      'http://localhost:48673',
    );
    const productionFrontendBaseUrl = this.readOptionalContext(
      'productionFrontendBaseUrl',
    );
    const domainPrefix =
      this.readOptionalContext('domainPrefix') ||
      `${projectName}-${stage}-${cdk.Aws.ACCOUNT_ID}`;

    const callbackUrls = this.buildCallbackUrls(
      localFrontendBaseUrl,
      productionFrontendBaseUrl,
    );
    const logoutUrls = this.buildLogoutUrls(
      localFrontendBaseUrl,
      productionFrontendBaseUrl,
    );
    const mfaConfiguration = this.readMfaConfiguration();
    const supportedIdentityProviders = ['COGNITO'];
    const identityProviderDependencies: cdk.CfnResource[] = [];

    const userPool = new cognito.CfnUserPool(this, 'UserPool', {
      userPoolName: `${projectName}-${stage}-users`,
      usernameAttributes: ['email'],
      autoVerifiedAttributes: ['email'],
      mfaConfiguration,
      enabledMfas:
        mfaConfiguration === 'OFF' ? undefined : ['SOFTWARE_TOKEN_MFA'],
      deletionProtection: this.readBooleanContext('deletionProtection', false)
        ? 'ACTIVE'
        : 'INACTIVE',
      accountRecoverySetting: {
        recoveryMechanisms: [
          {
            name: 'verified_email',
            priority: 1,
          },
        ],
      },
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: false,
      },
      policies: {
        passwordPolicy: {
          minimumLength: 12,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true,
          requireUppercase: true,
          temporaryPasswordValidityDays: 7,
        },
      },
      schema: [
        {
          name: 'email',
          attributeDataType: 'String',
          mutable: true,
          required: true,
        },
        {
          name: 'name',
          attributeDataType: 'String',
          mutable: true,
          required: false,
        },
        {
          name: 'preferred_username',
          attributeDataType: 'String',
          mutable: true,
          required: false,
        },
      ],
      userAttributeUpdateSettings: {
        attributesRequireVerificationBeforeUpdate: ['email'],
      },
      verificationMessageTemplate: {
        defaultEmailOption: 'CONFIRM_WITH_CODE',
      },
    });
    userPool.applyRemovalPolicy(this.resolveRemovalPolicy());

    const userPoolDomain = new cognito.CfnUserPoolDomain(
      this,
      'UserPoolDomain',
      {
        domain: domainPrefix,
        managedLoginVersion: 2,
        userPoolId: userPool.ref,
      },
    );

    const googleProvider = this.createGoogleProviderIfConfigured(userPool.ref);
    if (googleProvider) {
      supportedIdentityProviders.push('Google');
      identityProviderDependencies.push(googleProvider);
    }

    const facebookProvider = this.createFacebookProviderIfConfigured(
      userPool.ref,
    );
    if (facebookProvider) {
      supportedIdentityProviders.push('Facebook');
      identityProviderDependencies.push(facebookProvider);
    }

    const userPoolClient = new cognito.CfnUserPoolClient(
      this,
      'WebUserPoolClient',
      {
        userPoolId: userPool.ref,
        clientName: `${projectName}-${stage}-web`,
        generateSecret: false,
        preventUserExistenceErrors: 'ENABLED',
        enableTokenRevocation: true,
        allowedOAuthFlowsUserPoolClient: true,
        allowedOAuthFlows: ['code'],
        allowedOAuthScopes: ['openid', 'email', 'profile'],
        callbackUrLs: callbackUrls,
        logoutUrLs: logoutUrls,
        supportedIdentityProviders,
        explicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH', 'ALLOW_USER_SRP_AUTH'],
        accessTokenValidity: 1,
        idTokenValidity: 1,
        refreshTokenValidity: 30,
        tokenValidityUnits: {
          accessToken: 'hours',
          idToken: 'hours',
          refreshToken: 'days',
        },
      },
    );

    identityProviderDependencies.forEach((dependency) => {
      userPoolClient.addDependency(dependency);
    });

    const managedLoginBranding = new cognito.CfnManagedLoginBranding(
      this,
      'ManagedLoginBranding',
      {
        userPoolId: userPool.ref,
        clientId: userPoolClient.ref,
        useCognitoProvidedValues: true,
      },
    );
    managedLoginBranding.addDependency(userPoolClient);

    const userPoolDomainUrl = `https://${domainPrefix}.auth.${cdk.Aws.REGION}.amazoncognito.com`;

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.ref,
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.ref,
    });
    new cdk.CfnOutput(this, 'CognitoIssuer', {
      value: `https://cognito-idp.${cdk.Aws.REGION}.${cdk.Aws.URL_SUFFIX}/${userPool.ref}`,
    });
    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: userPoolDomainUrl,
    });
    new cdk.CfnOutput(this, 'SocialProviderRedirectUri', {
      value: `${userPoolDomainUrl}/oauth2/idpresponse`,
    });
    new cdk.CfnOutput(this, 'AllowedProviders', {
      value: supportedIdentityProviders.join(','),
    });
    new cdk.CfnOutput(this, 'LocalCallbackUrl', {
      value: `${localFrontendBaseUrl}/api/auth/cognito/callback`,
    });

    userPoolClient.addDependency(userPoolDomain);
  }

  private createGoogleProviderIfConfigured(
    userPoolId: string,
  ): cognito.CfnUserPoolIdentityProvider | undefined {
    const config = this.readSocialProviderConfig(
      'enableGoogle',
      'googleClientId',
      'googleClientSecretName',
    );

    if (!config.enabled) {
      return undefined;
    }

    return new cognito.CfnUserPoolIdentityProvider(this, 'GoogleProvider', {
      userPoolId,
      providerName: 'Google',
      providerType: 'Google',
      providerDetails: {
        client_id: config.clientId,
        client_secret: cdk.SecretValue.secretsManager(
          config.clientSecretName,
        ).unsafeUnwrap(),
        authorize_scopes: 'email profile openid',
      },
      attributeMapping: {
        email: 'email',
        name: 'name',
        preferred_username: 'email',
      },
    });
  }

  private createFacebookProviderIfConfigured(
    userPoolId: string,
  ): cognito.CfnUserPoolIdentityProvider | undefined {
    const config = this.readSocialProviderConfig(
      'enableFacebook',
      'facebookClientId',
      'facebookClientSecretName',
    );

    if (!config.enabled) {
      return undefined;
    }

    return new cognito.CfnUserPoolIdentityProvider(this, 'FacebookProvider', {
      userPoolId,
      providerName: 'Facebook',
      providerType: 'Facebook',
      providerDetails: {
        client_id: config.clientId,
        client_secret: cdk.SecretValue.secretsManager(
          config.clientSecretName,
        ).unsafeUnwrap(),
        authorize_scopes: 'public_profile, email',
        api_version: this.readContext('facebookApiVersion', 'v17.0'),
      },
      attributeMapping: {
        email: 'email',
        name: 'name',
      },
    });
  }

  private readSocialProviderConfig(
    enabledKey: string,
    clientIdKey: string,
    clientSecretNameKey: string,
  ): SocialProviderConfig {
    const enabled = this.readBooleanContext(enabledKey, false);
    const clientId = this.readOptionalContext(clientIdKey);
    const clientSecretName = this.readOptionalContext(clientSecretNameKey);

    if (enabled && (!clientId || !clientSecretName)) {
      throw new Error(
        `${enabledKey}=true requires ${clientIdKey} and ${clientSecretNameKey}`,
      );
    }

    return {
      enabled,
      clientId: clientId ?? '',
      clientSecretName: clientSecretName ?? '',
    };
  }

  private buildCallbackUrls(
    localFrontendBaseUrl: string,
    productionFrontendBaseUrl: ContextValue,
  ): string[] {
    return this.uniqueUrls([
      `${localFrontendBaseUrl}/api/auth/cognito/callback`,
      productionFrontendBaseUrl
        ? `${productionFrontendBaseUrl}/api/auth/cognito/callback`
        : undefined,
      ...this.readCsvContext('extraCallbackUrls'),
    ]);
  }

  private buildLogoutUrls(
    localFrontendBaseUrl: string,
    productionFrontendBaseUrl: ContextValue,
  ): string[] {
    return this.uniqueUrls([
      `${localFrontendBaseUrl}/login`,
      productionFrontendBaseUrl ? `${productionFrontendBaseUrl}/login` : undefined,
      ...this.readCsvContext('extraLogoutUrls'),
    ]);
  }

  private uniqueUrls(values: Array<string | undefined>): string[] {
    return [
      ...new Set(
        values
          .map((value) => value?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ];
  }

  private readContext(key: string, fallback: string): string {
    return this.readOptionalContext(key) ?? fallback;
  }

  private readOptionalContext(key: string): ContextValue {
    const value = this.node.tryGetContext(key);

    if (value === undefined || value === null) {
      return undefined;
    }

    const normalizedValue = value.toString().trim();

    return normalizedValue.length > 0 ? normalizedValue : undefined;
  }

  private readBooleanContext(key: string, fallback: boolean): boolean {
    const value = this.readOptionalContext(key);

    if (!value) {
      return fallback;
    }

    return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
  }

  private readCsvContext(key: string): string[] {
    const value = this.readOptionalContext(key);

    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private resolveRemovalPolicy(): cdk.RemovalPolicy {
    const removalPolicy = this.readContext('removalPolicy', 'retain');

    if (removalPolicy.toLowerCase() === 'destroy') {
      return cdk.RemovalPolicy.DESTROY;
    }

    return cdk.RemovalPolicy.RETAIN;
  }

  private readMfaConfiguration(): 'OFF' | 'OPTIONAL' | 'ON' {
    const value = this.readContext('mfaConfiguration', 'OFF')
      .trim()
      .toUpperCase();

    if (value === 'OFF' || value === 'OPTIONAL' || value === 'ON') {
      return value;
    }

    throw new Error(
      `Unsupported mfaConfiguration "${value}". Use OFF, OPTIONAL, or ON.`,
    );
  }
}
