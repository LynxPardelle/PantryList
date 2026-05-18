import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MAX_SHOPPING_CHECKOUT_ITEMS } from '../constants/query-limits';
import {
  ProductType,
  ProductTypeShoppingMetadataPatch,
} from '../../domain/entities/product-type.entity';
import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { ProductTypeId } from '../../domain/value-objects/product-type-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { INVENTORY_LOT_REPOSITORY, PRODUCT_TYPE_REPOSITORY } from '../tokens';
import { parseQuantityUnit } from '../utils/enum-parsers';

export interface CloseShoppingPurchaseItemCommand {
  productTypeId: string;
  variantName?: string;
  quantity: number;
  unit: string;
  paidUnitPrice?: number;
  shoppingLocation?: string;
  expiresAt?: Date;
}

export interface CloseShoppingPurchaseCommand {
  userId: string;
  items: CloseShoppingPurchaseItemCommand[];
}

interface PreparedPurchaseItem {
  command: CloseShoppingPurchaseItemCommand;
  productType: ProductType;
  unit: ReturnType<typeof parseQuantityUnit>;
}

@Injectable()
export class CloseShoppingPurchaseUseCase {
  constructor(
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
  ) {}

  async execute(
    command: CloseShoppingPurchaseCommand,
  ): Promise<InventoryLot[]> {
    if (command.items.length === 0) {
      throw new BadRequestException('Checkout must include at least one item');
    }

    if (command.items.length > MAX_SHOPPING_CHECKOUT_ITEMS) {
      throw new BadRequestException(
        `Checkout cannot include more than ${MAX_SHOPPING_CHECKOUT_ITEMS} items`,
      );
    }

    const userId = UserId.fromString(command.userId);
    const preparedItems = await Promise.all(
      command.items.map((item) => this.prepareItem(userId, item)),
    );
    const purchaseDate = new Date();
    const createdLots: InventoryLot[] = [];

    for (const prepared of preparedItems) {
      const createdLot = await this.createLot(userId, prepared, purchaseDate);
      createdLots.push(createdLot);
    }

    return createdLots;
  }

  private async prepareItem(
    userId: UserId,
    item: CloseShoppingPurchaseItemCommand,
  ): Promise<PreparedPurchaseItem> {
    const productType = await this.productTypeRepository.findById(
      ProductTypeId.fromString(item.productTypeId),
    );

    if (!productType || productType.userId.toString() !== userId.toString()) {
      throw new NotFoundException('Product type not found for this user');
    }

    if (productType.isArchived()) {
      throw new BadRequestException(
        'Archived product types cannot be checked out',
      );
    }

    const unit = parseQuantityUnit(item.unit);

    if (productType.defaultUnit !== unit) {
      throw new BadRequestException(
        `Lot unit must match product type default unit (${productType.defaultUnit})`,
      );
    }

    return { command: item, productType, unit };
  }

  private async createLot(
    userId: UserId,
    prepared: PreparedPurchaseItem,
    purchaseDate: Date,
  ): Promise<InventoryLot> {
    const lot = InventoryLot.create(
      userId,
      prepared.productType.id,
      prepared.command.variantName,
      prepared.command.quantity,
      prepared.unit,
      prepared.command.expiresAt,
      purchaseDate,
    );
    const createdLot = await this.inventoryLotRepository.save(lot);
    const shoppingMetadata = this.toShoppingMetadataPatch(prepared.command);

    if (shoppingMetadata) {
      prepared.productType.updateShoppingMetadata(shoppingMetadata);
      await this.productTypeRepository.save(prepared.productType);
    }

    return createdLot;
  }

  private toShoppingMetadataPatch(
    item: CloseShoppingPurchaseItemCommand,
  ): ProductTypeShoppingMetadataPatch | null {
    const patch: ProductTypeShoppingMetadataPatch = {};

    if (item.paidUnitPrice !== undefined) {
      patch.estimatedUnitPrice = item.paidUnitPrice;
    }

    if (item.shoppingLocation !== undefined) {
      patch.shoppingLocation = item.shoppingLocation;
    }

    return Object.keys(patch).length > 0 ? patch : null;
  }
}
