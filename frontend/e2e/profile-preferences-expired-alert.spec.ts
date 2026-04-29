import { expect, test } from '@playwright/test';

const effectivePlanningSettings = {
  planningEnabled: true,
  expirationWarningDays: 7,
  depletionWarningThresholdRatio: 1,
  shoppingPlanLeadDays: 3,
  expirationWarningDaysSource: 'profile',
  depletionWarningThresholdRatioSource: 'profile',
  shoppingPlanLeadDaysSource: 'profile',
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        email: 'chef@example.com',
        username: 'chef',
        status: 'active',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-02T00:00:00.000Z',
      }),
    });
  });

  await page.route('**/api/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        email: 'chef@example.com',
        username: 'chef',
        status: 'active',
        connectedIdentityCount: 2,
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-02T00:00:00.000Z',
        preferences: {
          expirationWarningDays: 10,
          showExpiredEntryAlert: true,
          depletionWarningThresholdRatio: 1.5,
          shoppingPlanLeadDays: 5,
          showGuidanceTips: true,
        },
      }),
    });
  });

  await page.route('**/api/profile/preferences', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        expirationWarningDays: 7,
        showExpiredEntryAlert: false,
        depletionWarningThresholdRatio: 1,
        shoppingPlanLeadDays: 3,
        showGuidanceTips: true,
      }),
    });
  });

  await page.route('**/api/pantry/overview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: 'user-1',
        generatedAt: '2026-04-28T12:00:00.000Z',
        preferences: {
          expirationWarningDays: 7,
          showExpiredEntryAlert: true,
          depletionWarningThresholdRatio: 1,
          shoppingPlanLeadDays: 3,
          showGuidanceTips: true,
        },
        items: [
          {
            productTypeId: 'type-tuna',
            baseName: 'Atun',
            category: 'food',
            defaultUnit: 'piezas',
            totalQuantity: 3,
            lotCount: 2,
            nextExpirationAt: '2026-04-20T00:00:00.000Z',
            expiringSoonQuantity: 3,
            hasDepletionRule: false,
            effectivePlanningSettings,
            variants: ['Dolores'],
            lots: [
              {
                lotId: 'lot-expired',
                variantName: 'Dolores',
                quantity: 2,
                unit: 'piezas',
                expiresAt: '2026-04-20T00:00:00.000Z',
                purchaseDate: null,
                expirationStatus: 'expired',
                updatedAt: '2026-04-21T00:00:00.000Z',
              },
              {
                lotId: 'lot-critical',
                quantity: 1,
                unit: 'piezas',
                expiresAt: '2026-04-28T00:00:00.000Z',
                purchaseDate: null,
                expirationStatus: 'critical',
                updatedAt: '2026-04-21T00:00:00.000Z',
              },
            ],
          },
        ],
        expiringItems: [
          {
            productTypeId: 'type-tuna',
            baseName: 'Atun',
            category: 'food',
            totalExpiringQuantity: 3,
            nextExpirationAt: '2026-04-20T00:00:00.000Z',
            lotCount: 2,
            lots: [
              {
                lotId: 'lot-expired',
                variantName: 'Dolores',
                quantity: 2,
                unit: 'piezas',
                expiresAt: '2026-04-20T00:00:00.000Z',
                purchaseDate: null,
                expirationStatus: 'expired',
                updatedAt: '2026-04-21T00:00:00.000Z',
              },
              {
                lotId: 'lot-critical',
                quantity: 1,
                unit: 'piezas',
                expiresAt: '2026-04-28T00:00:00.000Z',
                purchaseDate: null,
                expirationStatus: 'critical',
                updatedAt: '2026-04-21T00:00:00.000Z',
              },
            ],
          },
        ],
        depletingItems: [],
        shoppingPlanItems: [],
      }),
    });
  });
});

test('loads profile preferences and saves an update', async ({ page }) => {
  await page.goto('/profile');

  await expect(page.getByRole('heading', { name: /Preferencias/ })).toBeVisible();
  await expect(page.getByText('chef@example.com')).toBeVisible();

  await page.getByLabel(/Mostrar alerta/).uncheck();
  await page.getByRole('button', { name: 'Guardar preferencias' }).click();

  await expect(page.getByText('Preferencias guardadas.')).toBeVisible();
});

test('shows and dismisses expired entry alert on pantry entry', async ({
  page,
}) => {
  await page.goto('/pantry');

  const alert = page.getByTestId('expired-entry-alert');
  await expect(alert).toContainText('Hay productos que ya caducaron');
  await expect(alert).toContainText('1 lote');
  await expect(page.getByText('Ya caducó: 2 piezas').first()).toBeVisible();
  await expect(page.getByText('Por caducar: 1 pieza').first()).toBeVisible();
  await expect(page.getByText('Ya caducó el 20 Apr 2026')).toBeVisible();
  await expect(page.getByText('Primero caducó el 20 Apr 2026')).toBeVisible();

  await page.getByTestId('dismiss-expired-alert').click();

  await expect(alert).toHaveCount(0);
});

test('shows replenishment guidance, purchase date, per-type settings, and archive flow', async ({
  page,
}) => {
  let savedPlanningSettings = false;
  let archivedLot = false;

  await page.route('**/api/pantry/overview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: 'user-1',
        generatedAt: '2026-04-29T12:00:00.000Z',
        preferences: {
          expirationWarningDays: 7,
          showExpiredEntryAlert: true,
          depletionWarningThresholdRatio: 1,
          shoppingPlanLeadDays: 3,
          showGuidanceTips: true,
        },
        items: [
          {
            productTypeId: 'type-detergent',
            baseName: 'Detergente',
            category: 'cleaning',
            defaultUnit: 'lt',
            totalQuantity: 1,
            lotCount: 1,
            nextExpirationAt: null,
            expiringSoonQuantity: 0,
            hasDepletionRule: true,
            depletionRule: {
              enabled: true,
              consumeAmount: 1,
              unit: 'lt',
              everyAmount: 1,
              everyPeriod: 'month',
              anchorDate: '2026-03-24T00:00:00.000Z',
            },
            effectivePlanningSettings,
            estimatedCurrentQuantity: 0,
            estimatedConsumedQuantity: 1,
            estimatedDepletionAt: '2026-04-24T00:00:00.000Z',
            variants: ['Botella grande'],
            lots: [
              {
                lotId: 'lot-detergent',
                variantName: 'Botella grande',
                quantity: 1,
                unit: 'lt',
                expiresAt: null,
                purchaseDate: '2026-03-24T00:00:00.000Z',
                expirationStatus: 'none',
                updatedAt: '2026-04-29T00:00:00.000Z',
              },
            ],
          },
        ],
        expiringItems: [],
        depletingItems: [
          {
            productTypeId: 'type-detergent',
            baseName: 'Detergente',
            category: 'cleaning',
            defaultUnit: 'lt',
            totalQuantity: 1,
            estimatedCurrentQuantity: 0,
            estimatedConsumedQuantity: 1,
            estimatedDepletionAt: '2026-04-24T00:00:00.000Z',
            depletionRule: {
              enabled: true,
              consumeAmount: 1,
              unit: 'lt',
              everyAmount: 1,
              everyPeriod: 'month',
              anchorDate: '2026-03-24T00:00:00.000Z',
            },
            effectivePlanningSettings,
          },
        ],
        shoppingPlanItems: [
          {
            productTypeId: 'type-detergent',
            baseName: 'Detergente',
            category: 'cleaning',
            defaultUnit: 'lt',
            totalQuantity: 1,
            estimatedCurrentQuantity: 0,
            estimatedConsumedQuantity: 1,
            estimatedDepletionAt: '2026-04-24T00:00:00.000Z',
            recommendedPurchaseAt: '2026-04-24T00:00:00.000Z',
            suggestedPurchaseQuantity: 1,
            urgency: 'depleted',
            depletionRule: {
              enabled: true,
              consumeAmount: 1,
              unit: 'lt',
              everyAmount: 1,
              everyPeriod: 'month',
              anchorDate: '2026-03-24T00:00:00.000Z',
            },
            effectivePlanningSettings,
          },
        ],
      }),
    });
  });

  await page.route(
    '**/api/product-types/type-detergent/planning-settings',
    async (route) => {
      savedPlanningSettings = true;
      expect(route.request().method()).toBe('PATCH');
      expect(route.request().postDataJSON()).toMatchObject({
        planningEnabled: true,
        shoppingPlanLeadDaysOverride: 5,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'type-detergent',
          userId: 'user-1',
          baseName: 'Detergente',
          category: 'cleaning',
          defaultUnit: 'lt',
          planningSettings: {
            planningEnabled: true,
            shoppingPlanLeadDaysOverride: 5,
          },
          archivedAt: null,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-29T00:00:00.000Z',
        }),
      });
    },
  );

  await page.route('**/api/inventory-lots/lot-detergent/archive', async (route) => {
    archivedLot = true;
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'lot-detergent',
        userId: 'user-1',
        productTypeId: 'type-detergent',
        variantName: 'Botella grande',
        quantity: 1,
        unit: 'lt',
        expiresAt: null,
        purchaseDate: '2026-03-24T00:00:00.000Z',
        archivedAt: '2026-04-29T00:00:00.000Z',
        expirationStatus: 'none',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-29T00:00:00.000Z',
      }),
    });
  });

  await page.route('**/api/pantry/archived', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        productTypes: [],
        inventoryLots: [],
      }),
    });
  });

  await page.goto('/pantry');

  const guidance = page.getByTestId('pantry-guidance-card');
  await expect(guidance).toContainText('Ayuda para usar PantryList');
  await guidance.getByRole('button', { name: 'Ocultar por ahora' }).click();
  await expect(guidance).toHaveCount(0);

  await expect(page.getByText('Comprar ya')).toBeVisible();
  await expect(page.getByText('Queda estimado').first()).toBeVisible();

  await page.getByRole('button', { name: /Detergente/ }).click();
  await expect(page.getByText('Comprado el 24 Mar 2026')).toBeVisible();
  await expect(page.getByText('Ajustes de Detergente')).toBeVisible();

  await page.getByRole('button', { name: 'Ajustar compras y alertas' }).click();
  await page.getByLabel(/D.as antes para comprar/).fill('5');
  await page.getByRole('button', { name: 'Guardar ajustes' }).click();
  expect(savedPlanningSettings).toBe(true);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Archivar "Botella grande"');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Archivar lote' }).click();
  expect(archivedLot).toBe(true);

  await page.getByRole('button', { name: 'Ver archivados' }).click();
  await expect(page.getByText('No hay elementos archivados.')).toBeVisible();
});
