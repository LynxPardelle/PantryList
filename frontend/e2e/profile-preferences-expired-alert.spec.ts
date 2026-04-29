import { expect, test } from '@playwright/test';

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
            variants: ['Dolores'],
            lots: [
              {
                lotId: 'lot-expired',
                variantName: 'Dolores',
                quantity: 2,
                unit: 'piezas',
                expiresAt: '2026-04-20T00:00:00.000Z',
                expirationStatus: 'expired',
                updatedAt: '2026-04-21T00:00:00.000Z',
              },
              {
                lotId: 'lot-critical',
                quantity: 1,
                unit: 'piezas',
                expiresAt: '2026-04-28T00:00:00.000Z',
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
                expirationStatus: 'expired',
                updatedAt: '2026-04-21T00:00:00.000Z',
              },
              {
                lotId: 'lot-critical',
                quantity: 1,
                unit: 'piezas',
                expiresAt: '2026-04-28T00:00:00.000Z',
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
