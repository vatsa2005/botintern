import dotenv from "dotenv";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import { validateYamlStructure, createBackup, safeYamlUpdate, validateMinimalChanges } from "../utils/yamlGuardrails.js";
import { getApiKey } from "./registerAndFetchKey.js";

const envDir = path.join(process.cwd(), ".env");

const model = "gemini-3-flash-preview";

dotenv.config({ path: envDir });


function cleanCode(text) {
  // Remove markdown blocks (```tsx ... ```)
  let clean = text.replace(/```[a-z]*\n/g, '').replace(/```/g, '');
  // Remove any "Here is the code:" prefixes the AI might add
  clean = clean.replace(/^Here is the .*? code:?/i, '');
  return clean.trim();
}

function cleanYaml(text) {
  // Removes ```yaml at the start
  let clean = text.replace(/```yaml\s*/g, '');
  // Removes ``` at the end
  clean = clean.replace(/```\s*$/g, '');
  // Removes any leading/trailing whitespace
  return clean.trim();
}



function getApiKeyOrThrow() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(chalk.red('\n❌ Error: GEMINI_API_KEY not found.'));
    console.error(chalk.yellow('👉 Please run: botintern login'));
    console.error(chalk.yellow('   Or create a .env file with: GEMINI_API_KEY=AIzaSy...'));
    console.error(chalk.dim('   (Get one for free at https://aistudio.google.com/)\n'));
    process.exit(1);
  }
  return apiKey;
}

function createAIClient() {
  const apiKey = getApiKeyOrThrow();
  return new GoogleGenAI({ apiKey });
}

async function fixBuild(context) {
  const [err, sourceCode, packageJSON] = context;



  const prompt = `
    ROLE: You are a Senior React Engineer (BotIntern).
    TASK: Fix the code below to resolve the build error.
    
    INPUTS:
    1. SOURCE CODE:
    ${sourceCode}
    
    2. ERROR LOG:
    ${err}
    
    3. INSTALLED PACKAGES (package.json):
    ${packageJSON}

    CRITICAL RULES:
    1. **Completeness:** Return the FULL file content. Do not truncate. Do not use placeholders like "// ... rest of code".
    2. **Hallucinations:** Do NOT import packages that are not in package.json (unless they are built-in Node/React modules).
    3. **The Fix:** If an import is missing/broken, remove it or replace it with a valid alternative from package.json.
    4. **Output:** Return ONLY the code. No explanations. No markdown backticks.
    `;



  const spinner = ora(chalk.yellow('Fixing the errors...')).start();

  try {
    const ai = createAIClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    console.log("Raw txt");
    console.log(response.text);
    const rawText = response.text;
    const finalCode = cleanCode(rawText);
    console.log(finalCode);
    if (!finalCode.includes('import') && !finalCode.includes('export')) {
      spinner.warn(chalk.yellow('Warning: The AI output looks suspicious (no imports/exports found).'));
    }
    spinner.succeed(chalk.green('✨ Code fixed and cleaned.'));
    return finalCode;

    // spinner.succeed(chalk.green('Build Passed! No errors found.'));
  } catch (e) {
    console.error(e);
    spinner.fail(chalk.red('Build Failed! Hallucinations detected.'));
  }
}



async function generateYaml(context) {
  const [fileTree, sourceCode, yaml, userPrompt] = context;

  const prompt = `
    ROLE: You are a QA Architect (BotIntern) with PRECISION EDITING capabilities.
    TASK: Make MINIMAL, ACCURATE changes to the YAML test plan. DO NOT RESTRUCTURE UNNECESSARILY.
    
    🚨 CRITICAL GUARDRAILS 🚨
    1. PRESERVE existing working scenarios - ONLY modify what's broken or requested
    2. DO NOT change meta section unless explicitly requested by user
    3. DO NOT restructure the entire file - make targeted edits only
    4. MINIMAL CHANGES PRINCIPLE: If a test case works, DO NOT touch it
    
    --- PRECISION EDITING RULES ---
    1. ANALYZE what's already working and preserve it
    2. ONLY modify scenarios that are failing or user-specified
    3. Use NEW syntax for any NEW or MODIFIED content:
       - see: "Text" (instead of assert_visible/text)
       - click: "Text" (instead of type: click)  
       - type: "Value" into: "Label" (instead of type: type)
       - url: "/path" (checks navigation)
       - network: "METHOD URL" (checks API)
    
    --- INPUTS ---
    1. SOURCE CODE ANALYSIS:
    ${sourceCode}
    
    2. EXISTING YAML (PRESERVE WHAT WORKS):
    ${yaml || "No existing plan - generate minimal tests only for core functionality"}
    
    3. USER REQUEST (REQUIREMENT):
    ${userPrompt || "Make minimal changes to ensure tests pass"}

    --- EDITING STRATEGY ---
    1. If existing YAML works → ONLY fix syntax issues, preserve structure
    2. If user requests changes → Apply ONLY to requested sections
    3. If tests are failing → Update ONLY failing test cases
    4. Output FULL YAML but with MINIMAL changes from original
    
    --- EXAMPLE OF PRECISION EDITING ---
    If user says "fix login test", change ONLY the login scenario:
    
    scenarios:
      - name: "Login Flow"        # KEEP this name
        path: "/login"              # KEEP this path  
        tests:                      # UPDATE ONLY this section
          - see: "Welcome Back"     # Updated to new syntax
          - click: "Sign In"        # Updated to new syntax
          - url: "/dashboard"       # NEW - add if missing

    --- FINAL INSTRUCTION ---
    Output COMPLETE YAML but with MINIMAL, TARGETED changes only.
    Preserve all working functionality.
  `;

  const spinner = ora(chalk.yellow('🔍 Analyzing YAML changes...')).start();

  try {
    // Create backup if original exists
    if (yaml && yaml.trim()) {
      const backupPath = createBackup('vibe.yaml', yaml);
      spinner.text = chalk.blue(`📋 Backup created: ${path.basename(backupPath)}`);
    }

    const ai = createAIClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    const rawText = response.text;
    let finalYaml = cleanYaml(rawText);

    // Validate the generated YAML structure
    const validation = validateYamlStructure(finalYaml);

    if (!validation.isValid) {
      spinner.warn(chalk.yellow(`⚠️  Invalid syntax detected: ${validation.invalidKeys.join(', ')}`));
      // Apply safe updates to preserve working parts
      if (yaml) {
        finalYaml = safeYamlUpdate(yaml, finalYaml);
      }
    }

    // Validate minimal changes if original exists
    if (yaml && yaml.trim()) {
      const changeValidation = validateMinimalChanges(yaml, finalYaml, userPrompt);

      if (!changeValidation.isValid) {
        spinner.warn(chalk.yellow(changeValidation.recommendation));
        console.log(chalk.yellow('📊 Change Summary:'));
        console.log(chalk.gray(`   Total lines: ${changeValidation.diff.stats.total}`));
        console.log(chalk.gray(`   Changed: ${changeValidation.diff.stats.added + changeValidation.diff.stats.removed}`));
        console.log(chalk.gray(`   Change percentage: ${changeValidation.diff.changePercentage.toFixed(1)}%`));
      } else {
        spinner.succeed(chalk.green(changeValidation.recommendation));
      }
    }

    // Final validation check
    if (finalYaml.length === 0) {
      throw new Error('Generated YAML is empty');
    }

    spinner.succeed(chalk.green('✅ YAML updated with precision guardrails'));
    return finalYaml;

  } catch (e) {
    console.error(e);
    spinner.fail(chalk.red('❌ YAML generation failed'));
    throw e;
  }
}

async function fix(context) {
  const [err, sourceCode, packageJSON, userPrompt] = context;
  const spinner = ora(chalk.yellow('Fixing the errors...')).start();
  const prompt = `
    ROLE: You are a Senior React Engineer (BotIntern).
    TASK: Fix the code below to resolve the build error.
    
    INPUTS:
    1. SOURCE CODE:
    ${sourceCode}
    
    2. ERROR LOG:
    ${err}
    
    3. INSTALLED PACKAGES (package.json):
    ${packageJSON}

    CRITICAL OUTPUT FORMAT RULES:
    You MUST return files using this EXACT format:
    
    --- FILE: path/to/file.tsx ---
    [complete fixed file content here]
    
    --- FILE: path/to/another-file.tsx ---
    [complete fixed file content here]

    CRITICAL RULES:
    1. **Completeness:** Return the FULL file content. Do not truncate. Do not use placeholders like "// ... rest of code".
    2. **Hallucinations:** Do NOT import packages that are not in package.json (unless they are built-in Node/React modules).
    3. **The Fix:** If an import is missing/broken, remove it or replace it with a valid alternative from package.json.
    4. **NO MARKDOWN:** Do NOT use markdown code blocks (\`\`\`). Do NOT add explanations.
    5. **NO TEST OUTPUT:** Do NOT include test results or any other text. ONLY file content with --- FILE: headers.
    6. **File Markers Required:** Every file MUST start with "--- FILE: path ---" on its own line.

    EXAMPLE CORRECT OUTPUT:
    --- FILE: app/page.tsx ---
    import React from 'react';
    
    export default function Page() {
      return <div>Fixed</div>;
    }

    ${userPrompt ? `USER REQUEST: ${userPrompt}` : ''}
    
    NOW FIX THE CODE USING THE EXACT FORMAT ABOVE:
    `;


  try {
    const ai = createAIClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    const rawText = response.text;

    // Validate response format
    if (!rawText.includes('--- FILE:')) {
      spinner.warn(chalk.yellow('⚠️  AI response missing file markers. Response may be malformed.'));
      console.log(chalk.dim('Response preview:'), rawText.substring(0, 200) + '...');
    }

    spinner.succeed(chalk.green('✨ Code fixes generated.'));
    return rawText;

  } catch (e) {
    console.error(e);
    spinner.fail(chalk.red('Code fix generation failed!'));
    throw e; // Re-throw to handle upstream
  }
}

export { fixBuild, generateYaml, fix };

