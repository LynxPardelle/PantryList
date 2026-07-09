import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface DespensaListaServerlessBackendStackProps extends cdk.StackProps {
  allowedProviders: string[];
  cognitoDomain: string;
  cognitoUserPoolClientId: string;
  cognitoUserPoolId: string;
}

interface DespensaListaTables {
  inventoryLots: dynamodb.Table;
  productTypes: dynamodb.Table;
  products: dynamodb.Table;
  users: dynamodb.Table;
}

export class DespensaListaServerlessBackendStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: DespensaListaServerlessBackendStackProps,
  ) {
    super(scope, id, props);

    const projectName = this.readContext('projectName', 'despensalista');
    const stage = this.readContext('stage', 'dev');
    const frontendBaseUrl = this.readContext(
      'serverlessFrontendBaseUrl',
      this.readContext('localFrontendBaseUrl', 'http://localhost:48673'),
    );
    const domainName = this.readContext(
      'appDomainName',
      'despensalista.lynxpardelle.com',
    );
    const hostedZoneId = this.readContext(
      'hostedZoneId',
      'Z05088763QG63CC5SE7PN',
    );
    const hostedZoneName = this.readContext('hostedZoneName', 'lynxpardelle.com');
    const tables = this.createTables(projectName, stage);
    const apiFunction = new lambda.Function(this, 'BackendFunction', {
      functionName: `${projectName}-${stage}-backend-api`,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'dist/src/lambda.handler',
      memorySize: this.readNumberContext('backendLambdaMemoryMb', 512),
      timeout: cdk.Duration.seconds(
        this.readNumberContext('backendLambdaTimeoutSeconds', 15),
      ),
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', '..', '..', 'backend'),
        {
          bundling: createBackendBundlingOptions(),
        },
      ),
      environment: {
        NODE_ENV: 'production',
        API_PREFIX: 'api',
        PERSISTENCE_PROVIDER: 'dynamodb',
        DYNAMODB_REGION: cdk.Aws.REGION,
        DYNAMODB_USERS_TABLE: tables.users.tableName,
        DYNAMODB_PRODUCTS_TABLE: tables.products.tableName,
        DYNAMODB_PRODUCT_TYPES_TABLE: tables.productTypes.tableName,
        DYNAMODB_INVENTORY_LOTS_TABLE: tables.inventoryLots.tableName,
        CORS_ORIGIN: frontendBaseUrl,
        COGNITO_ENABLED: 'true',
        COGNITO_ISSUER: `https://cognito-idp.${cdk.Aws.REGION}.${cdk.Aws.URL_SUFFIX}/${props.cognitoUserPoolId}`,
        COGNITO_DOMAIN: props.cognitoDomain,
        COGNITO_CLIENT_ID: props.cognitoUserPoolClientId,
        COGNITO_USER_POOL_ID: props.cognitoUserPoolId,
        COGNITO_REGION: cdk.Aws.REGION,
        COGNITO_REDIRECT_URI: `${frontendBaseUrl}/api/auth/cognito/callback`,
        COGNITO_LOGOUT_REDIRECT_URI: `${frontendBaseUrl}/login`,
        COGNITO_ALLOWED_PROVIDERS: props.allowedProviders.join(','),
        HELMET_ENABLED: 'true',
        RATE_LIMIT_ENABLED: 'true',
        RATE_LIMIT_TRUST_PROXY: 'true',
        SWAGGER_ENABLED: 'false',
      },
    });

    Object.values(tables).forEach((table) => table.grantReadWriteData(apiFunction));
    apiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:TransactWriteItems'],
        resources: [tables.users.tableArn],
      }),
    );
    apiFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:AdminUserGlobalSignOut',
          'cognito-idp:ListUsers',
        ],
        resources: [
          this.formatArn({
            service: 'cognito-idp',
            resource: 'userpool',
            resourceName: props.cognitoUserPoolId,
          }),
        ],
      }),
    );

    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${projectName}-${stage}-backend-api`,
      corsPreflight: {
        allowCredentials: true,
        allowHeaders: ['authorization', 'content-type', 'x-xsrf-token', 'x-metrics-token'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowOrigins: [frontendBaseUrl],
      },
    });
    const integration = new integrations.HttpLambdaIntegration(
      'BackendIntegration',
      apiFunction,
    );

    httpApi.addRoutes({
      path: '/',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration,
    });
    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration,
    });

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId,
      zoneName: hostedZoneName,
    });
    const certificate = new acm.Certificate(this, 'WebCertificate', {
      domainName,
      validation: acm.CertificateValidation.fromDns(zone),
    });
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: this.resolveRemovalPolicy(),
      autoDeleteObjects:
        this.resolveRemovalPolicy() === cdk.RemovalPolicy.DESTROY,
    });
    const responseHeadersPolicy = this.createResponseHeadersPolicy(
      projectName,
      stage,
    );
    const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      comment: `${projectName}-${stage} serverless web`,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        functionAssociations: [
          {
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            function: this.createSpaRewriteFunction(projectName, stage),
          },
        ],
      },
      additionalBehaviors: {
        'api/*': {
          origin: new origins.HttpOrigin(apiDomainNameFromEndpoint(httpApi.apiEndpoint), {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
      certificate,
      domainNames: [domainName],
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    new s3deploy.BucketDeployment(this, 'DeployWeb', {
      sources: [s3deploy.Source.asset(frontendBrowserDistPath())],
      destinationBucket: webBucket,
      distribution,
      distributionPaths: ['/*'],
      prune: true,
      cacheControl: [s3deploy.CacheControl.noCache()],
    });

    new route53.ARecord(this, 'AliasRecord', {
      zone,
      recordName: toRecordName(domainName, hostedZoneName),
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
    });
    new route53.AaaaRecord(this, 'AliasIpv6Record', {
      zone,
      recordName: toRecordName(domainName, hostedZoneName),
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
    });

    new cdk.CfnOutput(this, 'ServerlessBackendApiEndpoint', {
      value: httpApi.apiEndpoint,
    });
    new cdk.CfnOutput(this, 'ServerlessBackendFunctionName', {
      value: apiFunction.functionName,
    });
    new cdk.CfnOutput(this, 'DynamoDbUsersTable', {
      value: tables.users.tableName,
    });
    new cdk.CfnOutput(this, 'DynamoDbProductsTable', {
      value: tables.products.tableName,
    });
    new cdk.CfnOutput(this, 'DynamoDbProductTypesTable', {
      value: tables.productTypes.tableName,
    });
    new cdk.CfnOutput(this, 'DynamoDbInventoryLotsTable', {
      value: tables.inventoryLots.tableName,
    });
    new cdk.CfnOutput(this, 'AppDomainName', { value: domainName });
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
    });
    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, 'WebBucketName', { value: webBucket.bucketName });
  }

  private createTables(projectName: string, stage: string): DespensaListaTables {
    const users = this.createTable(`${projectName}-${stage}-users`, 'pk');
    const products = this.createTable(`${projectName}-${stage}-products`, 'id');
    const productTypes = this.createTable(
      `${projectName}-${stage}-product-types`,
      'id',
    );
    const inventoryLots = this.createTable(
      `${projectName}-${stage}-inventory-lots`,
      'id',
    );

    users.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
    });
    users.addGlobalSecondaryIndex({
      indexName: 'gsi2',
      partitionKey: { name: 'gsi2pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi2sk', type: dynamodb.AttributeType.STRING },
    });
    products.addGlobalSecondaryIndex({
      indexName: 'UserUpdatedAtIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
    });
    productTypes.addGlobalSecondaryIndex({
      indexName: 'UserBaseNameIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'normalizedBaseName', type: dynamodb.AttributeType.STRING },
    });
    inventoryLots.addGlobalSecondaryIndex({
      indexName: 'UserUpdatedAtIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
    });
    inventoryLots.addGlobalSecondaryIndex({
      indexName: 'ProductTypeUpdatedAtIndex',
      partitionKey: { name: 'productTypeId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
    });

    return { users, products, productTypes, inventoryLots };
  }

  private createTable(tableName: string, partitionKeyName: string): dynamodb.Table {
    return new dynamodb.Table(this, toConstructId(tableName), {
      tableName,
      partitionKey: {
        name: partitionKeyName,
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: this.resolveRemovalPolicy(),
      timeToLiveAttribute: 'expiresAtEpochSeconds',
    });
  }

  private readContext(key: string, fallback: string): string {
    const value = this.node.tryGetContext(key);

    if (value === undefined || value === null) {
      return fallback;
    }

    const normalizedValue = value.toString().trim();

    return normalizedValue.length > 0 ? normalizedValue : fallback;
  }

  private readNumberContext(key: string, fallback: number): number {
    const value = Number(this.readContext(key, fallback.toString()));

    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${key} must be a positive number.`);
    }

    return value;
  }

  private resolveRemovalPolicy(): cdk.RemovalPolicy {
    const removalPolicy = this.readContext('removalPolicy', 'retain');

    return removalPolicy.toLowerCase() === 'destroy'
      ? cdk.RemovalPolicy.DESTROY
      : cdk.RemovalPolicy.RETAIN;
  }

  private createSpaRewriteFunction(
    projectName: string,
    stage: string,
  ): cloudfront.Function {
    return new cloudfront.Function(this, 'SpaRewriteFunction', {
      functionName: `${projectName}-${stage}-spa-rewrite`,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri === '/healthz') {
    return {
      statusCode: 200,
      statusDescription: 'OK',
      headers: {
        'cache-control': { value: 'no-store' },
        'content-type': { value: 'application/json' }
      },
      body: '{"status":"ok","service":"despensalista-frontend"}'
    };
  }

  if (uri === '/privacidad' || uri === '/privacidad/') {
    request.uri = '/privacidad/index.html';
    return request;
  }

  if (uri === '/api' || uri.indexOf('/api/') === 0 || uri.indexOf('.') !== -1) {
    return request;
  }

  request.uri = '/index.html';
  return request;
}
`),
    });
  }

  private createResponseHeadersPolicy(
    projectName: string,
    stage: string,
  ): cloudfront.ResponseHeadersPolicy {
    return new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      responseHeadersPolicyName: `${projectName}-${stage}-serverless-security-headers`,
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'self'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self' 'unsafe-inline'",
            "connect-src 'self'",
            "form-action 'self' https://*.amazoncognito.com",
          ].join('; '),
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.SAMEORIGIN,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy:
            cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(365),
          includeSubdomains: true,
          override: true,
        },
        xssProtection: {
          protection: false,
          override: true,
        },
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
            override: true,
          },
        ],
      },
    });
  }
}

function toConstructId(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function createBackendBundlingOptions(): cdk.BundlingOptions {
  return {
    image: lambda.Runtime.NODEJS_22_X.bundlingImage,
    command: [
      'bash',
      '-c',
      [
        'set -euo pipefail',
        'cp -R /asset-input/. /tmp/despensalista-backend',
        'cd /tmp/despensalista-backend',
        'npm ci',
        'npm run build',
        'npm prune --omit=dev',
        'cp -R dist node_modules package.json package-lock.json /asset-output/',
      ].join(' && '),
    ],
    local: {
      tryBundle(outputDir: string): boolean {
        return tryBundleBackendLocally(outputDir);
      },
    },
  };
}

function tryBundleBackendLocally(outputDir: string): boolean {
  const sourceDir = path.join(__dirname, '..', '..', '..', 'backend');
  const temporaryDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'despensalista-backend-bundle-'),
  );

  try {
    fs.cpSync(sourceDir, temporaryDir, {
      recursive: true,
      filter: (source) => !shouldSkipBackendBundlePath(source, sourceDir),
    });

    runNpm(['ci'], temporaryDir);
    runNpm(['run', 'build'], temporaryDir);
    runNpm(['prune', '--omit=dev'], temporaryDir);

    for (const assetName of [
      'dist',
      'node_modules',
      'package.json',
      'package-lock.json',
    ]) {
      fs.cpSync(path.join(temporaryDir, assetName), path.join(outputDir, assetName), {
        recursive: true,
      });
    }

    return true;
  } catch (error) {
    console.warn(
      `Local backend bundle failed; falling back to Docker bundling: ${String(error)}`,
    );

    return false;
  } finally {
    fs.rmSync(temporaryDir, { recursive: true, force: true });
  }
}

function runNpm(args: string[], cwd: string): void {
  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/c', 'npm', ...args], { cwd, stdio: 'inherit' });
    return;
  }

  execFileSync('npm', args, { cwd, stdio: 'inherit' });
}

function shouldSkipBackendBundlePath(source: string, sourceDir: string): boolean {
  const relativePath = path.relative(sourceDir, source);
  const [firstSegment] = relativePath.split(path.sep);

  return ['coverage', 'dist', 'node_modules'].includes(firstSegment);
}

function apiDomainNameFromEndpoint(endpoint: string): string {
  return cdk.Fn.select(2, cdk.Fn.split('/', endpoint));
}

function frontendBrowserDistPath(): string {
  const distPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'frontend',
    'dist',
    'frontend',
    'browser',
  );

  if (!fs.existsSync(distPath)) {
    throw new Error('Build frontend before CDK synth: npm --prefix frontend run build');
  }

  return distPath;
}

function toRecordName(domainName: string, zoneName: string): string {
  const normalizedZoneName = zoneName.endsWith('.') ? zoneName : `${zoneName}.`;
  const normalizedDomainName = domainName.endsWith('.')
    ? domainName
    : `${domainName}.`;

  if (normalizedDomainName.endsWith(normalizedZoneName)) {
    return normalizedDomainName
      .slice(0, -normalizedZoneName.length)
      .replace(/\.$/, '');
  }

  return domainName;
}
