import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'https://adminhelpdesk.si-wareapps.com';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[console.error] ${msg.text()}`);
    }
    if (msg.type() === 'log' || msg.type() === 'warn') {
      const t = msg.text();
      if (t.toLowerCase().includes('error') || t.toLowerCase().includes('fail') || t.toLowerCase().includes('zod') || t.toLowerCase().includes('invalid')) {
        consoleErrors.push(`[console.${msg.type()}] ${t}`);
      }
    }
  });

  page.on('response', resp => {
    if (!resp.ok() && resp.status() >= 400) {
      networkErrors.push(`${resp.status()} ${resp.request().method()} ${resp.url()}`);
    }
  });

  console.log('--- Step 1: Navigate to home ---');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Current URL after goto:', page.url());

  // Check if we're redirected to login
  if (page.url().includes('/login')) {
    console.log('--- Step 2: Login required. Logging in... ---');
    await page.screenshot({ path: 'test-login-before.png' });

    // Inspect what input fields exist
    const allInputs = page.locator('input');
    const inputCount = await allInputs.count();
    console.log('Input count on login page:', inputCount);
    for (let i = 0; i < inputCount; i++) {
      const inp = allInputs.nth(i);
      const type = await inp.getAttribute('type');
      const name = await inp.getAttribute('name');
      const id = await inp.getAttribute('id');
      const placeholder = await inp.getAttribute('placeholder');
      console.log(`  Input ${i}: type="${type}" name="${name}" id="${id}" placeholder="${placeholder}"`);
    }

    await page.fill('input[type="email"]', 'marwaanelafifi@gmail.com');
    await page.fill('input[type="password"]', 'TestPass123');

    // Take screenshot before clicking
    await page.screenshot({ path: 'test-login.png' });

    const submitBtnLogin = page.locator('button[type="submit"]').first();
    console.log('Submit button text:', await submitBtnLogin.textContent());
    await submitBtnLogin.click();

    // Wait for navigation
    try {
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    } catch (e) {
      console.log('waitForURL timed out');
    }
    console.log('URL after login attempt:', page.url());

    if (page.url().includes('/login')) {
      console.log('LOGIN FAILED. Trying to read error messages...');
      await page.screenshot({ path: 'test-login-failed.png' });
      // look for error text
      const errors = await page.locator('[class*="error"], [class*="red"], .text-red-500').allTextContents();
      console.log('Login error messages:', errors);
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Login page text:', bodyText.slice(0, 1000));
      await browser.close();
      return;
    }
  }

  console.log('--- Step 3: Navigate to shipping/sending/new ---');
  await page.goto(`${BASE}/shipping/sending/new`, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('URL:', page.url());
  await page.screenshot({ path: 'test-form-loaded.png' });

  // Read what dropdowns are available
  console.log('--- Step 4: Inspect available dropdown options ---');

  // Fill title
  console.log('Filling title...');
  const titleInput = page.locator('input#title, input[id="title"]').first();
  await titleInput.fill('Test Shipping');

  // Fill PO Number
  console.log('Filling PO Number...');
  const poInput = page.locator('input#poNumber, input[id="poNumber"]').first();
  await poInput.fill('PO-12345');

  // Fill Description
  console.log('Filling description...');
  const descArea = page.locator('textarea#description, textarea[id="description"]').first();
  await descArea.fill('Test shipment description');

  // Fill Expected Delivery Date
  console.log('Filling delivery date...');
  const deliveryInput = page.locator('input#expectedDeliveryDate, input[id="expectedDeliveryDate"]').first();
  await deliveryInput.fill('2026-12-01');

  // Try to select Supplier using SearchableSelect
  console.log('--- Selecting Supplier ---');
  // Find the supplier searchable select button
  const supplierBtns = page.locator('button').filter({ hasText: /supplier/i });
  const supplierCount = await supplierBtns.count();
  console.log('Supplier buttons found:', supplierCount);

  // Click the supplier dropdown trigger (first SearchableSelect in procurement card)
  // The SearchableSelect renders a button with a placeholder
  const procurementCard = page.locator('text=Procurement').locator('..');
  const allButtons = page.locator('button[aria-haspopup], button').filter({ hasText: /Select supplier|Select cost center|Select carrier|Select direct manager/i });
  const btnCount = await allButtons.count();
  console.log('SearchableSelect buttons found:', btnCount);

  for (let i = 0; i < btnCount; i++) {
    const txt = await allButtons.nth(i).textContent();
    console.log(`  Button ${i}: "${txt?.trim()}"`);
  }

  // Click supplier select
  const supplierSelectBtn = page.locator('button').filter({ hasText: /Select supplier/i }).first();
  const supBtnCount = await supplierSelectBtn.count();
  console.log('Supplier select button count:', supBtnCount);

  if (supBtnCount > 0) {
    await supplierSelectBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-supplier-dropdown.png' });

    // List all options
    const options = page.locator('[role="option"], li, [data-value]').filter({ hasText: /.+/ });
    const optCount = await options.count();
    console.log('Supplier options:', optCount);
    for (let i = 0; i < Math.min(5, optCount); i++) {
      console.log(`  Option ${i}: "${await options.nth(i).textContent()}"`);
    }

    if (optCount > 0) {
      await options.first().click();
      await page.waitForTimeout(300);
    } else {
      // Press Escape to close
      await page.keyboard.press('Escape');
      console.log('No supplier options available in dropdown');
    }
  }

  // Similarly for Cost Center
  const costCenterBtn = page.locator('button').filter({ hasText: /Select cost center/i }).first();
  if (await costCenterBtn.count() > 0) {
    await costCenterBtn.click();
    await page.waitForTimeout(500);
    const ccOptions = page.locator('[role="option"], li').filter({ hasText: /.+/ });
    const ccCount = await ccOptions.count();
    console.log('Cost center options:', ccCount);
    for (let i = 0; i < Math.min(3, ccCount); i++) {
      console.log(`  CC Option ${i}: "${await ccOptions.nth(i).textContent()}"`);
    }
    if (ccCount > 0) {
      await ccOptions.first().click();
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press('Escape');
      console.log('No cost center options');
    }
  }

  // Direct Manager
  const managerBtn = page.locator('button').filter({ hasText: /Select direct manager/i }).first();
  if (await managerBtn.count() > 0) {
    await managerBtn.click();
    await page.waitForTimeout(500);
    const mgrOptions = page.locator('[role="option"], li').filter({ hasText: /.+/ });
    const mgrCount = await mgrOptions.count();
    console.log('Manager options:', mgrCount);
    for (let i = 0; i < Math.min(3, mgrCount); i++) {
      console.log(`  Mgr Option ${i}: "${await mgrOptions.nth(i).textContent()}"`);
    }
    if (mgrCount > 0) {
      await mgrOptions.first().click();
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press('Escape');
      console.log('No manager options');
    }
  }

  // Carrier
  const carrierBtn = page.locator('button').filter({ hasText: /Select carrier/i }).first();
  if (await carrierBtn.count() > 0) {
    await carrierBtn.click();
    await page.waitForTimeout(500);
    const cOptions = page.locator('[role="option"], li').filter({ hasText: /.+/ });
    const cCount = await cOptions.count();
    console.log('Carrier options:', cCount);
    for (let i = 0; i < Math.min(5, cCount); i++) {
      console.log(`  Carrier Option ${i}: "${await cOptions.nth(i).textContent()}"`);
    }
    if (cCount > 0) {
      await cOptions.first().click();
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press('Escape');
      console.log('No carrier options');
    }
  }

  await page.screenshot({ path: 'test-form-filled-no-invoice.png' });

  // Clear errors array before first submit attempt
  const errsBefore = [...consoleErrors];
  const netBefore = [...networkErrors];

  console.log('--- Step 5: Submit WITHOUT Commercial Invoice ---');
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-after-submit-no-invoice.png' });

  // Check for error messages on the page
  const errorMessages = await page.locator('.text-red-500, .text-red-700, [class*="error"]').allTextContents();
  console.log('Error messages on page after submit without invoice:', errorMessages.filter(t => t.trim()));

  // Check title field error (where the catch block puts the error)
  const titleError = await page.locator('p:has-text("Failed to create")').textContent().catch(() => null);
  console.log('Title field error text:', titleError);

  // Check for invoice error
  const invoiceError = await page.locator('p:has-text("Commercial Invoice"), p:has-text("invoice")').textContent().catch(() => null);
  console.log('Invoice error text:', invoiceError);

  const newConsoleErrors = consoleErrors.slice(errsBefore.length);
  const newNetErrors = networkErrors.slice(netBefore.length);
  console.log('New console errors:', newConsoleErrors);
  console.log('New network errors:', newNetErrors);

  // --- Now try with a Commercial Invoice attached ---
  console.log('--- Step 6: Attach a test file as Commercial Invoice ---');

  // Find the invoice file input
  // The FileUploadZone for "invoice" category has a hidden file input inside a label
  // We need to find it by the section context
  const invoiceSection = page.locator('label:has-text("Commercial Invoice")').locator('..').locator('input[type="file"]');
  const invoiceSectionCount = await invoiceSection.count();
  console.log('Invoice file inputs found:', invoiceSectionCount);

  if (invoiceSectionCount > 0) {
    // Create a tiny test file
    const testFilePath = 'C:\\Windows\\Temp\\test-invoice.txt';
    writeFileSync(testFilePath, 'This is a test commercial invoice file for testing purposes.', 'utf-8');

    await invoiceSection.first().setInputFiles(testFilePath);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-form-with-invoice.png' });

    const afterAttach = await page.locator('.text-xs.font-medium').allTextContents();
    console.log('File badges after attach:', afterAttach.filter(t => t.trim()));
  }

  const errsBeforeSecond = [...consoleErrors];
  const netBeforeSecond = [...networkErrors];

  console.log('--- Step 7: Submit WITH Commercial Invoice ---');
  await submitBtn.click();
  await page.waitForTimeout(3000);
  console.log('URL after submit with invoice:', page.url());
  await page.screenshot({ path: 'test-after-submit-with-invoice.png' });

  // Check if redirected (success) or still on form (error)
  if (page.url().includes('/shipping/sending/new')) {
    console.log('STILL ON FORM - submit failed');
    const errMsgs2 = await page.locator('.text-red-500, .text-red-700, [class*="error"]').allTextContents();
    console.log('Error messages after second submit:', errMsgs2.filter(t => t.trim()));

    const failedMsg = await page.locator('p:has-text("Failed to create"), p:has-text("Failed to update")').textContent().catch(() => null);
    console.log('Failed message:', failedMsg);
  } else {
    console.log('REDIRECTED - submit likely succeeded! New URL:', page.url());
  }

  const newConsoleErrors2 = consoleErrors.slice(errsBeforeSecond.length);
  const newNetErrors2 = networkErrors.slice(netBeforeSecond.length);
  console.log('Console errors after second submit:', newConsoleErrors2);
  console.log('Network errors after second submit:', newNetErrors2);

  console.log('\n=== SUMMARY ===');
  console.log('All console errors collected:', consoleErrors);
  console.log('All network errors collected:', networkErrors);

  await browser.close();
}

run().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
