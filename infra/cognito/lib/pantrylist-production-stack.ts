import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";

interface PantryListTables {
  users: dynamodb.Table;
  products: dynamodb.Table;
  productTypes: dynamodb.Table;
  inventoryLots: dynamodb.Table;
}

export class PantryListProductionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const projectName = this.readContext("projectName", "pantrylist");
    const stage = this.readContext("stage", "prod");
    const domainName = this.readContext(
      "appDomainName",
      "pantrylist.lynxpardelle.com"
    );
    const hostedZoneId = this.readContext(
      "hostedZoneId",
      "Z05088763QG63CC5SE7PN"
    );
    const hostedZoneName = this.readContext(
      "hostedZoneName",
      "lynxpardelle.com"
    );
    const originDomainName = this.readContext(
      "originDomainName",
      "ec2-54-198-41-242.compute-1.amazonaws.com"
    );
    const originRecordName = this.readOptionalContext("originRecordName");
    const originTargetIp = this.readOptionalContext("originTargetIp");
    const originProtocolPolicy = this.readOriginProtocolPolicy();
    const originRequestPolicy =
      originProtocolPolicy === cloudfront.OriginProtocolPolicy.HTTPS_ONLY
        ? cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
        : cloudfront.OriginRequestPolicy.ALL_VIEWER;
    const enableIpv6 = this.readBooleanContext("enableIpv6", true);
    const ec2RoleName = this.readContext(
      "ec2RoleName",
      "EC2TraefikRoute53DNS01Role"
    );
    const recordName = toRecordName(domainName, hostedZoneName);

    const zone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      {
        hostedZoneId,
        zoneName: hostedZoneName,
      }
    );
    const tables = this.createTables(projectName, stage);
    const ec2Role = iam.Role.fromRoleName(this, "DokployEc2Role", ec2RoleName, {
      mutable: true,
    });

    Object.values(tables).forEach((table) => table.grantReadWriteData(ec2Role));
    ec2Role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:TransactWriteItems"],
        resources: [tables.users.tableArn],
      })
    );

    const certificate = new acm.Certificate(this, "CloudFrontCertificate", {
      domainName,
      subjectAlternativeNames: [`test.${domainName}`, `dev.${domainName}`],
      validation: acm.CertificateValidation.fromDns(zone),
    });
    if (originRecordName && originTargetIp) {
      new route53.ARecord(this, "OriginRecord", {
        zone,
        recordName: toRecordName(originRecordName, hostedZoneName),
        target: route53.RecordTarget.fromIpAddresses(originTargetIp),
      });
    }

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `${projectName}-${stage} via Dokploy EC2 origin`,
      defaultBehavior: {
        origin: new origins.HttpOrigin(originDomainName, {
          protocolPolicy: originProtocolPolicy,
          httpPort: 80,
          httpsPort: 443,
          originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
      },
      certificate,
      domainNames: [domainName],
      enableIpv6,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    new route53.ARecord(this, "AliasRecord", {
      zone,
      recordName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });
    if (enableIpv6) {
      new route53.AaaaRecord(this, "AliasIpv6Record", {
        zone,
        recordName,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution)
        ),
      });
    }

    new cdk.CfnOutput(this, "AppDomainName", { value: domainName });
    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: distribution.distributionId,
    });
    new cdk.CfnOutput(this, "CloudFrontDomainName", {
      value: distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "OriginDomainName", {
      value: originDomainName,
    });
    new cdk.CfnOutput(this, "OriginProtocolPolicy", {
      value: originProtocolPolicy,
    });
    if (originRecordName) {
      new cdk.CfnOutput(this, "OriginRecordName", {
        value: originRecordName,
      });
    }
    new cdk.CfnOutput(this, "Ipv6Enabled", {
      value: enableIpv6.toString(),
    });
    new cdk.CfnOutput(this, "DynamoDbUsersTable", {
      value: tables.users.tableName,
    });
    new cdk.CfnOutput(this, "DynamoDbProductsTable", {
      value: tables.products.tableName,
    });
    new cdk.CfnOutput(this, "DynamoDbProductTypesTable", {
      value: tables.productTypes.tableName,
    });
    new cdk.CfnOutput(this, "DynamoDbInventoryLotsTable", {
      value: tables.inventoryLots.tableName,
    });
  }

  private createTables(projectName: string, stage: string): PantryListTables {
    const users = this.createTable(`${projectName}-${stage}-users`, "pk");
    const products = this.createEntityTable(`${projectName}-${stage}-products`);
    const productTypes = this.createEntityTable(
      `${projectName}-${stage}-product-types`
    );
    const inventoryLots = this.createEntityTable(
      `${projectName}-${stage}-inventory-lots`
    );

    products.addGlobalSecondaryIndex({
      indexName: "UserUpdatedAtIndex",
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "updatedAt",
        type: dynamodb.AttributeType.STRING,
      },
    });
    productTypes.addGlobalSecondaryIndex({
      indexName: "UserBaseNameIndex",
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "normalizedBaseName",
        type: dynamodb.AttributeType.STRING,
      },
    });
    inventoryLots.addGlobalSecondaryIndex({
      indexName: "UserUpdatedAtIndex",
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "updatedAt",
        type: dynamodb.AttributeType.STRING,
      },
    });
    inventoryLots.addGlobalSecondaryIndex({
      indexName: "ProductTypeUpdatedAtIndex",
      partitionKey: {
        name: "productTypeId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "updatedAt",
        type: dynamodb.AttributeType.STRING,
      },
    });

    return {
      users,
      products,
      productTypes,
      inventoryLots,
    };
  }

  private createEntityTable(tableName: string): dynamodb.Table {
    return this.createTable(tableName, "id");
  }

  private createTable(
    tableName: string,
    partitionKeyName: string
  ): dynamodb.Table {
    const constructId = tableName
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    const table = new dynamodb.Table(this, constructId, {
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
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    return table;
  }

  private readContext(key: string, fallback: string): string {
    const value = this.node.tryGetContext(key);

    if (value === undefined || value === null) {
      return fallback;
    }

    const normalizedValue = value.toString().trim();

    return normalizedValue.length > 0 ? normalizedValue : fallback;
  }

  private readOptionalContext(key: string): string | undefined {
    const value = this.node.tryGetContext(key);

    if (value === undefined || value === null) {
      return undefined;
    }

    const normalizedValue = value.toString().trim();

    return normalizedValue.length > 0 ? normalizedValue : undefined;
  }

  private readOriginProtocolPolicy(): cloudfront.OriginProtocolPolicy {
    const value = this.readContext("originProtocolPolicy", "http-only")
      .toLowerCase()
      .replace(/_/g, "-");

    switch (value) {
      case "https-only":
        return cloudfront.OriginProtocolPolicy.HTTPS_ONLY;
      case "match-viewer":
        return cloudfront.OriginProtocolPolicy.MATCH_VIEWER;
      case "http-only":
        return cloudfront.OriginProtocolPolicy.HTTP_ONLY;
      default:
        throw new Error(
          `Unsupported originProtocolPolicy "${value}". Use http-only, https-only, or match-viewer.`
        );
    }
  }

  private readBooleanContext(key: string, fallback: boolean): boolean {
    const value = this.node.tryGetContext(key);

    if (value === undefined || value === null) {
      return fallback;
    }

    const normalizedValue = value.toString().trim().toLowerCase();

    if (["1", "true", "yes", "y"].includes(normalizedValue)) {
      return true;
    }

    if (["0", "false", "no", "n"].includes(normalizedValue)) {
      return false;
    }

    throw new Error(
      `Unsupported boolean context "${key}" value "${normalizedValue}".`
    );
  }
}

function toRecordName(domainName: string, zoneName: string): string {
  const normalizedZoneName = zoneName.endsWith(".") ? zoneName : `${zoneName}.`;
  const normalizedDomainName = domainName.endsWith(".")
    ? domainName
    : `${domainName}.`;

  if (normalizedDomainName.endsWith(normalizedZoneName)) {
    return normalizedDomainName
      .slice(0, -normalizedZoneName.length)
      .replace(/\.$/, "");
  }

  return domainName;
}
