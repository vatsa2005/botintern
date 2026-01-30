// NOT USED ANYWHERE YET. NEEDS MORE REFINEMENT.

import chalk from "chalk";
import exec from "child_process";
import ora from "ora";
import { stdout } from "process";

async function scanBuildErrors() {
    console.log(chalk.green('🌊 Vibe Guard Initialized...'));

    // Start the spinner (The event loop needs to be free for this to spin!)
    const spinner = ora(chalk.yellow('👀 Looking for Hallucinations (Running build)...')).start();
    let result = ""

    try {
        // We use 'await' here. This allows the spinner to keep spinning
        // while the build runs in the background.
        const { stdout, stderr } = exec.exec("npm run build", {
            encoding: 'utf8',
            maxBuffer: 50 * 1024 * 1024
        });

        // If we get here, the exit code was 0 (Success)
        spinner.succeed(chalk.green('Build Passed! No errors found.'));
        result = stdout + "\n" + stderr;
        return result;

    } catch (error) {
        // If 'npm run build' fails (exit code 1), it throws an error.
        // We catch it here.
        spinner.fail(chalk.red('Build Failed! Hallucinations detected.'));

        console.log('');
        console.log(chalk.dim('--- Error Logs ---'));

        // In the catch block, the output is inside error.stdout / error.stderr
        const logs = (error.stdout || "") + "\n" + (error.stderr || "");
        console.log(error);
        // result = stdout + "\n" + stderr;
        return logs;
    }

    // function (error, stdout, stderr) {
    //     if (error) {
    //         spinner.fail(chalk.red('Build Failed! Hallucinations detected.'));
    //         console.log('');
    //         console.log(chalk.dim('--- Error Logs ---'));
    //         console.log(stdout);
    //         console.log(stderr);
    //         return stdout + "\n" + stderr;
    //     } else {
    //         spinner.succeed(chalk.green('Build Passed! No errors found.'));
    //         return "";
    //     }
    // }
}

export { scanBuildErrors };