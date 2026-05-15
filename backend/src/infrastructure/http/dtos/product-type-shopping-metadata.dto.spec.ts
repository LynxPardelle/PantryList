import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProductTypeShoppingMetadataDto } from './product-type-shopping-metadata.dto';

describe('ProductTypeShoppingMetadataDto', () => {
  it('rejects null optional fields instead of passing them to the domain layer', async () => {
    const dto = plainToInstance(
      ProductTypeShoppingMetadataDto,
      {
        storageLocation: null,
        shoppingLocation: null,
        preferredBrand: null,
        substituteBrand: null,
        shoppingNotes: null,
        estimatedUnitPrice: null,
        buyOnlyOnPromo: null,
      },
      { enableImplicitConversion: true },
    );

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.map((error) => error.property).sort()).toEqual([
      'buyOnlyOnPromo',
      'estimatedUnitPrice',
      'preferredBrand',
      'shoppingLocation',
      'shoppingNotes',
      'storageLocation',
      'substituteBrand',
    ]);
  });
});
