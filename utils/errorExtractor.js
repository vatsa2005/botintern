// lib/utils.js
import path from 'path';

/**
 * Removes weird terminal colors (ANSI codes) so Regex works
 */
function stripAnsi(string) {
    return string.replace(
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        ''
    );
}

/**
 * Hunts through the logs to find the first broken file.
 * Returns null if no file is found.
 */
export function extractErrorFile(logs) {
    const cleanLogs = stripAnsi(logs);

    // REGEX: Looks for paths starting with ./ followed by common folders
    // Captures: ./app/page.tsx, ./src/components/Button.tsx, etc.
    const regex = /(\.\/(?:app|src|components|pages|lib)\/[a-zA-Z0-9_\-\/]+\.(tsx|ts|jsx|js))/i;

    const match = cleanLogs.match(regex);

    if (match && match[1]) {
        // Return the clean relative path (e.g., "./app/page.tsx")
        return match[1];
    }

    return null;
}