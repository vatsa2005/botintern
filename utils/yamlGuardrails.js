import chalk from "chalk";
import fs from "fs";
import path from "path";

/**
 * Validates YAML structure and checks for common issues
 */
export function validateYamlStructure(yaml) {
  const requiredSections = ['meta', 'scenarios'];
  const lines = yaml.split('\n');
  
  // Check for invalid keys that should be preserved from original
  const invalidKeys = ['actions', 'assert_visible', 'assert_text', 'selector'];
  const foundInvalidKeys = [];
  
  for (const line of lines) {
    for (const key of invalidKeys) {
      if (line.includes(`${key}:`) || line.includes(`${key} `)) {
        foundInvalidKeys.push(key);
      }
    }
  }
  
  return {
    isValid: foundInvalidKeys.length === 0,
    invalidKeys: foundInvalidKeys,
    hasRequiredSections: requiredSections.some(section => yaml.includes(`${section}:`)),
    lineCount: lines.length
  };
}

/**
 * Creates a timestamped backup of the YAML file
 */
export function createBackup(filePath, content) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = filePath.replace('.yaml', `.backup.${timestamp}.yaml`);
  fs.writeFileSync(backupPath, content);
  return backupPath;
}

/**
 * Performs safe YAML update preserving working sections
 */
export function safeYamlUpdate(originalYaml, newYaml) {
  // Preserve meta section completely unless user specifically asks to change it
  const originalMeta = originalYaml.match(/meta:([\s\S]*?)(?=\n\w+:|$)/);
  const newMeta = newYaml.match(/meta:([\s\S]*?)(?=\n\w+:|$)/);
  
  let finalYaml = newYaml;
  
  // If original has meta and new doesn't have baseUrl changes, preserve original
  if (originalMeta && !newYaml.includes('baseUrl:')) {
    finalYaml = newYaml.replace(/meta:([\s\S]*?)(?=\n\w+:|$)/, originalMeta[0]);
  }
  
  return finalYaml;
}

/**
 * Calculates diff between original and new YAML to validate changes
 */
export function calculateYamlDiff(original, updated) {
  if (!original || !original.trim()) {
    return { 
      changes: updated ? ['Full file created'] : [],
      isMinimal: false,
      changePercentage: 100
    };
  }

  const originalLines = original.split('\n').filter(line => line.trim());
  const updatedLines = updated.split('\n').filter(line => line.trim());
  
  const unchanged = [];
  const modified = [];
  const added = [];
  const removed = [];
  
  // Simple diff analysis
  for (const line of updatedLines) {
    if (originalLines.includes(line)) {
      unchanged.push(line);
    } else {
      added.push(line);
    }
  }
  
  for (const line of originalLines) {
    if (!updatedLines.includes(line)) {
      removed.push(line);
    }
  }
  
  const totalLines = Math.max(originalLines.length, updatedLines.length);
  const changePercentage = totalLines > 0 ? ((added.length + removed.length) / totalLines) * 100 : 0;
  
  return {
    changes: [
      ...added.map(line => `+ ${line}`),
      ...removed.map(line => `- ${line}`)
    ],
    isMinimal: changePercentage < 50, // Consider minimal if less than 50% changed
    changePercentage,
    stats: {
      total: totalLines,
      unchanged: unchanged.length,
      added: added.length,
      removed: removed.length
    }
  };
}

/**
 * Validates that changes are minimal and necessary
 */
export function validateMinimalChanges(original, updated, userPrompt) {
  const diff = calculateYamlDiff(original, updated);
  
  // If user provided specific prompt, allow more changes
  const maxChangePercentage = userPrompt && userPrompt.trim() ? 75 : 30;
  
  return {
    isValid: diff.isMinimal || diff.changePercentage <= maxChangePercentage,
    diff,
    recommendation: diff.changePercentage > maxChangePercentage 
      ? `🚨 Large change detected: ${diff.changePercentage.toFixed(1)}% modified. Consider more targeted edits.`
      : `✅ Minimal changes: ${diff.changePercentage.toFixed(1)}% modified.`
  };
}