import { execSync } from 'child_process';
import { chromium } from 'playwright';
import chalk from 'chalk';

async function runPlaywright() {
    try {
        // Attempt to launch
        const browser = await chromium.launch({
            headless: true,        // Config: Run invisible
            slowMo: 50,            // Config: Slow down by 50ms so actions are reliable
            args: ['--no-sandbox'],
        });

        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 }, // Config: Standard Screen size
            userAgent: 'BotIntern-Vibe-Check/1.0',  // Config: Custom User Agent
            // recordVideo: { dir: 'test-assets/videos/' } // Config: Free Video Recording!
        });
        const page = await context.newPage();
        return { browser, context, page };
    } catch (e) {
        // Check if the error is "Executable not found"
        if (e.message.includes('Executable doesn\'t exist') || e.message.includes('not found')) {
            console.log(chalk.yellow('📦 First-time setup: Downloading Browsers... (This happens only once)'));

            // AUTO-INSTALL: The Magic Command
            execSync('npx playwright install chromium', { stdio: 'inherit' });

            console.log(chalk.green('✅ Setup complete. Resuming...'));
            return await runPlaywright();
        }
        throw e; // Rethrow real errors
    }
}


export { runPlaywright };


