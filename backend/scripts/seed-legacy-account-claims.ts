import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import mongoose from 'mongoose';

type CollectionName = 'products' | 'product_types' | 'inventory_lots';

type LegacyAccountClaimStatus = 'unclaimed' | 'claiming' | 'claimed' | 'locked';

type PersistedLegacyAccountClaim = {
  id: string;
  legacyUsername: string;
  normalizedLegacyUsername: string;
  status: LegacyAccountClaimStatus;
  claimedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  claimedAt: Date | null;
};

type OwnerScanSummary = {
  ownersByNormalizedUsername: Map<string, string>;
  distinctOwnerCountsByCollection: Record<CollectionName, number>;
  blankOwnershipValuesIgnored: number;
  nonStringOwnershipValuesIgnored: number;
};

const COLLECTIONS: CollectionName[] = [
  'products',
  'product_types',
  'inventory_lots',
];

async function main(): Promise<void> {
  const dryRun = !process.argv.slice(2).includes('--apply');
  const env = loadLocalEnv(join(__dirname, '..', '.env'));
  const databaseUrl =
    process.env.DATABASE_URL ??
    env.DATABASE_URL ??
    'mongodb://127.0.0.1:27017/pantrylist';
  const databaseName =
    process.env.DATABASE_NAME ?? env.DATABASE_NAME ?? 'pantrylist';

  await mongoose.connect(databaseUrl, {
    dbName: databaseName,
  });

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('MongoDB connection is not available');
  }

  const scanSummary = await scanDistinctOwners(db);
  const userIds = new Set<string>(
    (await db.collection('users').distinct('id'))
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const claimsCollection = db.collection<PersistedLegacyAccountClaim>(
    'legacy_account_claims',
  );
  const legacyOwners = Array.from(
    scanSummary.ownersByNormalizedUsername.entries(),
  )
    .filter(([, rawOwner]) => !userIds.has(rawOwner))
    .sort(([left], [right]) => left.localeCompare(right, 'es'))
    .map(([, rawOwner]) => rawOwner);

  let insertedClaims = 0;
  let existingClaims = 0;

  if (!dryRun) {
    for (const legacyOwner of legacyOwners) {
      const now = new Date();
      const result = await claimsCollection.updateOne(
        {
          normalizedLegacyUsername: normalizeLegacyUsername(legacyOwner),
        },
        {
          $setOnInsert: {
            id: randomUUID(),
            legacyUsername: legacyOwner,
            normalizedLegacyUsername: normalizeLegacyUsername(legacyOwner),
            status: 'unclaimed',
            claimedUserId: null,
            createdAt: now,
            updatedAt: now,
            claimedAt: null,
          },
        },
        {
          upsert: true,
        },
      );

      if (result.upsertedCount > 0) {
        insertedClaims += 1;
      } else {
        existingClaims += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        dryRun,
        databaseName,
        scannedCollections: COLLECTIONS,
        distinctOwnerCountsByCollection:
          scanSummary.distinctOwnerCountsByCollection,
        uniqueOwnershipValues: scanSummary.ownersByNormalizedUsername.size,
        blankOwnershipValuesIgnored: scanSummary.blankOwnershipValuesIgnored,
        nonStringOwnershipValuesIgnored:
          scanSummary.nonStringOwnershipValuesIgnored,
        realUserIdsIgnored:
          scanSummary.ownersByNormalizedUsername.size - legacyOwners.length,
        legacyOwnerCount: legacyOwners.length,
        insertedClaims,
        existingClaims,
        legacyOwners: dryRun ? legacyOwners : undefined,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

async function scanDistinctOwners(
  db: mongoose.mongo.Db,
): Promise<OwnerScanSummary> {
  const ownersByNormalizedUsername = new Map<string, string>();
  const distinctOwnerCountsByCollection = {
    products: 0,
    product_types: 0,
    inventory_lots: 0,
  } satisfies Record<CollectionName, number>;
  let blankOwnershipValuesIgnored = 0;
  let nonStringOwnershipValuesIgnored = 0;

  for (const collectionName of COLLECTIONS) {
    const distinctOwners = await db
      .collection(collectionName)
      .distinct('userId');

    distinctOwnerCountsByCollection[collectionName] = distinctOwners.length;

    for (const owner of distinctOwners) {
      if (typeof owner !== 'string') {
        nonStringOwnershipValuesIgnored += 1;
        continue;
      }

      const trimmedOwner = owner.trim();

      if (!trimmedOwner) {
        blankOwnershipValuesIgnored += 1;
        continue;
      }

      ownersByNormalizedUsername.set(
        normalizeLegacyUsername(trimmedOwner),
        trimmedOwner,
      );
    }
  }

  return {
    ownersByNormalizedUsername,
    distinctOwnerCountsByCollection,
    blankOwnershipValuesIgnored,
    nonStringOwnershipValuesIgnored,
  };
}

function loadLocalEnv(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }

  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .reduce<Record<string, string>>((env, line) => {
      const separatorIndex = line.indexOf('=');
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      env[key] = value;
      return env;
    }, {});
}

function normalizeLegacyUsername(value: string): string {
  return value.trim().toLocaleLowerCase('es');
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect errors during shutdown.
  }
  process.exitCode = 1;
});
