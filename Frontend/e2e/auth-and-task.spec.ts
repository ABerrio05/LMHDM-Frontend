import { expect, test } from '@playwright/test';

test('a user can register, log in and create a task', async ({ page }) => {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const email = `e2e-${unique}@nexo.test`;
  const password = 'NexoE2E123';

  await page.goto('/register');
  await page.locator('#name').fill('Usuario E2E');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  const registerResponse = page.waitForResponse(
    (response) => response.url().includes('/api/auth/register') && response.request().method() === 'POST',
    { timeout: 120_000 },
  );
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect((await registerResponse).status()).toBe(201);

  // BCrypt se ejecuta en el backend y puede tardar varios segundos en equipos
  // con recursos limitados; el flujo real debe esperar esa respuesta.
  await expect(page).toHaveURL(/\/tasks$/, { timeout: 120_000 });
  await expect(page.getByRole('heading', { name: 'No tienes tareas' })).toBeVisible({
    timeout: 120_000,
  });

  await page.getByRole('button', { name: /Crear primera tarea/ }).click();
  await page.locator('#create-title').fill('Tarea creada por E2E');
  await page.locator('#create-description').fill('Flujo completo de NEXO');
  await page.getByRole('button', { name: 'Crear tarea', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Tarea creada por E2E' })).toBeVisible();
});
