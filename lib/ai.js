import dotenv from "dotenv";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import chalk from "chalk";
import ora from "ora";

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



const apiKey = process.env.API_KEY;


if (!apiKey) {
  console.error(chalk.red('\n❌ Error: GEMINI_API_KEY not found in your .env file.'));
  console.error(chalk.yellow('👉 Please create a .env file in this folder and add: GEMINI_API_KEY=AIzaSy...'));
  console.error(chalk.dim('   (Get one for free at https://aistudio.google.com/)\n'));
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

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
    ROLE: You are a QA Architect (BotIntern).
    TASK: Update the test plan or generate new tests if the contents of yaml doesn't exists.
    
    --- 🚨 CRITICAL INSTRUCTION: SCHEMA MIGRATION 🚨 ---
    The existing YAML might use an old format (keys like 'actions', 'type', 'selector').
    You MUST rewrite everything into the NEW "Product Manager" syntax below.
    DO NOT output the old format.

    --- NEW SYNTAX RULES (STRICT) ---
    1. USE 'scenarios' (not tests).
    2. USE 'tests' list inside scenarios (not actions).
    3. USE these keys only:
       - see: "Text"                 (instead of assert_visible/text)
       - click: "Text"               (instead of type: click)
       - type: "Value"               (instead of type: type)
         into: "Label"
       - url: "/path"                (checks navigation)
       - network: "METHOD URL"       (checks API)

    --- INPUTS ---
    1. CURRENT PAGE SOURCE:
    ${sourceCode}

    2. OLD/EXISTING YAML:
    ${yaml || "No existing plan."}

    --- EXAMPLE OF CORRECT OUTPUT ---
    meta:
      baseUrl: "http://localhost:3000"
    scenarios:
      - name: "Login Flow"
        path: "/login"
        tests:
          - see: "Welcome Back"
          - type: "user@test.com"
            into: "Email Address"
          - click: "Sign In"
          - network: "POST /api/login"
          - url: "/dashboard"

    --- FINAL INSTRUCTION ---
    - Output the FULL, VALID YAML file.
    Here's the user given prompt. Modify the yaml file according to the user prompt. Ignore if empty
    ${userPrompt || ""}
  `;


  const spinner = ora(chalk.yellow('Fixing the errors...')).start();

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    console.log("Raw txt");
    console.log(response.text);
    const rawText = response.text;
    const finalYaml = cleanYaml(rawText);
    console.log(finalYaml);
    spinner.succeed(chalk.green('Generate the yaml file successfully.'));
    return finalYaml;

    // spinner.succeed(chalk.green('Build Passed! No errors found.'));
  } catch (e) {
    console.error(e);
    spinner.fail(chalk.red('Yaml generation Failed!'));
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

    CRITICAL RULES:
    1. **Completeness:** Return the FULL file content. Do not truncate. Do not use placeholders like "// ... rest of code".
    2. **Hallucinations:** Do NOT import packages that are not in package.json (unless they are built-in Node/React modules).
    3. **The Fix:** If an import is missing/broken, remove it or replace it with a valid alternative from package.json.
    4. **Output:** Return ONLY the code. No explanations. No markdown backticks.

    The output is stripped using the following regex. So, give according to that. RegEx Line in code: "const fileRegex = /--- FILE: (.*?) ---\n([\s\S]*?)(?=(--- FILE:|$))/g;"
    Here's a custom user prompt too. Ignore if there isn't any ${userPrompt || ""}
    `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    console.log("Raw txt");
    console.log(response.text);
    const rawText = response.text;
    console.log(rawText);
    spinner.succeed(chalk.green('Generate the yaml file successfully.'));
    return rawText;

    // spinner.succeed(chalk.green('Build Passed! No errors found.'));
  } catch (e) {
    console.error(e);
    spinner.fail(chalk.red('Yaml generation Failed!'));
  }
}

export { fixBuild, generateYaml, fix };

