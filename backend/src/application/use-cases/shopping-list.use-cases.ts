import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MAX_SAVED_SHOPPING_LISTS_PER_USER } from '../constants/query-limits';
import { SHOPPING_LIST_REPOSITORY } from '../tokens';
import {
  ShoppingList,
  ShoppingListItemPrimitives,
} from '../../domain/entities/shopping-list.entity';
import { ShoppingListRepository } from '../../domain/repositories/shopping-list.repository';

@Injectable()
export class CreateShoppingListUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: ShoppingListRepository,
  ) {}

  async execute(command: {
    ownerUserId: string;
    title: string;
    occasion?: string;
    shoppingLocation?: string;
    items: ShoppingListItemPrimitives[];
  }): Promise<ShoppingList> {
    const existingLists = await this.shoppingListRepository.listByOwnerUserId(
      command.ownerUserId,
    );

    if (existingLists.length >= MAX_SAVED_SHOPPING_LISTS_PER_USER) {
      throw new BadRequestException(
        `Saved shopping lists cannot exceed ${MAX_SAVED_SHOPPING_LISTS_PER_USER}`,
      );
    }

    const list = ShoppingList.create(command);

    return this.shoppingListRepository.save(list);
  }
}

@Injectable()
export class ListShoppingListsUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: ShoppingListRepository,
  ) {}

  async execute(ownerUserId: string): Promise<ShoppingList[]> {
    return this.shoppingListRepository.listByOwnerUserId(ownerUserId);
  }
}

@Injectable()
export class DeleteShoppingListUseCase {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: ShoppingListRepository,
  ) {}

  async execute(command: {
    ownerUserId: string;
    listId: string;
  }): Promise<ShoppingList> {
    const list = await this.shoppingListRepository.findById(command.listId);

    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    try {
      list.assertOwnedBy(command.ownerUserId);
    } catch {
      throw new ForbiddenException(
        'Shopping list is not owned by current user',
      );
    }

    await this.shoppingListRepository.delete(command.listId);

    return list;
  }
}
