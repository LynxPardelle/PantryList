#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DespensaListaCognitoStack } from "../lib/despensalista-cognito-stack";
import { DespensaListaProductionStack } from "../lib/despensalista-production-stack";
import { DespensaListaServerlessBackendStack } from "../lib/despensalista-serverless-backend-stack";

const app = new cdk.App();

const projectName =
  app.node.tryGetContext("projectName")?.toString().trim() || "despensalista";
const stage = app.node.tryGetContext("stage")?.toString().trim() || "dev";
const region =
  app.node.tryGetContext("awsRegion")?.toString().trim() ||
  process.env.CDK_DEFAULT_REGION ||
  "us-east-1";
const account = process.env.CDK_DEFAULT_ACCOUNT;

const cognitoStack = new DespensaListaCognitoStack(app, `${projectName}-${stage}-cognito`, {
  env: {
    account,
    region,
  },
});
cdk.Tags.of(cognitoStack).add("Project", projectName);
cdk.Tags.of(cognitoStack).add("Stage", stage);

const includeServerlessBackend = ["1", "true", "yes", "y"].includes(
  app.node
    .tryGetContext("includeServerlessBackend")
    ?.toString()
    .trim()
    .toLowerCase() ?? "false"
);

if (includeServerlessBackend) {
  const serverlessBackendStack = new DespensaListaServerlessBackendStack(
    app,
    `${projectName}-${stage}-serverless-backend`,
    {
      env: {
        account,
        region,
      },
      allowedProviders: cognitoStack.allowedProviders,
      cognitoDomain: cognitoStack.userPoolDomainUrl,
      cognitoUserPoolClientId: cognitoStack.userPoolClientId,
      cognitoUserPoolId: cognitoStack.userPoolId,
    },
  );
  cdk.Tags.of(serverlessBackendStack).add("Project", projectName);
  cdk.Tags.of(serverlessBackendStack).add("Stage", stage);
}

const includeProductionInfra = ["1", "true", "yes", "y"].includes(
  app.node
    .tryGetContext("includeProductionInfra")
    ?.toString()
    .trim()
    .toLowerCase() ?? "false"
);

if (includeProductionInfra) {
  const productionStack = new DespensaListaProductionStack(app, `${projectName}-${stage}-app`, {
    env: {
      account,
      region,
    },
  });
  cdk.Tags.of(productionStack).add("Project", projectName);
  cdk.Tags.of(productionStack).add("Stage", stage);
}
