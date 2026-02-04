import { fix, fixBuild, generateYaml } from "./ai.js";
import { applyFileUpdates, parseAiResponse } from "./aiFileParser.js";
import { getCriticalSourceCode, getProjectStructure } from "./fileTreeParser.js";
import { runTests } from "./runTests.js";
import fs from "fs";
import chalk from "chalk";
import exec from "child_process";
import path from "path";
import { extractErrorFile } from "../utils/errorExtractor.js";
import ora from "ora";

async function loop(page, prompt = "") {
    const cwd = process.cwd();
    const fileTree = getProjectStructure(cwd); // fetches the file tree
    const sourceCode = getCriticalSourceCode(cwd);

    const yamlPath = `${cwd}/vibe.yaml`;
    let currentYaml = "";
    if (fs.existsSync(yamlPath)) {
        currentYaml = fs.readFileSync(yamlPath, 'utf-8');
    }


    if (prompt) {
        const spinner = ora(chalk.yellow('👀 Generating yaml test cases...')).start();
        const yaml = await generateYaml([fileTree, sourceCode, currentYaml, prompt]);
        fs.writeFileSync(yamlPath, yaml);
        spinner.succeed(chalk.green('✨ YAML generated successfully.'));
    }



    // Run tests first to see if there are any failures
    const spinner = ora(chalk.yellow('🧪 Running initial tests...')).start();
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
    });
    const testResult = await runTests(page);

    if (testResult.success) {
        console.log(chalk.green('✨ Tests passed!'));
        process.exit(0);
    } else {
        return loop(page);
    }

}

export { loop };
