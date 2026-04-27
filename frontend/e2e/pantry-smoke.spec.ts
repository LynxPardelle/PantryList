import { expect, test } from '@playwright/test';

test('registers a pantry account and manages a durable lot end to end', async ({
  page,
}) => {
  const stamp = Date.now();
  const today = toDateInputValue(new Date());
  const later = toDateInputValue(addDays(new Date(), 45));
  const account = {
    email: `e2e-${stamp}@pantrylist.local`,
    username: `e2e${stamp}`,
    password: `PantryList-${stamp}!`,
  };
  const typeName = `Detergente e2e ${stamp}`;
  const variantName = `Botella automatizada ${stamp}`;

  await page.goto('/register');

  await page.getByLabel('Correo').fill(account.email);
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL(/\/pantry/);
  await expect(page.getByText(account.username)).toBeVisible();
  await expect(page.locator('#lotUnitPreview')).toHaveValue(
    'Selecciona un tipo base',
  );

  const lotForm = page.locator('form.lot-form');
  await page.getByRole('button', { name: 'Crear tipo nuevo' }).click();
  await lotForm.getByLabel('Nuevo tipo base').fill(typeName);
  await lotForm.getByLabel('Categoría').selectOption('cleaning');
  await lotForm.getByLabel('Unidad canónica').selectOption('lt');
  await lotForm.getByLabel('Variante o marca').fill(variantName);
  await lotForm.getByLabel('Cantidad del lote').fill('3');
  await lotForm.getByLabel('Caducidad', { exact: true }).fill(later);
  await lotForm.getByLabel('Fecha de compra').fill(today);

  await page
    .getByLabel('Calcular consumo estimado para este tipo')
    .check();
  const creationRule = page.locator('fieldset.durability-box');
  await creationRule.getByLabel('Se usa').fill('1');
  await creationRule.getByLabel('Cada').fill('1');
  await creationRule.getByLabel('Periodo').selectOption('month');
  await creationRule.getByLabel('Contar desde').fill(today);

  await page.getByRole('button', { name: 'Registrar lote' }).click();

  const groupCard = page.locator('.group-card', { hasText: typeName });
  await expect(groupCard).toBeVisible();
  await expect(groupCard.getByText(variantName)).toBeVisible();

  await groupCard.locator('.group-summary').click();
  const lotRow = groupCard.locator('.lot-row', { hasText: variantName });
  await lotRow.getByLabel('Consumir de este lote').fill('1');
  await lotRow.getByRole('button', { name: 'Consumir' }).click();
  await expect(lotRow.getByText('2 lt')).toBeVisible();

  await groupCard.getByRole('button', { name: 'Editar durabilidad' }).click();
  const editor = groupCard.locator('form.depletion-editor');
  await expect(editor).toBeVisible();
  await editor.getByLabel('Se usa').fill('1');
  await editor.getByLabel('Cada').fill('1');
  await editor.getByLabel('Periodo').selectOption('week');
  await editor.getByLabel('Contar desde').fill(today);
  await editor.getByRole('button', { name: 'Guardar durabilidad' }).click();

  await expect(groupCard.getByText('Usa 1 lt cada 1 semanas.')).toBeVisible();
  await expect(
    page
      .locator('.shopping-plan-row', { hasText: typeName })
      .getByText(/Sugerido: comprar 1 lt/),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Correo').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Entrar a mi despensa' }).click();

  await expect(page).toHaveURL(/\/pantry/);
  await expect(page.locator('.group-card', { hasText: typeName })).toBeVisible();
  await expect(page.getByText(variantName)).toBeVisible();
  await expect(page.getByText('2 lt').first()).toBeVisible();
});

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
