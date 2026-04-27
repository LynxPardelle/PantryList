#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PantryListCognitoStack } from '../lib/pantrylist-cognito-stack';

const app = new cdk.App();

const projectName =
  app.node.tryGetContext('projectName')?.toString().trim() || 'pantrylist';
const stage = app.node.tryGetContext('stage')?.toString().trim() || 'dev';
const region =
  app.node.tryGetContext('awsRegion')?.toString().trim() ||
  process.env.CDK_DEFAULT_REGION ||
  'us-east-1';
const account = process.env.CDK_DEFAULT_ACCOUNT;

new PantryListCognitoStack(app, `${projectName}-${stage}-cognito`, {
  env: {
    account,
    region,
  },
});
