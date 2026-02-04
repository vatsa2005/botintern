import { fix, fixBuild, generateYaml, fixTestFailures } from "./ai.js";
import { applyFileUpdates, parseAiResponse } from "./aiFileParser.js";
import { getCriticalSourceCode, getProjectStructure } from "./fileTreeParser.js";
import { runTests } from "./runTests.js";
import fs from "fs";
import chalk from "chalk";
import exec from "child_process";
import path from "path";
import { extractErrorFile } from "../utils/errorExtractor.js";
import ora from "ora";

async function loop(page, prompt = "", iteration = 1, maxIterations = 5) {
    const cwd = process.cwd();

    // Check iteration limit
    if (iteration > maxIterations) {
        console.log(chalk.yellow(`⚠️  Maximum iterations (${maxIterations}) reached. Stopping loop.`));
        console.log(chalk.dim('💡 Consider reviewing the test cases or code manually.'));
        process.exit(1);
    }

    console.log(chalk.cyan(`\n🔄 Loop Iteration ${iteration}/${maxIterations}`));

    const fileTree = getProjectStructure(cwd);
    const sourceCode = getCriticalSourceCode(cwd);

    const yamlPath = `${cwd}/vibe.yaml`;
    let currentYaml = "";
    if (fs.existsSync(yamlPath)) {
        currentYaml = fs.readFileSync(yamlPath, 'utf-8');
    }

    // Generate YAML if prompt is provided (only on first iteration)
    if (prompt && iteration === 1) {
        const yamlSpinner = ora(chalk.yellow('👀 Generating yaml test cases...')).start();
        try {
            const yaml = await generateYaml([fileTree, sourceCode, currentYaml, prompt]);
            fs.writeFileSync(yamlPath, yaml);
            yamlSpinner.succeed(chalk.green('✨ YAML generated successfully.'));
        } catch (err) {
            yamlSpinner.fail(chalk.red('❌ YAML generation failed.'));
            console.log(chalk.red(`Error: ${err.message}`));
            process.exit(1);
        }
    }

    // Run build process with proper promise handling
    const buildSpinner = ora(chalk.yellow('🔨 Building project...')).start();

    const buildResult = await new Promise((resolve) => {
        exec.exec("npm run build", async function (error, stdout, stderr) {
            if (error) {
                buildSpinner.fail(chalk.red('Build Failed! Errors detected.'));
                console.log('');
                console.log(chalk.dim('--- Error Logs ---'));
                console.log(stdout);
                console.log(stderr);

                const combinedLogs = stdout + "\n" + stderr;
                let brokenFilePath = extractErrorFile(combinedLogs);

                if (!brokenFilePath) {
                    console.log(chalk.yellow("⚠️  Could not find file in logs. Defaulting to 'app/page.tsx'"));
                    brokenFilePath = "app/page.tsx";
                } else {
                    console.log(chalk.blue(`🎯 Targeted Broken File: ${brokenFilePath}`));
                }

                try {
                    const absolutePath = path.resolve(process.cwd(), brokenFilePath);

                    if (fs.existsSync(absolutePath)) {
                        const fixSpinner = ora(chalk.cyan('🤖 AI fixing the code...')).start();
                        const pageContent = fs.readFileSync(absolutePath, "utf-8");
                        const packageContent = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8");

                        const finalCode = await fixBuild([combinedLogs, pageContent, packageContent]);
                        fs.writeFileSync(absolutePath, finalCode);
                        fixSpinner.succeed(chalk.green('✨ Code fixed and saved.'));
                        resolve({ success: false, fixed: true });
                    } else {
                        console.log(chalk.red(`❌ The file ${brokenFilePath} does not exist.`));
                        resolve({ success: false, fixed: false });
                    }
                } catch (err) {
                    console.log(chalk.red(`Error fixing files: ${err.message}`));
                    resolve({ success: false, fixed: false });
                }
            } else {
                buildSpinner.succeed(chalk.green('✅ Build Passed!'));
                resolve({ success: true });
            }
        });
    });

    // If build failed and couldn't be fixed, exit
    if (!buildResult.success && !buildResult.fixed) {
        console.log(chalk.red('❌ Build failed and could not be automatically fixed.'));
        process.exit(1);
    }

    // If build was just fixed, retry the loop
    if (buildResult.fixed) {
        console.log(chalk.blue('🔄 Retrying with fixed code...'));
        return loop(page, "", iteration + 1, maxIterations);
    }

    // Run tests
    const testSpinner = ora(chalk.yellow('🧪 Running tests...')).start();
    const testResult = await runTests(page);
    testSpinner.stop();

    if (testResult.success) {
        console.log(chalk.green.bold('\n✨ All tests passed! Loop completed successfully.'));
        process.exit(0);
    } else {
        console.log(chalk.yellow(`\n⚠️  Tests failed. Attempting to fix... (${testResult.failures?.length || 0} failures)`));

        // Gather comprehensive context for AI to fix test failures
        const yamlPath = `${cwd}/vibe.yaml`;
        const yamlContent = fs.existsSync(yamlPath) ? fs.readFileSync(yamlPath, 'utf-8') : '';
        const packageJsonPath = path.join(cwd, 'package.json');
        const packageJSON = fs.existsSync(packageJsonPath) ? fs.readFileSync(packageJsonPath, 'utf-8') : '{}';

        try {
            const fixSpinner = ora(chalk.cyan('🔧 Generating test-driven fixes...')).start();

            // Call AI with comprehensive context
            const aiResponse = await fixTestFailures([
                testResult.failures,
                yamlContent,
                sourceCode,
                fileTree,
                packageJSON
            ]);

            fixSpinner.succeed(chalk.green('✅ Fix suggestions generated'));

            // Parse and apply the fixes
            const parseSpinner = ora(chalk.blue('📝 Parsing AI response...')).start();
            const updates = parseAiResponse(aiResponse);

            if (!updates || updates.length === 0) {
                parseSpinner.fail(chalk.red('❌ No valid file updates found in AI response'));
                console.log(chalk.yellow('💡 The AI may have misunderstood. Retrying...'));
                return loop(page, "", iteration + 1, maxIterations);
            }

            parseSpinner.succeed(chalk.green(`✅ Found ${updates.length} file(s) to update`));

            // Apply the file updates
            applyFileUpdates(updates);
            console.log(chalk.green('✨ Fixes applied successfully!'));

            // Retry the loop with fixed code
            console.log(chalk.blue('🔄 Retrying tests with fixed code...'));
            return loop(page, "", iteration + 1, maxIterations);

        } catch (err) {
            console.log(chalk.red(`❌ Error during test-driven fix: ${err.message}`));
            console.log(chalk.yellow('💡 Retrying anyway...'));
            return loop(page, "", iteration + 1, maxIterations);
        }
    }
}

export { loop };
