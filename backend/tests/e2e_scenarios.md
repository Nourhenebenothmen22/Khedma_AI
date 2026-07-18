# Playwright End-to-End E2E Testing Scenarios

This document specifies the Playwright E2E automation script scenarios to test the entire job description setup, streaming interface, and PDF generation.

---

## 1. Test Setup Prerequisites

- Playwright is installed via: `npm i -D @playwright/test`
- Both backend and frontend servers are active:
  - Backend: `http://localhost:5000`
  - Frontend: `http://localhost:5173`

---

## 2. Playwright E2E Test Suite Script

Create this test file at `frontend/tests/recruiterFlow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Khedma AI Recruiter Happy Path E2E Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Visit main dashboard
    await page.goto('http://localhost:5173');
  });

  test('should allow a recruiter to configure settings, stream generation, edit sections, and save/export', async ({ page }) => {
    
    // --- STEP 1: CONFIGURE LLM SETTINGS ---
    await page.click('button:has-text("Settings")');
    await expect(page).toHaveURL(/.*settings/ || /.*/); // Depends on tabs or routes
    
    // Select OpenRouter and llama-3.1-8b
    await page.selectOption('select:has-label("AI Inference Provider")', 'openrouter');
    await page.selectOption('select:has-label("Active Generation Model")', 'llama-3.1-8b');
    
    // Select English language target
    await page.click('button:has-text("English")');
    
    // Click Save Config and expect alert/toast success
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('success');
      await dialog.accept();
    });
    await page.click('button:has-text("Save Configuration")');

    // --- STEP 2: SETUP GENERATOR INPUTS ---
    await page.click('button:has-text("Generator")');
    await page.fill('textarea[placeholder*="Job description details"]', 'Senior Data Engineer specialized in AWS and Python');
    
    await page.selectOption('select:has-label("Seniority")', 'Senior');
    await page.fill('input[placeholder="e.g. Remote, Paris"]', 'Paris, France');
    await page.selectOption('select:has-label("Work Type")', 'Hybrid');
    
    // --- STEP 3: STREAM AI GENERATION ---
    await page.click('button:has-text("Generate")');
    
    // Verify loading shimmer / text state
    await expect(page.locator('button:has-text("Generating")')).toBeVisible();

    // Verify sections streaming progressively in dynamic cards
    const titleCard = page.locator('h4:has-text("Title")');
    await expect(titleCard).toBeVisible({ timeout: 15000 }); // Wait for stream start
    
    // Wait for completion (generating button reverts back)
    await expect(page.locator('button:has-text("Generate")')).toBeVisible({ timeout: 30000 });

    // --- STEP 4: EDIT GENERATED CARD CONTENT ---
    const editBtn = page.locator('button:has-text("Edit")').first();
    await editBtn.click();
    
    // Modify text content inside editor textarea
    await page.fill('textarea', 'Updated Custom Job Title for Senior AWS Engineer');
    await page.click('button:has-text("Save")');

    // Verify change is rendered on the dynamic card canvas
    await expect(page.locator('p:has-text("Updated Custom Job Title")')).toBeVisible();

    // --- STEP 5: INTERACTIVE SECTION REFINEMENTS ---
    await page.hover('h4:has-text("Responsibilities")');
    await page.click('button:has-text("Refine")');
    await page.click('button:has-text("Shorten")');
    
    // Wait for refining overlay shimmer to complete
    await expect(page.locator('text=Refining content...')).toBeHidden({ timeout: 10000 });

    // --- STEP 6: VERIFY SAVE INTEGRITY & PDF EXPORT ---
    // Copy all content to clipboard
    await page.click('button:has-text("Copy All")');
    
    // Verify favorite toggle updates states
    const favoriteBtn = page.locator('button:has-text("Favorite")');
    await favoriteBtn.click();
    await expect(favoriteBtn).toHaveClass(/text-amber-500/);

    // Click Export PDF to trigger browser window.print stub
    const printPromise = page.evaluate(() => {
      return new Promise((resolve) => {
        window.print = () => {
          resolve('printed');
        };
      });
    });
    
    await page.click('button:has-text("Export PDF")');
    const printResult = await printPromise;
    expect(printResult).toBe('printed');
  });
});
```
