import { expect, test } from '@playwright/test';

test('a user can register, create a task and save a personal note', async ({ page }) => {
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

  const noteResponse = page.waitForResponse(
    (response) => response.url().includes('/api/notes') && response.request().method() === 'POST',
    { timeout: 120_000 },
  );
  await page.getByRole('link', { name: 'Notas' }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole('heading', { name: 'Mis notas' })).toBeVisible();
  await page.getByLabel('Título').fill('Nota creada por E2E');
  await page.getByLabel('Contenido').fill('Persistencia verificada desde el navegador.');
  await page.getByRole('button', { name: 'Guardar nota' }).click();
  await expect((await noteResponse).status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'Nota creada por E2E' })).toBeVisible({ timeout: 30_000 });

  const spacesResponse = page.waitForResponse(
    (response) => response.url().includes('/api/spaces') && response.request().method() === 'GET',
    { timeout: 30_000 },
  );
  await page.getByRole('link', { name: 'Espacios' }).click();
  await expect(page).toHaveURL(/\/spaces$/);
  await expect((await spacesResponse).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Espacios colaborativos' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Nombre' }).fill('Espacio creado por E2E');
  await page.getByRole('textbox', { name: 'Descripción' }).fill('Carga de espacios verificada desde el navegador.');
  const createSpaceResponse = page.waitForResponse(
    (response) => response.url().includes('/api/spaces') && response.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'Crear espacio' }).click();
  await expect((await createSpaceResponse).status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'Espacio creado por E2E' })).toBeVisible({ timeout: 30_000 });

  const holidaysResponse = page.waitForResponse(
    (response) => response.url().includes('/api/calendar/holidays/colombia') && response.request().method() === 'GET',
    { timeout: 30_000 },
  );
  await page.getByRole('link', { name: 'Planificación' }).click();
  await expect(page).toHaveURL(/\/planning$/);
  await expect((await holidaysResponse).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Próximos festivos de Colombia' })).toBeVisible();
  await expect(page.locator('.holiday-grid article').first()).toBeVisible({ timeout: 30_000 });
});
