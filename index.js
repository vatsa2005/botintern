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
import { setupPlaywright } from "./utils/setupPlaywright.js";
import { getCriticalSourceCode, getProjectStructure } from "./lib/fileTreeParser.js";
import { runTests } from "./lib/runTests.js";
import { runPlaywright } from "./lib/runPlaywright.js";
import { loop } from "./lib/loop.js";

const program = new Command();

program
  .name('botintern')
  .description('CLI to check errors in vibecoded codebases. The only intern that fixes more bugs than it creates.')
  .version('0.0.0');

program.command('scan')
  .description('Scan a codebase for errors')
  .action(() => {
    console.log(chalk.green('🌊 Vibe Guard Initialized...'));
    console.log(chalk.yellow('👀 Looking for Hallucinations...'));
    const spinner = ora(chalk.yellow('👀 Looking for Hallucinations (Running build)...')).start();
    exec.exec("npm run build", function (error, stdout, stderr) {
      if (error) {
        spinner.fail(chalk.red('Build Failed! Hallucinations detected.'));
        console.log('');
        console.log(chalk.dim('--- Error Logs ---'));
        console.log(stdout);
        console.log(stderr);

      } else {
        spinner.succeed(chalk.green('Build Passed! No errors found.'));
      }
    })
  });


program.command('fix')
  .description('Fix errors in a codebase')
  .action(() => {
    console.log(chalk.green('🌊 Vibe Guard Initialized...'));
    const spinner = ora(chalk.yellow('👀 Looking for Hallucinations (Running build)...')).start();
    exec.exec("npm run build", async function (error, stdout, stderr) {
      if (error) {
        spinner.fail(chalk.red('Build Failed! Hallucinations detected.'));
        console.log('');
        console.log(chalk.dim('--- Error Logs ---'));
        console.log(stdout);
        console.log(stderr);


        // Extract the contents of tht particular page.tsx and package.json and pass it to the function.
        const combinedLogs = stdout + "\n" + stderr;
        let brokenFilePath = extractErrorFile(combinedLogs);

        if (!brokenFilePath) {
          console.log(chalk.yellow("⚠️  Could not find file in logs. Defaulting to 'app/page.tsx'"));
          brokenFilePath = "app/page.tsx";
        } else {
          console.log(chalk.blue(`🎯 Targeted Broken File: ${brokenFilePath}`));
        }

        try {
          // Ensure we handle relative paths correctly
          const absolutePath = path.resolve(process.cwd(), brokenFilePath);

          if (fs.existsSync(absolutePath)) {
            const pageContent = fs.readFileSync(absolutePath, "utf-8");
            const packageContent = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8");

            const finalCode = await fixBuild([combinedLogs, pageContent, packageContent]);
            console.log(finalCode);
            fs.writeFileSync(absolutePath, finalCode);

          } else {
            console.log(chalk.red(`❌ The file ${brokenFilePath} does not exist.`));
          }
        } catch (err) {
          console.log(chalk.red(`Error reading files: ${err.message}`));
        }

      } else {
        spinner.succeed(chalk.green('Build Passed! No errors found.'));
      }
    })

  });



program.command("test")
  .description("Run the playwright tests")
  .action(async () => {
    // Check if playwright is installed
    const pkgJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
    // if (pkgJson.dependencies["@playwright/test"] || pkgJson.devDependencies["@playwright/test"]) {
    //   console.log(chalk.green('Playwright is already installed'));
    // } else {
    //   setupPlaywright();
    // }

    console.log(chalk.green('🌊 Vibe Guard Initialized...'));
    // const spinner = ora(chalk.yellow('👀 Looking for Hallucinations (Running playwright tests)...')).start();
    // exec.exec("npx playwright test", function (error, stdout, stderr) {
    //   if (error) {
    //     spinner.fail(chalk.red('Build Failed! Hallucinations detected.'));
    //     console.log('');
    //     console.log(chalk.dim('--- Error Logs ---'));
    //     console.log(stdout);
    //     console.log(stderr);
    //   } else {
    //     spinner.succeed(chalk.green('Build Passed! No errors found.'));
    //   }
    // })
    const { browser, page } = await runPlaywright();
    await runTests(page);

    await browser.close();
  });

program.command("generate-yaml")
  .description("Generate yaml tests for the codebase")
  .action(async () => {
    console.log(chalk.green('🌊 Vibe Guard Initialized...'));
    const spinner = ora(chalk.yellow('👀 Generating yaml test cases...')).start();
    const cwd = process.cwd();
    const fileTree = getProjectStructure(cwd); // fetches the file tree
    const sourceCode = getCriticalSourceCode(cwd);

    let currentYaml = "";
    if (fs.existsSync('vibe.yaml')) {
      currentYaml = fs.readFileSync('vibe.yaml', 'utf-8');
    }

    const yaml = await generateYaml([fileTree, sourceCode, currentYaml, ""]);
    fs.writeFileSync('vibe.yaml', yaml);
    spinner.succeed(chalk.green('✨ YAML generated successfully.'));
  });

program.command("loop")
  .description("Loops the agentic work for you till the tests complete")
  .argument('<string>', 'Your own prompt to generate new things and yaml tescases')
  .option("-p")
  .action(async (prompt, options) => {
    const { browser, page } = await runPlaywright();
    const testResult = await runTests(page);

    if (testResult.success && !prompt) {
      console.log(chalk.green('✨ Tests passed!'));
      process.exit(0);
    } else {
      if (prompt) {
        await loop(page, prompt);
      } else {
        await loop(page);
      }
    }
  });

program.parse();