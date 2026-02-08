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

    // 4. Color Assertions
    if (step.color) {
        const parts = step.color.split(/\s+on\s+/i);
        if (parts.length === 2) {
            return { type: 'assert_color', color: parts[0].trim(), element: parts[1].trim() };
        }
    }
    if (step.background) {
        const parts = step.background.split(/\s+on\s+/i);
        if (parts.length === 2) {
            return { type: 'assert_background', color: parts[0].trim(), element: parts[1].trim() };
        }
    }
    if (step['border-color']) {
        const parts = step['border-color'].split(/\s+on\s+/i);
        if (parts.length === 2) {
            return { type: 'assert_border_color', color: parts[0].trim(), element: parts[1].trim() };
        }
    }

    // 5. Network Syntax
    if (step.network) {
        const parts = step.network.split(' ');
        return { type: 'network_listen', method: parts[0] || 'GET', urlPart: parts[1] || parts[0] };
    }

    return step;
}

// --- 1.5. HELPER: Normalize Colors ---
function normalizeColor(color) {
    // Convert any color format to RGB for comparison
    const namedColors = {
        'red': 'rgb(255, 0, 0)',
        'blue': 'rgb(0, 0, 255)',
        'green': 'rgb(0, 128, 0)',
        'white': 'rgb(255, 255, 255)',
        'black': 'rgb(0, 0, 0)',
        'yellow': 'rgb(255, 255, 0)',
        'gray': 'rgb(128, 128, 128)',
        'grey': 'rgb(128, 128, 128)',
        'orange': 'rgb(255, 165, 0)',
        'purple': 'rgb(128, 0, 128)',
        'pink': 'rgb(255, 192, 203)',
        'brown': 'rgb(165, 42, 42)',
        'cyan': 'rgb(0, 255, 255)',
        'magenta': 'rgb(255, 0, 255)',
        'lime': 'rgb(0, 255, 0)',
        'navy': 'rgb(0, 0, 128)',
        'teal': 'rgb(0, 128, 128)',
        'silver': 'rgb(192, 192, 192)',
        'gold': 'rgb(255, 215, 0)',
    };

    const trimmed = color.trim().toLowerCase();

    // Handle named colors
    if (namedColors[trimmed]) {
        return namedColors[trimmed];
    }

    // Handle hex colors (#fff, #ffffff, #ffffffff)
    if (trimmed.startsWith('#')) {
        let hex = trimmed.slice(1);

        // Expand 3-digit hex to 6-digit
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }

        // Parse RGB values
        if (hex.length === 6 || hex.length === 8) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgb(${r}, ${g}, ${b})`;
        }
    }

    // Already in rgb/rgba format - normalize spacing
    if (trimmed.startsWith('rgb')) {
        // Extract just rgb values, ignore alpha
        const match = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            return `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
        }
    }

    return color;
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
    const cwd = process.cwd();
    const yamlPath = `${cwd}/vibe.yaml`;
    let plan = "";

    if (fs.existsSync(yamlPath)) {
        try {
            const fileContents = fs.readFileSync(yamlPath, 'utf8');
            plan = yaml.load(fileContents);
        } catch (e) {
            console.log(chalk.red(`❌ Error reading vibe.yaml: ${e.message}`));
            return { success: false, error: "Error reading vibe.yaml" };
        }
    } else {
        console.log(chalk.red(`❌ Could not find "vibe.yaml" in: ${cwd}`));
        console.log(chalk.yellow(`💡 Make sure you're running this command from the project directory containing vibe.yaml`));
        return { success: false, error: "Missing vibe.yaml" };
    }

    const baseUrl = plan.meta.baseUrl || 'http://localhost:3000';
    const failureReport = []; // Store failures here
    let totalTests = 0; // Track total number of tests
    let passedTests = 0; // Track passed tests

    // B. Smart Server Startup
    let spinner = null; // Initialize spinner before any usage
    try {
        await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 3000 });
    } catch (e) {
        console.log(chalk.yellow('⚠️  Localhost is down. Auto-starting...'));
        spinner = ora('Booting up server...').start();
        const child = spawn('npm', ['run', 'dev'], { stdio: 'ignore', detached: true, shell: true });
        child.unref();

        try {
            await waitForServer(3000);
            spinner.succeed(chalk.green('Server is up!'));
            spinner = null;
            await page.goto(baseUrl, { waitUntil: 'networkidle' });
        } catch (startError) {
            spinner.fail(chalk.red('Could not auto-start server.'));
            spinner = null;
            return { success: false, error: "Server failed to start" };
        }
    }

    // C. The Testing Loop
    let pendingNetworkPromise = null;

    for (const scenario of plan.scenarios) {
        console.log(chalk.dim('-----------------------------------'));
        console.log(chalk.bold.magenta(`Testing Scenario: ${scenario.name}`));

        spinner = ora(`Navigating to ${scenario.path}...`).start();
        try {
            await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: 'networkidle' });
            spinner.succeed(`Arrived at ${scenario.path}`);
            spinner = null;
        } catch (e) {
            spinner.fail(`Could not load ${scenario.path}`);
            spinner = null;
            failureReport.push({
                scenario: scenario.name,
                step: "Navigation",
                error: `Could not load ${scenario.path}`
            });
            continue;
        }

        for (const rawStep of scenario.tests) {
            const action = normalizeAction(rawStep);
            spinner = ora(`Checking...`).start();

            try {
                // If we have a pending network listener, wait for it unless we are about to trigger it
                if (pendingNetworkPromise && action.type !== 'click' && action.type !== 'type_smart') {
                    spinner.text = "Waiting for previous API call...";
                    await pendingNetworkPromise;
                    pendingNetworkPromise = null;
                }

                // Skip network_listen from test count as it's a setup action
                if (action.type !== 'network_listen') {
                    totalTests++;
                }

                switch (action.type) {
                    case 'see':
                        spinner.text = `Looking for text: "${action.value}"`;
                        if (await page.getByText(action.value).isVisible()) {
                            spinner.succeed(chalk.green(`✅ Saw: "${action.value}"`));
                            passedTests++;
                        } else {
                            throw new Error(`Text "${action.value}" not found.`);
                        }
                        break;

                    case 'assert_visible':
                        await page.waitForSelector(action.selector, { state: 'visible', timeout: 5000 });
                        spinner.succeed(chalk.green(`✅ Visible: ${action.selector}`));
                        passedTests++;
                        break;

                    case 'assert_text':
                        const el = await page.waitForSelector(action.selector);
                        const txt = await el.textContent();
                        if (txt.includes(action.value)) {
                            spinner.succeed(chalk.green(`✅ Text Match: "${action.value}"`));
                            passedTests++;
                        } else {
                            throw new Error(`Expected "${action.value}", found "${txt}"`);
                        }
                        break;

                    case 'click':
                        spinner.text = `Clicking "${action.value}"...`;
                        const clickAction = page.click(`text=${action.value}`, { timeout: 5000 });
                        if (pendingNetworkPromise) {
                            await Promise.all([pendingNetworkPromise, clickAction]);
                            pendingNetworkPromise = null;
                            spinner.succeed(`🖱️ Clicked "${action.value}" & ✅ API Verified`);
                        } else {
                            await clickAction;
                            spinner.succeed(`🖱️ Clicked "${action.value}"`);
                        }
                        passedTests++;
                        break;

                    case 'type_smart':
                        spinner.text = `Typing into "${action.label}"...`;
                        // Try Label first (best practice), then Placeholder (fallback)
                        const labelMatch = page.getByLabel(action.label);
                        const placeholderMatch = page.getByPlaceholder(action.label);

                        if (await labelMatch.count() > 0) await labelMatch.fill(action.value);
                        else if (await placeholderMatch.count() > 0) await placeholderMatch.fill(action.value);
                        else throw new Error(`Input "${action.label}" not found.`);

                        spinner.succeed(`⌨️ Typed "${action.value}"`);
                        passedTests++;
                        break;

                    case 'type_selector':
                        await page.fill(action.selector, action.value);
                        spinner.succeed(`⌨️ Typed into ${action.selector}`);
                        passedTests++;
                        break;

                    case 'assert_url':
                        spinner.text = `Verifying URL...`;
                        await page.waitForURL(`**${action.value}**`, { timeout: 5000 });
                        spinner.succeed(`📍 Navigated to "${action.value}"`);
                        passedTests++;
                        break;

                    case 'network_listen':
                        spinner.text = `👂 Listening for ${action.method} ${action.urlPart}...`;
                        pendingNetworkPromise = page.waitForResponse(res =>
                            res.url().includes(action.urlPart) &&
                            res.request().method() === action.method &&
                            res.status() === 200
                        );
                        spinner.info(`👂 Listening for ${action.method} ${action.urlPart}...`);
                        break;

                    case 'assert_color':
                        spinner.text = `Checking text color of "${action.element}"...`;
                        try {
                            const colorElement = await page.getByText(action.element).first();
                            const actualColor = await colorElement.evaluate(el =>
                                window.getComputedStyle(el).color
                            );
                            const expectedColor = normalizeColor(action.color);
                            const normalizedActual = normalizeColor(actualColor);

                            if (normalizedActual === expectedColor) {
                                spinner.succeed(chalk.green(`✅ Color matches: ${action.color}`));
                                passedTests++;
                            } else {
                                throw new Error(`Expected color "${action.color}" (${expectedColor}) but got "${actualColor}" (${normalizedActual})`);
                            }
                        } catch (error) {
                            throw new Error(`Color check failed for "${action.element}": ${error.message}`);
                        }
                        break;

                    case 'assert_background':
                        spinner.text = `Checking background color of "${action.element}"...`;
                        try {
                            const bgElement = await page.getByText(action.element).first();
                            const actualBg = await bgElement.evaluate(el =>
                                window.getComputedStyle(el).backgroundColor
                            );
                            const expectedBg = normalizeColor(action.color);
                            const normalizedBg = normalizeColor(actualBg);

                            if (normalizedBg === expectedBg) {
                                spinner.succeed(chalk.green(`✅ Background matches: ${action.color}`));
                                passedTests++;
                            } else {
                                throw new Error(`Expected background "${action.color}" (${expectedBg}) but got "${actualBg}" (${normalizedBg})`);
                            }
                        } catch (error) {
                            throw new Error(`Background check failed for "${action.element}": ${error.message}`);
                        }
                        break;

                    case 'assert_border_color':
                        spinner.text = `Checking border color of "${action.element}"...`;
                        try {
                            const borderElement = await page.getByText(action.element).first();
                            const actualBorder = await borderElement.evaluate(el =>
                                window.getComputedStyle(el).borderColor
                            );
                            const expectedBorder = normalizeColor(action.color);
                            const normalizedBorder = normalizeColor(actualBorder);

                            if (normalizedBorder === expectedBorder) {
                                spinner.succeed(chalk.green(`✅ Border color matches: ${action.color}`));
                                passedTests++;
                            } else {
                                throw new Error(`Expected border color "${action.color}" (${expectedBorder}) but got "${actualBorder}" (${normalizedBorder})`);
                            }
                        } catch (error) {
                            throw new Error(`Border color check failed for "${action.element}": ${error.message}`);
                        }
                        break;

                    case 'wait':
                        await page.waitForTimeout(action.ms);
                        spinner.succeed(`zzz Waited ${action.ms}ms`);
                        passedTests++;
                        break;

                    default:
                        spinner.warn(`⚠️ Unknown Action: ${JSON.stringify(action)}`);
                }

                // Clean up spinner after successful test step
                spinner = null;

            } catch (error) {
                spinner.fail(chalk.red(`❌ FAILED: ${JSON.stringify(action)}`));
                spinner = null;
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

    // Check if tests actually ran
    if (totalTests === 0) {
        console.log(chalk.yellow.bold('⚠️  No tests were executed. Please check your vibe.yaml file.'));
        return { success: false, error: "No tests executed" };
    }

    if (failureReport.length === 0 && passedTests === totalTests) {
        console.log(chalk.green.bold(`✨ All Vibes Passed! ${passedTests}/${totalTests} tests successful.`));
        return { success: true, totalTests, passedTests };
    } else {
        console.log(chalk.red.bold(`🚫 Vibe Check Failed! ${failureReport.length} failures out of ${totalTests} tests.`));
        console.log(chalk.yellow(`   Passed: ${passedTests}/${totalTests}`));
        return { success: false, failures: failureReport, totalTests, passedTests };
    }
}