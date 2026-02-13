import { test, expect } from '@playwright/test';

test.describe('ORBAT Interactivity Verification', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Bypass auth gate
    await page.addInitScript(() => {
      window.localStorage.setItem('uksf_auth', 'authorized');
      localStorage.setItem('dev_access', 'granted');
        window.localStorage.setItem('dev_access', 'granted');
    });
    
    await page.goto('/registry/orbat/?disable_consent=true');
    // Wait for dynamic content to load and center view
    await page.waitForTimeout(2000);
  });

  test('Should be able to toggle edit mode and edit node text', async ({ page }) => {
    // 1. Enable Edit Mode
    const editBtn = page.locator('#edit-mode-btn');
    await editBtn.click();
    await expect(page.locator('#hq-admin-bar')).toHaveClass(/edit-active/);

    // 2. Locate a node and its name field
    const firstNodeName = page.locator('.orbat-node-wrapper .editable-field[data-key="name"]').first();
    
    // 3. Verify it is contenteditable
    const isEditable = await firstNodeName.getAttribute('contenteditable');
    expect(isEditable).toBe('true');

    // 4. Click and Type
    await firstNodeName.click();
    await page.keyboard.type('TEST_UNIT_NAME');
    
    // 5. Verify the text changed
    const text = await firstNodeName.innerText();
    expect(text).toContain('TEST_UNIT_NAME');
  });

  test('Should be able to drag a node in edit mode', async ({ page }) => {
    // 1. Enable Edit Mode
    await page.locator('#edit-mode-btn').click();

    // 2. Locate a node
    const node = page.locator('.orbat-node-wrapper').first();
    const initialPos = await node.boundingBox();
    if (!initialPos) throw new Error("Node box not found");

    // 3. Drag the node
    await node.hover();
    await page.mouse.down();
    await page.mouse.move(initialPos.x + 100, initialPos.y + 100);
    await page.mouse.up();

    // 4. Verify position changed
    const finalPos = await node.boundingBox();
    if (!finalPos) throw new Error("Node box not found after drag");
    expect(finalPos.x).not.toBe(initialPos.x);
    expect(finalPos.y).not.toBe(initialPos.y);
  });
});