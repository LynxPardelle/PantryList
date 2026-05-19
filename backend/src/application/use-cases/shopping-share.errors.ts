export class ShoppingShareNotFoundError extends Error {
  constructor() {
    super('Shopping share not found');
  }
}

export class ShoppingShareExpiredError extends Error {
  constructor() {
    super('Shopping share expired');
  }
}

export class ShoppingShareRevokedError extends Error {
  constructor() {
    super('Shopping share revoked');
  }
}
