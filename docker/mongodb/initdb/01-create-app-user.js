const dbName = process.env.MONGO_APP_DATABASE || 'despensalista';
const appUsername = process.env.MONGO_APP_USERNAME || 'despensalista_app';
const appPassword = process.env.MONGO_APP_PASSWORD;

if (!appPassword) {
  throw new Error('MONGO_APP_PASSWORD is required to initialize MongoDB');
}

const appDatabase = db.getSiblingDB(dbName);

appDatabase.createUser({
  user: appUsername,
  pwd: appPassword,
  roles: [
    {
      role: 'readWrite',
      db: dbName,
    },
  ],
});

appDatabase.createCollection('products');
