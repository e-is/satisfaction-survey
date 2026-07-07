import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('should load the survey form and submit successfully', async ({ page }) => {
  // Rediriger les logs console et les erreurs du navigateur pour le débogage
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  // Nettoyer les anciens fichiers de test s'ils existent pour éviter les collisions
  const rootDataDirSetup = path.join(process.cwd(), 'data');
  if (fs.existsSync(rootDataDirSetup)) {
    const files = fs.readdirSync(rootDataDirSetup);
    for (const file of files) {
      if (file.startsWith('enquete_client_test_')) {
        try {
          fs.unlinkSync(path.join(rootDataDirSetup, file));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  await page.goto('/?lang=fr');
  await expect(page).toHaveURL(/\/(\?.*)?$/);

  // Check title
  await expect(page.locator('h1').first()).toHaveText('Enquête de satisfaction');
  
  // Check tab title (document.title)
  await expect(page).toHaveTitle('Enquête de satisfaction');

  // Switch to English and check tab title
  await page.click('#btn-lang-en');
  await expect(page).toHaveTitle('Satisfaction survey');

  // Switch back to French and check tab title
  await page.click('#btn-lang-fr');
  await expect(page).toHaveTitle('Enquête de satisfaction');

  // Verify Type d'enquête section defaults
  await expect(page.locator('text=Type d\'enquête')).toBeVisible();
  const displayTypeInput = page.locator('#survey-display-type');
  const displayPerimeterInput = page.locator('#survey-display-perimeter');
  await expect(displayTypeInput).toBeVisible();
  await expect(displayTypeInput).toHaveValue('Fin de projet');
  await expect(displayTypeInput).toHaveAttribute('readonly', '');
  await expect(displayPerimeterInput).toBeVisible();
  await expect(displayPerimeterInput).toHaveValue('');
  await expect(displayPerimeterInput).toHaveAttribute('readonly', '');

  // Verify URL parameter parsing
  await page.goto('/?type=annuelle&perimetre=derniere&lang=fr');
  await expect(displayTypeInput).toHaveValue('Enquête annuelle');
  await expect(displayPerimeterInput).toHaveValue('Depuis la dernière enquête');

  await page.goto('/?type=annuelle&perimetre=annee&lang=fr');
  await expect(displayTypeInput).toHaveValue('Enquête annuelle');
  await expect(displayPerimeterInput).toHaveValue('Année écoulée');

  // Return to clean / for submission
  await page.goto('/?lang=fr');

  // Check initial global score
  await expect(page.locator('#global-score-text')).toHaveText('10/100 (10%)');

  // Fill Header Information
  await page.locator('#client').fill('Client Test');
  await page.locator('#project').fill('Projet Test');
  
  // Référent Client
  await page.locator('#clientFirstName').fill('Jean');
  await page.locator('#clientLastName').fill('Dupont');
  await page.locator('#clientService').fill('Informatique');

  // Référent E-IS
  await page.locator('#eisFirstName').fill('Pierre');
  await page.locator('#eisLastName').fill('Martin');

  // Date
  await page.locator('#date').fill('2026-06-15');
  
  // Details
  await page.locator('#details').fill('Détails du test');

  // Fill Ratings
  const criterionBlocks = page.locator('.py-6.first\\:pt-0.last\\:pb-0.space-y-4');
  const count = await criterionBlocks.count();
  expect(count).toBe(10);

  for (let i = 0; i < count; i++) {
    const block = criterionBlocks.nth(i);
    const inputs = block.locator('input[type="range"]');
    
    // Importance 6
    await inputs.nth(0).fill('6');
    
    // Evaluation 10
    await inputs.nth(1).fill('10');
  }

  // Check global score is 600/600 after filling all ratings
  await expect(page.locator('#global-score-text')).toHaveText('600/600 (100%)');

  // Fill Appreciation
  await page.fill('textarea', 'Ceci est une appréciation globale de test automatique.');

  // Checkbox publication validations
  const allowAppreciationPublication = page.locator('#allowAppreciationPublication');
  const allowNamePublication = page.locator('#allowNamePublication');

  // Verify initial state of checkboxes
  await expect(allowAppreciationPublication).not.toBeChecked();
  await expect(allowNamePublication).not.toBeChecked();
  await expect(allowNamePublication).toBeDisabled();

  // Checking first checkbox should enable second checkbox
  await allowAppreciationPublication.check();
  await expect(allowAppreciationPublication).toBeChecked();
  await expect(allowNamePublication).toBeEnabled();

  // Checking second checkbox
  await allowNamePublication.check();
  await expect(allowNamePublication).toBeChecked();

  // Unchecking first checkbox should uncheck and disable second checkbox
  await allowAppreciationPublication.uncheck();
  await expect(allowAppreciationPublication).not.toBeChecked();
  await expect(allowNamePublication).not.toBeChecked();
  await expect(allowNamePublication).toBeDisabled();

  // Checking both again for the final submission
  await allowAppreciationPublication.check();
  await allowNamePublication.check();

  // Submit
  await page.click('button[type="submit"]');

  // Check for success message
  await expect(page.locator('text=Merci pour votre retour')).toBeVisible({ timeout: 10000 });

  // Verify that saved JSON file has correct values
  const dataDir = path.join(process.cwd(), 'data');
  const filesInRootBeforeDelete = fs.readdirSync(dataDir);
  const testFileSaved = filesInRootBeforeDelete.find(f => f.startsWith('enquete_client_test_'));
  expect(testFileSaved).toBeDefined();
  if (testFileSaved) {
    const filePath = path.join(dataDir, testFileSaved);
    const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(fileContent.allowAppreciationPublication).toBe(true);
    expect(fileContent.allowNamePublication).toBe(true);
  }

  // Verify that form fields are reset to default values
  await expect(page.locator('#client')).toHaveValue('');
  await expect(page.locator('#project')).toHaveValue('');
  await expect(page.locator('#clientFirstName')).toHaveValue('');
  await expect(page.locator('#clientLastName')).toHaveValue('');
  await expect(page.locator('#clientService')).toHaveValue('');
  await expect(page.locator('#eisFirstName')).toHaveValue('');
  await expect(page.locator('#eisLastName')).toHaveValue('');
  await expect(page.locator('#details')).toHaveValue('');
  await expect(page.locator('textarea')).toHaveValue('');
  await expect(allowAppreciationPublication).not.toBeChecked();
  await expect(allowNamePublication).not.toBeChecked();
  await expect(allowNamePublication).toBeDisabled();

  // Range inputs should be reset to '1'
  for (let i = 0; i < count; i++) {
    const block = criterionBlocks.nth(i);
    const inputs = block.locator('input[type="range"]');
    await expect(inputs.nth(0)).toHaveValue('1');
    await expect(inputs.nth(1)).toHaveValue('1');
  }

  // Check global score is reset back to 10/100
  await expect(page.locator('#global-score-text')).toHaveText('10/100 (10%)');

  // Navigate to results page using the ⁝ button (opens dropdown, then clicks item)
  await page.click('#menu-trigger');
  await page.click('#btn-goto-results');
  await expect(page).toHaveURL(/\/results$/);

  // Check results page header
  await expect(page.locator('h1')).toHaveText('Gestion des résultats');

  // We should see the login screen first
  await expect(page.locator('text=Connexion requise')).toBeVisible();

  // Load credentials dynamically from auth.json
  const authPath = path.join(process.cwd(), 'config', 'auth.json');
  const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
  const correctUser = authData[0].username;
  const correctPassword = authData[0].password;

  // Try to log in with invalid password
  await page.locator('#username').fill(correctUser);
  await page.locator('#password').fill('WrongPassword');
  await page.click('button:has-text("Se connecter")');
  await expect(page.locator('text=Identifiant ou mot de passe incorrect')).toBeVisible();

  // Log in with correct credentials
  await page.locator('#password').fill(correctPassword);
  await page.click('button:has-text("Se connecter")');

  // Verify connection indicator
  await expect(page.locator(`text=Connecté : ${correctUser}`)).toBeVisible();

  // Check that the submitted survey is in the table
  await expect(page.locator('table')).toContainText('Client Test');
  await expect(page.locator('table')).toContainText('Projet Test');

  // Verify new columns headers exist and submitted row has expected French values
  await expect(page.locator('table')).toContainText('Publication');
  await expect(page.locator('table')).toContainText('Nominative');
  const submittedRow = page.locator('tr', { hasText: 'Client Test' });
  await expect(submittedRow).toContainText('Oui');

  // --- Test Sorting and Filtering ---
  await expect(page.locator('text=Filtres des enquêtes')).toBeVisible();
  const filterClientSelect = page.locator('#filter-client');
  const filterProjectSelect = page.locator('#filter-project');
  const filterTypeSelect = page.locator('#filter-type');
  
  await expect(filterClientSelect).toBeVisible();
  await expect(filterProjectSelect).toBeVisible();
  await expect(filterTypeSelect).toBeVisible();

  // Test client filtering
  await filterClientSelect.selectOption('Client Test');
  await expect(page.locator('table')).toContainText('Client Test');
  
  // Select "Tous" again
  await filterClientSelect.selectOption('');

  // Test sorting by Client
  const clientSortBtn = page.locator('button:has-text("Client")');
  await expect(clientSortBtn).toBeVisible();
  await clientSortBtn.click(); // Sort Ascending
  await clientSortBtn.click(); // Sort Descending

  // Test sorting by Date
  const dateSortBtn = page.locator('button:has-text("Date")');
  await expect(dateSortBtn).toBeVisible();
  await dateSortBtn.click(); // Toggle sort direction (desc -> asc)
  await dateSortBtn.click(); // Toggle sort direction again (asc -> desc)

  // --- Test Link sharing / Survey generator section ---
  await expect(page.locator("text=Création d'un lien de questionnaire")).toBeVisible();

  const typeSelect = page.locator('#survey-type');
  const perimeterSelect = page.locator('#survey-perimeter');
  const urlInput = page.locator('#survey-url');
  const copyBtn = page.locator('#copy-url-btn');

  // Verify elements are visible
  await expect(typeSelect).toBeVisible();
  await expect(perimeterSelect).toBeVisible();
  await expect(urlInput).toBeVisible();
  await expect(copyBtn).toBeVisible();

  // Verify default state
  await expect(typeSelect).toHaveValue('Fin de projet');
  await expect(perimeterSelect).toBeDisabled();
  await expect(perimeterSelect).toHaveValue('');
  await expect(urlInput).toHaveValue(`${page.url().replace('/results', '')}/?type=projet&lang=fr`);

  const langSelect = page.locator('#survey-language-select');
  await expect(langSelect).toBeVisible();
  await expect(langSelect).toHaveValue('fr');

  // Change type to "Enquête annuelle"
  await typeSelect.selectOption('Enquête annuelle');
  await expect(perimeterSelect).toBeEnabled();
  await expect(perimeterSelect).toHaveValue('Année écoulée');
  await expect(urlInput).toHaveValue(`${page.url().replace('/results', '')}/?type=annuelle&perimetre=annee&lang=fr`);

  // Change perimeter to "Depuis la dernière enquête"
  await perimeterSelect.selectOption('Depuis la dernière enquête');
  await expect(urlInput).toHaveValue(`${page.url().replace('/results', '')}/?type=annuelle&perimetre=derniere&lang=fr`);

  // Change language to English
  await langSelect.selectOption('en');
  await expect(urlInput).toHaveValue(`${page.url().replace('/results', '')}/?type=annuelle&perimetre=derniere&lang=en`);

  // Copy URL button click (grant permissions to ensure standard copy succeeds or fallback triggers correctly)
  await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
  await copyBtn.click();
  await expect(copyBtn).toHaveText('✓ Copié !');

  // Change type back to "Fin de projet" and language back to "fr"
  await typeSelect.selectOption('Fin de projet');
  await langSelect.selectOption('fr');
  await expect(perimeterSelect).toBeDisabled();
  await expect(perimeterSelect).toHaveValue('');
  await expect(urlInput).toHaveValue(`${page.url().replace('/results', '')}/?type=projet&lang=fr`);

  // Check toggle button functionality
  const toggleBtn = page.locator('button:has-text("Afficher le détail des notes")');
  await expect(toggleBtn).toBeVisible();

  // Initially columns "Imp." are not visible
  await expect(page.locator('text=Imp.')).not.toBeVisible();

  // Click toggle
  await toggleBtn.click();
  await expect(page.locator('button:has-text("Masquer le détail des notes")')).toBeVisible();
  // Now "Imp." headers should be visible
  await expect(page.locator('text=Imp.').first()).toBeVisible();

  // Click toggle again to hide
  await page.click('button:has-text("Masquer le détail des notes")');
  await expect(page.locator('text=Imp.')).not.toBeVisible();

  // Check the "Comptabilisé" checkbox
  const checkbox = page.locator('table input[type="checkbox"]').first();
  await expect(checkbox).toBeChecked();

  // Toggle checkbox
  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();

  // Toggle back
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  // Delete survey
  const row = page.locator('tr', { hasText: 'Client Test' });
  await row.locator('button[title="Supprimer cette ligne"]').click();
  
  // Confirm deletion
  await page.locator('button:has-text("Confirmer")').click();

  // Check that the survey is removed
  await expect(row).not.toBeVisible();

  // Verify that the file was deleted in the data/ directory
  const rootDataDir = path.join(process.cwd(), 'data');
  await new Promise(resolve => setTimeout(resolve, 1000));
  const filesInRoot = fs.readdirSync(rootDataDir);
  const testFile = filesInRoot.find(f => f.startsWith('enquete_client_test_'));
  expect(testFile).toBeUndefined();

  // Test logout
  await page.click('button:has-text("Se déconnecter")');
  await expect(page.locator('text=Connexion requise')).toBeVisible();

  // Navigate back to the survey form
  await page.click('button:has-text("Retour au formulaire")');
  await expect(page.locator('h1').first()).toHaveText(/Satisfaction Survey|Enquête de satisfaction/);
});
