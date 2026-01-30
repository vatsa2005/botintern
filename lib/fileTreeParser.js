import fs from 'fs';
import path from 'path';

// Files/Folders to strictly ignore (Performance & Security)
const IGNORE_LIST = new Set([
  'node_modules',
  '.git',
  '.next',          // Next.js build folder (HUGE)
  '.vscode',
  'dist',
  'build',
  'coverage',
  'public',         // Images/Assets (Binary data crashes token counts)
  'package-lock.json',
  'yarn.lock',
  'bun.lockb',
  'vibe-snapshot.png',
  'vibe.yaml'
]);

/**
 * Recursive function to generate a visual file tree.
 * Returns a string like:
 * ├── app
 * │   ├── page.tsx
 * │   └── layout.tsx
 * └── components
 * └── button.tsx
 */
export function getProjectStructure(dir, depth = 0) {
  if (depth > 4) return ''; // Stop recursion if too deep (safety)

  const files = fs.readdirSync(dir);
  let tree = '';

  files.forEach((file, index) => {
    if (IGNORE_LIST.has(file)) return;

    const fullPath = path.join(dir, file);
    const isLast = index === files.length - 1;
    const prefix = '  '.repeat(depth) + (isLast ? '└── ' : '├── ');

    try {
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        tree += `${prefix}${file}/\n`;
        tree += getProjectStructure(fullPath, depth + 1); // Recurse
      } else {
        // Only show relevant code files
        if (file.match(/\.(ts|tsx|js|jsx|css|json)$/)) {
          tree += `${prefix}${file}\n`;
        }
      }
    } catch (e) {
      // Ignore permission errors etc.
    }
  });

  return tree;
}

/**
 * Finds all source code files to send to Gemini as context.
 * WARNING: Use this carefully to avoid hitting token limits.
 */
// lib/files.js

export function getCriticalSourceCode(dir) {
  let context = "";

  function scan(currentDir) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      // ... ignore list check ...

      const fullPath = path.join(currentDir, file);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        scan(fullPath);
      } else {
        // FILTER: Only read code files
        if (file.match(/\.(tsx|ts|jsx|js|css)$/)) {
          // SAFETY: Skip files larger than 100KB to prevent lag
          if (stats.size > 100 * 1024) {
            context += `\n--- FILE: ${file} (Skipped: Too Large) ---\n`;
            continue;
          }

          const content = fs.readFileSync(fullPath, 'utf-8');
          context += `\n--- FILE: ${fullPath} ---\n${content}\n`;
        }
      }
    }
  }

  scan(dir);
  if (context.length > 400000) {
    console.warn("⚠️  Context too large! Truncating to prevent API Error...");
    return context.substring(0, 400000) + "\n...[TRUNCATED]";
  }
  return context;
}