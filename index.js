#!/usr/bin/env node

// Use bun run index.js to run this file single time.
// Use bun run dev to run this file in watch mode.

import { Command } from "commander";
import chalk from "chalk";
import exec from "child_process";
import ora from "ora";
import { fixBuild, generateYaml } from "./lib/ai.js";
import fs from "fs";
import { extractErrorFile } from "./utils/errorExtractor.js";
import path from "path";
import { getCriticalSourceCode, getProjectStructure } from "./lib/fileTreeParser.js";
import { runTests } from "./lib/runTests.js";
import { runPlaywright } from "./lib/runPlaywright.js";
import { loop } from "./lib/loop.js";
import { saveApiKey } from "./lib/registerAndFetchKey.js";
import readline from "readline";

const banner = `
${chalk.bold.cyan('┌─────────────────────────────────────────────────────────────────┐')}
${chalk.cyan('│')} ${chalk.bold.white('╔═════════════════════════════════════════════════════════════╗')} ${chalk.cyan('│')}
${chalk.cyan('│')} ${chalk.cyan('║')} ${chalk.bold.white('█████▄ ▄████▄ ██████ ██ ███  ██ ██████ ██████ █████▄  ███  ██ ')} ${chalk.cyan('║')} ${chalk.cyan('│')}
${chalk.cyan('│')} ${chalk.cyan('║')} ${chalk.bold.white('██▄▄██ ██  ██   ██   ██ ██ ▀▄██   ██   ██▄▄   ██▄▄██▄ ██ ▀▄██ ')} ${chalk.cyan('║')} ${chalk.cyan('│')}
${chalk.cyan('│')} ${chalk.cyan('║')} ${chalk.bold.white('██▄▄█▀ ▀████▀   ██   ██ ██   ██   ██   ██▄▄▄▄ ██   ██ ██   ██  ')} ${chalk.cyan('║')} ${chalk.cyan('│')}
${chalk.cyan('│')} ${chalk.cyan('║')} ${chalk.gray('         ' + chalk.italic.blue('AI-Powered Code Testing & Validation') + '         ')} ${chalk.cyan('║')} ${chalk.cyan('│')}
${chalk.cyan('│')} ${chalk.cyan('║')} ${chalk.dim('      ' + chalk.yellow('⚡') + ' The intern that fixes more bugs than it creates ' + chalk.yellow('⚡') + '      ')} ${chalk.cyan('║')} ${chalk.cyan('│')}
${chalk.cyan('│')} ${chalk.cyan('╚═════════════════════════════════════════════════════════════╝')} ${chalk.cyan('│')}
${chalk.cyan('└─────────────────────────────────────────────────────────────────└')}

${chalk.cyan.bold('🚀 Ready to validate your AI-generated code? 🚀')}

${chalk.dim('✨ Scan • Fix • Test • Generate • Loop')}
${chalk.dim('')}

`;

const program = new Command();

program
  .name('botintern')
  .description(chalk.gray('Advanced CLI to validate and fix AI-generated code with intelligent testing.'))
  .version('1.0.0')
  .configureOutput({
    writeErr: (str) => process.stderr.write(chalk.red(str)),
    writeOut: (str) => process.stdout.write(str)
  });

program
  .command('login')
  .description('Authenticate BotIntern with your Gemini API Key')
  .action(() => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(chalk.cyan('🤖 BotIntern Login'));
    console.log(chalk.dim('Get your free key at: https://aistudio.google.com/app/apikey'));

    rl.question('\n🔑 Paste your Gemini API Key: ', (key) => {
      if (!key || key.trim().length === 0) {
        console.log(chalk.red('❌ Invalid key.'));
        rl.close();
        return;
      }

      saveApiKey(key.trim());
      console.log(chalk.green('\n✨ Success! Key saved globally. You can now use "botintern test" and "botintern loop" commands.'));
      rl.close();
    });
  });

program.command('scan')
  .description('🔍 Scan a codebase for errors')
  .action(() => {
    console.log(chalk.cyan('┌─ ') + chalk.bold.white('SCAN MODE') + chalk.cyan(' ───────────────────────────'));
    console.log(chalk.cyan('│') + ' ' + chalk.blue('🔍 Initializing AI code scanner...'));
    console.log(chalk.cyan('│') + ' ' + chalk.yellow('⚡ Analyzing codebase for potential issues...'));
    console.log(chalk.cyan('└─') + chalk.cyan('─'.repeat(45)));

    const spinner = ora({
      text: chalk.yellow('🔍 Scanning for AI hallucinations...'),
      spinner: 'dots',
      color: 'yellow'
    }).start();

    exec.exec("npm run build", function (error, stdout, stderr) {
      if (error) {
        spinner.fail({
          text: chalk.red('❌ BUILD FAILED'),
          symbol: '✖'
        });
        console.log('');
        console.log(chalk.red('┌─ ') + chalk.bold.white('ERROR DETAILS') + chalk.red(' ──────────────────────'));
        console.log(chalk.red('│') + ' ' + chalk.gray('Build output detected issues:'));
        console.log(chalk.red('│') + chalk.dim('├─ STDOUT:'));
        console.log(chalk.red('│') + chalk.dim('│ ' + stdout.trim()));
        console.log(chalk.red('│') + chalk.dim('├─ STDERR:'));
        console.log(chalk.red('│') + chalk.dim('│ ' + stderr.trim()));
        console.log(chalk.red('└─') + chalk.red('─'.repeat(45)));
      } else {
        spinner.succeed({
          text: chalk.green('✅ BUILD PASSED'),
          symbol: '✔'
        });
        console.log(chalk.green('┌─ ') + chalk.white('SCAN RESULTS') + chalk.green(' ───────────────────────'));
        console.log(chalk.green('│') + ' ' + chalk.white('✨ No errors detected! Code looks clean.'));
        console.log(chalk.green('│') + ' ' + chalk.gray('🎯 AI code quality: EXCELLENT'));
        console.log(chalk.green('└─') + chalk.green('─'.repeat(45)));
      }
    })
  });


program.command('fix')
  .description('🔧 Automatically fix errors in a codebase')
  .action(() => {
    console.log(chalk.magenta('┌─ ') + chalk.bold.white('AUTO-FIX MODE') + chalk.magenta(' ──────────────────────'));
    console.log(chalk.magenta('│') + ' ' + chalk.blue('🔧 Initializing intelligent code repair...'));
    console.log(chalk.magenta('│') + ' ' + chalk.yellow('⚡ AI-powered error fixing enabled...'));
    console.log(chalk.magenta('└─') + chalk.magenta('─'.repeat(45)));

    const spinner = ora({
      text: chalk.yellow('🔍 Detecting and analyzing build errors...'),
      spinner: 'line',
      color: 'yellow'
    }).start();

    exec.exec("npm run build", async function (error, stdout, stderr) {
      if (error) {
        spinner.fail({
          text: chalk.red('❌ BUILD ERRORS FOUND'),
          symbol: '✖'
        });
        console.log('');
        console.log(chalk.red('┌─ ') + chalk.bold.white('ERROR ANALYSIS') + chalk.red(' ──────────────────────'));
        console.log(chalk.red('│') + ' ' + chalk.gray('🔍 Processing build output...'));
        console.log(chalk.red('│') + chalk.dim('├─ BUILD LOGS:'));
        console.log(chalk.red('│') + chalk.dim('│ ' + (stdout + stderr).trim()));

        const combinedLogs = stdout + "\n" + stderr;
        let brokenFilePath = extractErrorFile(combinedLogs);

        if (!brokenFilePath) {
          console.log(chalk.yellow('│') + chalk.dim('├─ ') + chalk.yellow('⚠️  No specific file detected, using default: app/page.tsx'));
          brokenFilePath = "app/page.tsx";
        } else {
          console.log(chalk.blue('│') + chalk.dim('├─ ') + chalk.blue(`🎯 Target identified: ${chalk.bold(brokenFilePath)}`));
        }

        console.log(chalk.magenta('│') + chalk.dim('└─ ') + chalk.magenta('🤖 AI attempting fix...'));
        console.log(chalk.magenta('└─') + chalk.magenta('─'.repeat(45)));

        try {
          const absolutePath = path.resolve(process.cwd(), brokenFilePath);

          if (fs.existsSync(absolutePath)) {
            const fixSpinner = ora({
              text: chalk.cyan('🧠 AI generating solution...'),
              spinner: 'bouncingBar',
              color: 'cyan'
            }).start();

            const pageContent = fs.readFileSync(absolutePath, "utf-8");
            const packageContent = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8");

            const finalCode = await fixBuild([combinedLogs, pageContent, packageContent]);
            fixSpinner.succeed({
              text: chalk.green('✅ SOLUTION GENERATED'),
              symbol: '✨'
            });

            const applySpinner = ora({
              text: chalk.blue('📝 Applying fixes...'),
              spinner: 'dots',
              color: 'blue'
            }).start();

            fs.writeFileSync(absolutePath, finalCode);
            applySpinner.succeed({
              text: chalk.green('✨ FIXES APPLIED SUCCESSFULLY'),
              symbol: '✔'
            });

            console.log(chalk.green('┌─ ') + chalk.white('FIX SUMMARY') + chalk.green(' ───────────────────────'));
            console.log(chalk.green('│') + ' ' + chalk.white(`📁 File: ${chalk.gray(brokenFilePath)}`));
            console.log(chalk.green('│') + ' ' + chalk.white('🔧 Status: ') + chalk.green('FIXED'));
            console.log(chalk.green('│') + ' ' + chalk.gray('💡 Run "botintern scan" to verify fixes'));
            console.log(chalk.green('└─') + chalk.green('─'.repeat(45)));
          } else {
            console.log(chalk.red(`❌ File not found: ${brokenFilePath}`));
          }
        } catch (err) {
          console.log(chalk.red(`💥 Fix failed: ${err.message}`));
        }

      } else {
        spinner.succeed({
          text: chalk.green('✅ NO ERRORS TO FIX'),
          symbol: '✨'
        });
        console.log(chalk.green('┌─ ') + chalk.white('CODE STATUS') + chalk.green(' ───────────────────────'));
        console.log(chalk.green('│') + ' ' + chalk.white('🎉 Codebase is already error-free!'));
        console.log(chalk.green('│') + ' ' + chalk.gray('💎 Quality: PERFECT'));
        console.log(chalk.green('└─') + chalk.green('─'.repeat(45)));
      }
    })
  });



program.command("test")
  .description("🧪 Run comprehensive playwright tests")
  .action(async () => {
    console.log(chalk.blue('┌─ ') + chalk.bold.white('TEST MODE') + chalk.blue(' ────────────────────────'));
    console.log(chalk.blue('│') + ' ' + chalk.cyan('🧪 Initializing test environment...'));
    console.log(chalk.blue('│') + ' ' + chalk.yellow('⚡ Launching browser automation...'));
    console.log(chalk.blue('└─') + chalk.blue('─'.repeat(45)));

    const spinner = ora({
      text: chalk.cyan('🚀 Setting up test browser...'),
      spinner: 'toggle',
      color: 'cyan'
    }).start();

    try {
      const { browser, page } = await runPlaywright();
      spinner.succeed({
        text: chalk.green('🌐 Browser ready'),
        symbol: '✨'
      });

      const testSpinner = ora({
        text: chalk.yellow('🧪 Running automated tests...'),
        spinner: 'dots2',
        color: 'yellow'
      }).start();

      const testResult = await runTests(page);
      testSpinner.stop();

      const cleanupSpinner = ora({
        text: chalk.blue('🧹 Cleaning up...'),
        spinner: 'pipe',
        color: 'blue'
      }).start();

      await browser.close();
      cleanupSpinner.succeed({
        text: chalk.green('✨ Test session complete'),
        symbol: '✔'
      });

      // Display results based on actual test outcome
      if (testResult.success) {
        console.log(chalk.green('┌─ ') + chalk.white('TEST RESULTS') + chalk.green(' ──────────────────────'));
        console.log(chalk.green('│') + ' ' + chalk.white('🎯 Status: ') + chalk.green('PASSED'));
        console.log(chalk.green('│') + ' ' + chalk.white('📊 Tests: ') + chalk.gray(`${testResult.passedTests}/${testResult.totalTests} passed`));
        console.log(chalk.green('│') + ' ' + chalk.gray('💡 All checks passed successfully'));
        console.log(chalk.green('└─') + chalk.green('─'.repeat(45)));
      } else {
        console.log(chalk.red('┌─ ') + chalk.white('TEST RESULTS') + chalk.red(' ──────────────────────'));
        console.log(chalk.red('│') + ' ' + chalk.white('🎯 Status: ') + chalk.red('FAILED'));
        if (testResult.totalTests) {
          console.log(chalk.red('│') + ' ' + chalk.white('📊 Tests: ') + chalk.yellow(`${testResult.passedTests}/${testResult.totalTests} passed`));
          console.log(chalk.red('│') + ' ' + chalk.white('❌ Failures: ') + chalk.red(`${testResult.failures?.length || 0}`));
        } else if (testResult.error) {
          console.log(chalk.red('│') + ' ' + chalk.white('❌ Error: ') + chalk.red(testResult.error));
        }
        console.log(chalk.red('└─') + chalk.red('─'.repeat(45)));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail({
        text: chalk.red('❌ Test execution failed'),
        symbol: '✖'
      });
      console.log(chalk.red(`💥 Error: ${error.message}`));
    }
  });

program.command("generate-yaml")
  .description("📝 Generate intelligent YAML test cases")
  .action(async () => {
    console.log(chalk.yellow('┌─ ') + chalk.bold.white('YAML GENERATOR') + chalk.yellow(' ───────────────────'));
    console.log(chalk.yellow('│') + ' ' + chalk.cyan('📝 Creating intelligent test configurations...'));
    console.log(chalk.yellow('│') + ' ' + chalk.gray('🔍 Analyzing codebase structure...'));
    console.log(chalk.yellow('└─') + chalk.yellow('─'.repeat(45)));

    const analyzeSpinner = ora({
      text: chalk.blue('🔍 Scanning project structure...'),
      spinner: 'dots12',
      color: 'blue'
    }).start();

    const cwd = process.cwd();
    const fileTree = getProjectStructure(cwd);
    const sourceCode = getCriticalSourceCode(cwd);

    analyzeSpinner.succeed({
      text: chalk.green('📊 Analysis complete'),
      symbol: '✨'
    });

    const yamlSpinner = ora({
      text: chalk.magenta('🤖 AI generating YAML configurations...'),
      spinner: 'growHorizontal',
      color: 'magenta'
    }).start();

    const yamlPath = `${cwd}/vibe.yaml`;
    let currentYaml = "";
    if (fs.existsSync(yamlPath)) {
      currentYaml = fs.readFileSync(yamlPath, 'utf-8');
    }

    const yaml = await generateYaml([fileTree, sourceCode, currentYaml, ""]);
    fs.writeFileSync(yamlPath, yaml);

    yamlSpinner.succeed({
      text: chalk.green('✨ YAML test cases generated'),
      symbol: '📋'
    });

    console.log(chalk.green('┌─ ') + chalk.white('GENERATION SUMMARY') + chalk.green(' ───────────────'));
    console.log(chalk.green('│') + ' ' + chalk.white('📁 Output: ') + chalk.gray('vibe.yaml'));
    console.log(chalk.green('│') + ' ' + chalk.white('🧪 Test cases: ') + chalk.blue('Generated'));
    console.log(chalk.green('│') + ' ' + chalk.gray('💡 Ready for automated testing'));
    console.log(chalk.green('└─') + chalk.green('─'.repeat(45)));
  });

program.command("loop")
  .description("🔄 AI-powered iterative development loop")
  .argument('<string>', 'Custom prompt for AI generation')
  .option("-p", "Prompt mode")
  .action(async (prompt, options) => {
    console.log(chalk.cyan('┌─ ') + chalk.bold.white('AI LOOP MODE') + chalk.cyan(' ───────────────────'));
    console.log(chalk.cyan('│') + ' ' + chalk.blue('🔄 Initializing iterative development...'));
    console.log(chalk.cyan('│') + ' ' + chalk.yellow('🤖 AI agent ready for continuous improvement...'));
    console.log(chalk.cyan('└─') + chalk.cyan('─'.repeat(45)));

    if (prompt) {
      console.log(chalk.blue('┌─ ') + chalk.white('CUSTOM PROMPT') + chalk.blue(' ──────────────────────'));
      console.log(chalk.blue('│') + ' ' + chalk.gray(`📝 ${prompt}`));
      console.log(chalk.blue('└─') + chalk.blue('─'.repeat(45)));
    }

    const setupSpinner = ora({
      text: chalk.cyan('🚀 Setting up development environment...'),
      spinner: 'bouncingBall',
      color: 'cyan'
    }).start();

    try {
      const { browser, page } = await runPlaywright();
      setupSpinner.succeed({
        text: chalk.green('🌐 Environment ready'),
        symbol: '✨'
      });

      const testSpinner = ora({
        text: chalk.yellow('🧪 Running initial tests...'),
        spinner: 'flip',
        color: 'yellow'
      }).start();

      const testResult = await runTests(page);
      testSpinner.succeed({
        text: testResult.success ? chalk.green('✅ Tests passed') : chalk.yellow('⚠️  Tests need improvement'),
        symbol: testResult.success ? '🎉' : '🔄'
      });

      if (testResult.success && !prompt) {
        console.log(chalk.green('┌─ ') + chalk.white('LOOP STATUS') + chalk.green(' ──────────────────────'));
        console.log(chalk.green('│') + ' ' + chalk.white('🎉 All tests passed!'));
        console.log(chalk.green('│') + ' ' + chalk.gray('✨ No iterations needed'));
        console.log(chalk.green('└─') + chalk.green('─'.repeat(45)));
        process.exit(0);
      } else {
        const loopSpinner = ora({
          text: chalk.magenta('🤖 AI improvement loop starting...'),
          spinner: 'toggle8',
          color: 'magenta'
        }).start();

        if (prompt) {
          await loop(page, prompt);
        } else {
          await loop(page);
        }

        loopSpinner.succeed({
          text: chalk.green('🎯 Loop completed'),
          symbol: '✨'
        });
      }

      await browser.close();
    } catch (error) {
      setupSpinner.fail({
        text: chalk.red('❌ Loop initialization failed'),
        symbol: '✖'
      });
      console.log(chalk.red(`💥 Error: ${error.message}`));
    }
  });

// Show welcome banner and help when no arguments provided
if (process.argv.length <= 2) {
  console.log(banner);
  console.log(chalk.cyan.bold('📖 Getting Started:'));
  console.log(chalk.gray('  botintern scan') + chalk.dim('     • Scan codebase for errors'));
  console.log(chalk.gray('  botintern fix') + chalk.dim('      • Auto-fix detected errors'));
  console.log(chalk.gray('  botintern test') + chalk.dim('     • Run automated tests'));
  console.log(chalk.gray('  botintern generate-yaml') + chalk.dim(' • Generate test configurations'));
  console.log(chalk.gray('  botintern loop <prompt>') + chalk.dim(' • AI-powered iterative improvement'));
  console.log('');
  console.log(chalk.blue.bold('🤖 Need help?') + chalk.dim(' Run ' + chalk.gray('botintern --help')));
  console.log(chalk.dim('─'.repeat(67)));
  process.exit(0);
}

program.parse();