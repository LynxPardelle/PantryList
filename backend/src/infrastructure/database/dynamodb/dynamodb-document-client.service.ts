import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ServiceInputTypes,
  ServiceOutputTypes,
} from '@aws-sdk/lib-dynamodb';
import { Command } from '@smithy/smithy-client';

@Injectable()
export class DynamoDbDocumentClientService {
  readonly client: DynamoDBDocumentClient;

  constructor(private readonly configService: ConfigService) {
    const region =
      this.configService.get<string>('DYNAMODB_REGION') ||
      this.configService.get<string>('AWS_REGION') ||
      this.configService.get<string>('AWS_DEFAULT_REGION') ||
      'us-east-1';
    const endpoint = this.configService.get<string>('DYNAMODB_ENDPOINT');

    this.client = DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region,
        ...(endpoint ? { endpoint } : {}),
      }),
      {
        marshallOptions: {
          removeUndefinedValues: true,
        },
      },
    );
  }

  send<TOutput extends ServiceOutputTypes>(
    command: Command<ServiceInputTypes, TOutput, object, object>,
  ): Promise<TOutput> {
    return this.client.send(command);
  }
}
