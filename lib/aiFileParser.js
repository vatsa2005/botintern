// lib/utils.js
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export function parseAiResponse(responseText) {
    // 1. Split by the "--- FILE:" marker
    // This regex looks for lines starting with "--- FILE:" and captures the filename
    const fileRegex = /--- FILE: (.*?) ---\n([\s\S]*?)(?=(--- FILE:|$))/g;

    const updates = [];
    let match;

    while ((match = fileRegex.exec(responseText)) !== null) {
        updates.push({
            filepath: match[1].trim(), // The captured filename
            content: match[2].trim()   // The captured code content
        });
    }

    // Validation: Check if response looks malformed
    if (updates.length === 0 && responseText.trim().length > 0) {
        // Check if response contains test output or other non-code content
        if (responseText.includes('PASSED:') || responseText.includes('FAILED:') ||
            responseText.includes('Running...') || responseText.includes('Test Execution')) {
            console.log(chalk.yellow('\n⚠️  AI returned test output instead of code fixes.'));
            console.log(chalk.dim('This usually means the AI misunderstood the task.'));
        } else {
            console.log(chalk.yellow('\n⚠️  AI response missing "--- FILE: path ---" markers.'));
            console.log(chalk.dim('Expected format: --- FILE: path/to/file.tsx ---'));
        }
        return null;
    }

    return updates;
}

export function applyFileUpdates(updates) {
    console.log(chalk.blue(`\n📦 Applying ${updates.length} file updates...`));

    for (const update of updates) {
        const fullPath = path.resolve(process.cwd(), update.filepath);

        // Ensure directory exists (AI might create a new file in a new folder)
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write the file
        fs.writeFileSync(fullPath, update.content);
        console.log(chalk.green(`   ✓ Updated: ${update.filepath}`));
    }
}