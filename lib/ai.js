import dotenv from "dotenv";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import { validateYamlStructure, createBackup, safeYamlUpdate, validateMinimalChanges } from "../utils/yamlGuardrails.js";
import { getApiKey } from "./registerAndFetchKey.js";

const envDir = path.join(process.cwd(), ".env");

const model = "gemini-3-pro-preview";

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
       - color: 'colorValue on Element' (checks text color)
       - background: 'colorValue on Element' (checks background color)
       - border-color: 'colorValue on Element' (checks border color)
    
    🎨 COLOR TESTING SYNTAX (CRITICAL YAML RULES):
    
    🚨 YAML SYNTAX RULE: The word "on" is a YAML boolean keyword!
    You MUST quote the ENTIRE color value as a SINGLE STRING to avoid parsing errors.
    
    ✅ CORRECT SYNTAX (quote entire value):
    - color: 'white on Submit Button'
    - color: '#1f2937 on Heading'
    - color: 'rgb(107, 114, 128) on Description'
    - background: '#3b82f6 on Primary Button'
    - background: 'red on Error Alert'
    - background: 'rgb(229, 231, 235) on Card'
    - border-color: '#ef4444 on Error Input'
    - border-color: 'blue on Focus Ring'
    
    ❌ WRONG SYNTAX (will cause YAML parsing errors):
    - color: "white" on "Submit Button"  # ERROR: 'on' interpreted as boolean
    - color: white on Submit Button      # ERROR: unquoted values
    - color: "#fff" on "Button"          # ERROR: split quotes
    
    📋 COLOR FORMATS (all must be in single quotes with element):
    - Named colors: 'red on Error', 'blue on Link', 'white on Button'
    - Hex colors: '#ff0000 on Alert', '#3b82f6 on Primary', '#f00 on Icon'
    - RGB colors: 'rgb(255, 0, 0) on Text', 'rgb(59, 130, 246) on Background'
    
    When to add color tests:
    - Brand colors on primary elements (buttons, headers, logos)
    - Error/success states (red errors, green success)
    - Accessibility (ensure sufficient contrast)
    - Dark mode validation
    
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
          - color: '#1f2937 on Welcome Back'  # NEW - add color validation (SINGLE QUOTES!)
          - click: "Sign In"        # Updated to new syntax
          - background: '#3b82f6 on Sign In'  # NEW - validate button color (SINGLE QUOTES!)
          - url: "/dashboard"       # NEW - add if missing
    
    --- EXAMPLE WITH COLOR TESTS ---
    When generating tests for visual elements, include color validation:
    
    scenarios:
      - name: "Button Colors"
        path: "/"
        tests:
          - see: "Get Started"
          - color: 'white on Get Started'
          - background: '#3b82f6 on Get Started'
          - click: "Get Started"
      
      - name: "Error States"
        path: "/form"
        tests:
          - click: "Submit"
          - see: "Error"
          - color: 'red on Error'
          - border-color: '#ef4444 on Email Input'

    --- YAML FORMATTING RULES (CRITICAL) ---
    
    🚨 STRICT YAML SYNTAX REQUIREMENTS:
    
    1. **Indentation:** Use 2 spaces (NOT tabs) for each level
       - scenarios: (0 spaces)
       -   - name: (2 spaces)
       -     path: (4 spaces)
       -     tests: (4 spaces)
       -       - see: (6 spaces)
    
    2. **List Items:** Always use "- " (dash + space)
       ✅ CORRECT: - see: "Text"
       ❌ WRONG: -see: "Text" (no space)
       ❌ WRONG:  - see: "Text" (extra space before dash)
    
    3. **Quotes:** Use double quotes for regular values, single quotes for color values
       ✅ CORRECT: - see: "Button"
       ✅ CORRECT: - color: 'red on Button'
       ❌ WRONG: - see: Button (unquoted)
    
    4. **Colons:** Always add space after colon
       ✅ CORRECT: name: "Test"
       ❌ WRONG: name:"Test"
    
    5. **Multi-line values:** Use proper YAML syntax
       For "type X into Y" syntax:
       - type: "Value"
         into: "Label"
       (Note: "into" is indented 2 spaces from "type")
    
    6. **No trailing spaces or tabs**
    
    7. **Consistent spacing:** Maintain same indentation throughout file
    
    VALIDATION CHECKLIST before outputting:
    ☐ All list items start with "- " at correct indentation
    ☐ All color values use single quotes: 'value on element'
    ☐ All other string values use double quotes
    ☐ Consistent 2-space indentation throughout
    ☐ No tabs, only spaces
    ☐ Space after every colon
    ☐ Multi-line "type/into" syntax properly indented

    --- FINAL INSTRUCTION ---
    Output COMPLETE YAML but with MINIMAL, TARGETED changes only.
    Preserve all working functionality.
    VERIFY YAML syntax is correct before outputting.
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

async function fixTestFailures(context) {
  const [testFailures, yamlContent, sourceCode, fileTree, packageJSON] = context;

  const spinner = ora(chalk.yellow('🤖 AI analyzing test failures...')).start();

  // Format test failures for better readability
  const formattedFailures = testFailures.map((failure, idx) => {
    return `
    FAILURE #${idx + 1}:
    - Scenario: ${failure.scenario}
    - Action: ${JSON.stringify(failure.action)}
    - Error: ${failure.error}
    `;
  }).join('\n');

  const prompt = `
    ROLE: You are a Senior Full-Stack Engineer (BotIntern) specializing in test-driven development.
    TASK: Fix the code to make ALL failing tests pass.
    
    🚨 CRITICAL CONTEXT 🚨
    You have ${testFailures.length} FAILING TEST(S). Your job is to analyze WHY they failed and fix the code accordingly.
    
    --- TEST FAILURES ---
    ${formattedFailures}
    
    --- TEST EXPECTATIONS (vibe.yaml) ---
    ${yamlContent}
    
    The YAML above defines what the tests EXPECT to see/do. Your fixes must make the actual code match these expectations.
    
    --- CURRENT SOURCE CODE ---
    ${sourceCode}
    
    --- PROJECT STRUCTURE ---
    ${fileTree}
    
    --- INSTALLED PACKAGES (package.json) ---
    ${packageJSON}
    
    🎯 ANALYSIS STRATEGY:
    1. For each test failure, identify WHAT the test expected (from YAML)
    2. Understand WHY it failed (from error message)
    3. Determine WHICH file(s) need changes
    4. Make MINIMAL, TARGETED fixes to satisfy the test expectations
    
    📋 COMMON FAILURE PATTERNS & FIXES:
    
    **Pattern 1: "Text not found"**
    - Test expects to see specific text (e.g., "Dashboard", "Total Tests")
    - Fix: Add or correct the text in the relevant component
    
    **Pattern 2: "Element not found" / "Click failed"**
    - Test expects a clickable element with specific text
    - Fix: Add the button/link with exact text, ensure it's visible
    
    **Pattern 3: "Input not found"**
    - Test expects input with specific label or placeholder
    - Fix: Add proper label or placeholder attribute to input
    
    **Pattern 4: "Navigation failed" / "URL mismatch"**
    - Test expects navigation to specific path
    - Fix: Add proper routing or onClick navigation
    
    **Pattern 5: "Timeout" / "Element not visible"**
    - Element exists but not rendered/visible
    - Fix: Check conditional rendering, CSS display/visibility
    
    🔧 CRITICAL OUTPUT FORMAT RULES:
    You MUST return files using this EXACT format:
    
    --- FILE: path/to/file.tsx ---
    [complete fixed file content here]
    
    --- FILE: path/to/another-file.tsx ---
    [complete fixed file content here]
    
    📐 CRITICAL RULES:
    1. **Completeness:** Return the FULL file content. Do not truncate. Do not use placeholders like "// ... rest of code".
    2. **Hallucinations:** Do NOT import packages that are not in package.json (unless they are built-in Node/React modules).
    3. **Multi-File Fixes:** If multiple files need changes, include ALL of them with separate --- FILE: markers.
    4. **NO MARKDOWN:** Do NOT use markdown code blocks (\`\`\`). Do NOT add explanations.
    5. **NO TEST OUTPUT:** Do NOT include test results or any other text. ONLY file content with --- FILE: headers.
    6. **File Markers Required:** Every file MUST start with "--- FILE: path ---" on its own line.
    7. **Exact Text Matching:** If test expects "Total Tests", use EXACTLY "Total Tests" (case-sensitive, spacing matters).
    8. **Preserve Working Code:** Only change what's necessary to fix the failing tests.
    
    EXAMPLE CORRECT OUTPUT:
    --- FILE: app/page.tsx ---
    import React from 'react';
    
    export default function Page() {
      return (
        <div>
          <h1>Dashboard</h1>
          <button>Run Tests</button>
        </div>
      );
    }
    
    --- FILE: components/stats.tsx ---
    export function Stats() {
      return <div>Total Tests: 10</div>;
    }
    
    NOW FIX THE CODE TO MAKE ALL TESTS PASS:
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

    spinner.succeed(chalk.green('✨ Test-driven fixes generated.'));
    return rawText;

  } catch (e) {
    console.error(e);
    spinner.fail(chalk.red('Test-driven fix generation failed!'));
    throw e;
  }
}

export { fixBuild, generateYaml, fix, fixTestFailures };

