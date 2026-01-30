import fs from 'fs';
import yaml from 'js-yaml';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import net from 'net';

// --- 1. HELPER: Normalize Actions (FIXED PRIORITY) ---
function normalizeAction(step) {
    // 1. PRIORITY CHECK: Smart Type Shorthand
    // We MUST check this first because the key is named 'type', which confuses the logic below.
    if (step.type && step.into) {
        return { type: 'type_smart', value: step.type, label: step.into };
    }

    // 2. Legacy/Developer Syntax (Explicit 'type' key)
    if (step.type) {
        // If it uses "selector", it's the old developer syntax. 
        // We rename it to 'type_selector' to distinguish it from the smart syntax.
        if (step.type === 'type' && step.selector) {
            return { type: 'type_selector', selector: step.selector, value: step.value };
        }
        // Return other explicit types (assert_text, assert_visible) as is
        return step;
    }

    // 3. Product Manager Shorthands
    if (step.see) return { type: 'see', value: step.see };
    if (step.click) return { type: 'click', value: step.click };
    if (step.wait) return { type: 'wait', ms: step.wait };
    if (step.url) return { type: 'assert_url', value: step.url };

    // 4. Network Syntax
    if (step.network) {
        const parts = step.network.split(' ');
        return { type: 'network_listen', method: parts[0] || 'GET', urlPart: parts[1] || parts[0] };
    }

    return step;
}

// --- 2. HELPER: Wait for Server ---
function waitForServer(port = 3000, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            const socket = new net.Socket();
            socket.setTimeout(1000);
            socket.on('connect', () => { socket.destroy(); clearInterval(interval); resolve(); });
            socket.on('error', () => {
                socket.destroy();
                if (Date.now() - start > timeout) {
                    clearInterval(interval);
                    reject(new Error('Server timeout'));
                }
            });
            socket.connect(port, 'localhost');
        }, 1000);
    });
}

// --- 3. MAIN ENGINE ---
export async function runTests(page) {
    console.log(chalk.bold.blue('\n🚀 Starting Vibe Verification Engine...\n'));

    // A. Load YAML
    let plan = "";
    if (fs.existsSync("vibe.yaml")) {
        try {
            const fileContents = fs.readFileSync('vibe.yaml', 'utf8');
            plan = yaml.load(fileContents);
        } catch (e) {
            console.log(chalk.red('❌ Could not find "vibe.yaml".'));
            return { success: false, error: "Missing vibe.yaml" };
        }
    }

    const baseUrl = plan.meta.baseUrl || 'http://localhost:3000';
    const failureReport = []; // Store failures here

    // B. Smart Server Startup
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 3000 });
    } catch (e) {
        console.log(chalk.yellow('⚠️  Localhost is down. Auto-starting...'));
        const serverSpinner = ora('Booting up server...').start();
        const child = spawn('npm', ['run', 'dev'], { stdio: 'ignore', detached: true, shell: true });
        child.unref();

        try {
            await waitForServer(3000);
            serverSpinner.succeed(chalk.green('Server is up!'));
            await page.goto(baseUrl, { waitUntil: 'networkidle' });
        } catch (startError) {
            serverSpinner.fail(chalk.red('Could not auto-start server.'));
            return { success: false, error: "Server failed to start" };
        }
    }

    // C. The Testing Loop
    let pendingNetworkPromise = null;

    for (const scenario of plan.scenarios) {
        console.log(chalk.dim('-----------------------------------'));
        console.log(chalk.bold.magenta(`Testing Scenario: ${scenario.name}`));

        const navSpinner = ora(`Navigating to ${scenario.path}...`).start();
        try {
            await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: 'networkidle' });
            navSpinner.succeed(`Arrived at ${scenario.path}`);
        } catch (e) {
            navSpinner.fail(`Could not load ${scenario.path}`);
            failureReport.push({
                scenario: scenario.name,
                step: "Navigation",
                error: `Could not load ${scenario.path}`
            });
            continue;
        }

        for (const rawStep of scenario.tests) {
            const action = normalizeAction(rawStep);
            const stepSpinner = ora(`Checking...`).start();

            try {
                // If we have a pending network listener, wait for it unless we are about to trigger it
                if (pendingNetworkPromise && action.type !== 'click' && action.type !== 'type_smart') {
                    stepSpinner.text = "Waiting for previous API call...";
                    await pendingNetworkPromise;
                    pendingNetworkPromise = null;
                }

                switch (action.type) {
                    case 'see':
                        stepSpinner.text = `Looking for text: "${action.value}"`;
                        if (await page.getByText(action.value).isVisible()) {
                            stepSpinner.succeed(chalk.green(`✅ Saw: "${action.value}"`));
                        } else {
                            throw new Error(`Text "${action.value}" not found.`);
                        }
                        break;

                    case 'assert_visible':
                        await page.waitForSelector(action.selector, { state: 'visible', timeout: 5000 });
                        stepSpinner.succeed(chalk.green(`✅ Visible: ${action.selector}`));
                        break;

                    case 'assert_text':
                        const el = await page.waitForSelector(action.selector);
                        const txt = await el.textContent();
                        if (txt.includes(action.value)) stepSpinner.succeed(chalk.green(`✅ Text Match: "${action.value}"`));
                        else throw new Error(`Expected "${action.value}", found "${txt}"`);
                        break;

                    case 'click':
                        stepSpinner.text = `Clicking "${action.value}"...`;
                        const clickAction = page.click(`text=${action.value}`, { timeout: 5000 });
                        if (pendingNetworkPromise) {
                            await Promise.all([pendingNetworkPromise, clickAction]);
                            pendingNetworkPromise = null;
                            stepSpinner.succeed(`🖱️ Clicked "${action.value}" & ✅ API Verified`);
                        } else {
                            await clickAction;
                            stepSpinner.succeed(`🖱️ Clicked "${action.value}"`);
                        }
                        break;

                    case 'type_smart':
                        stepSpinner.text = `Typing into "${action.label}"...`;
                        // Try Label first (best practice), then Placeholder (fallback)
                        const labelMatch = page.getByLabel(action.label);
                        const placeholderMatch = page.getByPlaceholder(action.label);

                        if (await labelMatch.count() > 0) await labelMatch.fill(action.value);
                        else if (await placeholderMatch.count() > 0) await placeholderMatch.fill(action.value);
                        else throw new Error(`Input "${action.label}" not found.`);

                        stepSpinner.succeed(`⌨️ Typed "${action.value}"`);
                        break;

                    case 'type_selector':
                        await page.fill(action.selector, action.value);
                        stepSpinner.succeed(`⌨️ Typed into ${action.selector}`);
                        break;

                    case 'assert_url':
                        stepSpinner.text = `Verifying URL...`;
                        await page.waitForURL(`**${action.value}**`, { timeout: 5000 });
                        stepSpinner.succeed(`📍 Navigated to "${action.value}"`);
                        break;

                    case 'network_listen':
                        stepSpinner.text = `👂 Listening for ${action.method} ${action.urlPart}...`;
                        pendingNetworkPromise = page.waitForResponse(res =>
                            res.url().includes(action.urlPart) &&
                            res.request().method() === action.method &&
                            res.status() === 200
                        );
                        stepSpinner.info(`👂 Listening for ${action.method} ${action.urlPart}...`);
                        break;

                    case 'wait':
                        await page.waitForTimeout(action.ms);
                        stepSpinner.succeed(`zzz Waited ${action.ms}ms`);
                        break;

                    default:
                        stepSpinner.warn(`⚠️ Unknown Action: ${JSON.stringify(action)}`);
                }

            } catch (error) {
                stepSpinner.fail(chalk.red(`❌ FAILED: ${JSON.stringify(action)}`));
                failureReport.push({
                    scenario: scenario.name,
                    action: action,
                    error: error.message
                });
                pendingNetworkPromise = null;
            }
        }
    }

    console.log(chalk.dim('\n-----------------------------------'));

    if (failureReport.length === 0) {
        console.log(chalk.green.bold('✨ All Vibes Passed! The app is pristine.'));
        return { success: true };
    } else {
        console.log(chalk.red.bold(`🚫 Vibe Check Failed! Found ${failureReport.length} issues.`));
        return { success: false, failures: failureReport };
    }
}