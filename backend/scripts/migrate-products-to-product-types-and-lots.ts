import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';

type LegacyProduct = {
  id: string;
  userId: string;
  title: string;
  currentQuantity: number;
  unit: string;
  category: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type MigratedProductTypeDocument = {
  id: string;
  userId: string;
  baseName: string;
  normalizedBaseName: string;
  category: string;
  defaultUnit: string;
  createdAt: Date;
  updatedAt: Date;
};

type MigratedInventoryLotDocument = {
  id: string;
  userId: string;
  productTypeId: string;
  legacyProductId: string;
  variantName?: string;
  quantity: number;
  unit: string;
  expiresAt: null;
  purchaseDate: null;
  createdAt: Date;
  updatedAt: Date;
};

async function main(): Promise<void> {
  const env = loadLocalEnv(join(__dirname, '..', '.env'));
  const databaseUrl = process.env.DATABASE_URL ?? env.DATABASE_URL ?? 'mongodb://127.0.0.1:27017/pantrylist';
  const databaseName = process.env.DATABASE_NAME ?? env.DATABASE_NAME ?? 'pantrylist';

  await mongoose.connect(databaseUrl, {
    dbName: databaseName,
  });

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('MongoDB connection is not available');
  }

  const legacyProducts = await db.collection<LegacyProduct>('products').find({}).toArray();
  const productTypesCollection =
    db.collection<MigratedProductTypeDocument>('product_types');
  const inventoryLotsCollection =
    db.collection<MigratedInventoryLotDocument>('inventory_lots');

  let createdProductTypes = 0;
  let createdInventoryLots = 0;
  let skippedInventoryLots = 0;

  for (const legacyProduct of legacyProducts) {
    const normalizedBaseName = normalizeBaseName(legacyProduct.title);
    const createdAt = new Date(legacyProduct.createdAt);
    const updatedAt = new Date(legacyProduct.updatedAt);

    const existingProductType = await productTypesCollection.findOne({
      userId: legacyProduct.userId,
      normalizedBaseName,
      category: legacyProduct.category,
      defaultUnit: legacyProduct.unit,
    });

    const productTypeId = existingProductType?.id ?? randomUUID();

    if (!existingProductType) {
      const productType: MigratedProductTypeDocument = {
        id: randomUUID(),
        userId: legacyProduct.userId,
        baseName: legacyProduct.title.trim(),
        normalizedBaseName,
        category: legacyProduct.category,
        defaultUnit: legacyProduct.unit,
        createdAt,
        updatedAt,
      };

      productType.id = productTypeId;

      await productTypesCollection.insertOne(productType as any);
      createdProductTypes += 1;
    }

    const existingLot = await inventoryLotsCollection.findOne({
      legacyProductId: legacyProduct.id,
    });

    if (existingLot) {
      skippedInventoryLots += 1;
      continue;
    }

    await inventoryLotsCollection.insertOne({
      id: randomUUID(),
      userId: legacyProduct.userId,
      productTypeId,
      legacyProductId: legacyProduct.id,
      variantName: undefined,
      quantity: Number(legacyProduct.currentQuantity),
      unit: legacyProduct.unit,
      expiresAt: null,
      purchaseDate: null,
      createdAt,
      updatedAt,
    } as any);

    createdInventoryLots += 1;
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        legacyProductCount: legacyProducts.length,
        createdProductTypes,
        createdInventoryLots,
        skippedInventoryLots,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
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

function normalizeBaseName(value: string): string {
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
