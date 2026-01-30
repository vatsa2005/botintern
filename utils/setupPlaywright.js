import exec from "child_process";
import ora from "ora";
import chalk from "chalk";

function setupPlaywright() {
    const spinner = ora(chalk.green('Installing @playwright/test...')).start();
    exec.exec("npm i playwright", function (error, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        if (error) {
            spinner.fail(chalk.red('Installing @playwright/test...'));
            console.error(error);
        } else {
            spinner.succeed(chalk.green('Installing @playwright/test...'));
        }
    });
    exec.exec("npx playwright install", function (error, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        if (error) {
            spinner.fail(chalk.red('Installing playwright...'));
            console.error(error);
        } else {
            spinner.succeed(chalk.green('Installing playwright...'));
        }
    });
}

export { setupPlaywright };
