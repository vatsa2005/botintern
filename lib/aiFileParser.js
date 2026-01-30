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

    // Fallback: If no headers found, assume it's a single file fix (and try to guess path or return error)
    if (updates.length === 0 && responseText.trim().length > 0) {
        // You might want to pass the original filename in context to default to it here
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