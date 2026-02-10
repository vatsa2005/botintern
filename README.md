<div align="center">

# 🤖 BotIntern

### *The autonomous QA agent that doesn't just find bugs—it fixes them.*

[![NPM Version](https://img.shields.io/npm/v/@vatzzza/botintern?color=blue&logo=npm)](https://www.npmjs.com/package/@vatzzza/botintern)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%203.0%20Pro-4285F4?logo=google)](https://ai.google.dev/)

---

**🎬 Demo GIF Coming Soon**



---

</div>

## 🚨 The Problem: The Trust Gap

Modern AI coding assistants like **Cursor** and **Copilot** have revolutionized how fast we write code. But there's a catch:

> **Developers now spend more time *verifying* AI-generated code than they did writing it manually.**

This is the **Trust Gap**.

### The Hidden Cost of AI Code Generation

- **Visual Regressions Slip Through**: AI generates a button with `opacity-0`—it exists in the DOM but is invisible to users.
- **Standard Tools Only Report**: Cypress, Playwright, and Maestro can *find* these bugs, but they can't *fix* them.
- **Context Switching Hell**: You read the test failure, switch to your editor, hunt for the buggy component, fix it manually, re-run tests... repeat.

**The result?** You're still the intern doing the grunt work.

---

## ✨ The Solution: Self-Healing Code

**BotIntern** bridges the Trust Gap by going beyond detection—it *autonomously fixes bugs*.

### How It Works: The Self-Healing Loop

1. **🔍 Visual "Vibe Checks"**: Instead of just checking if a button exists in the DOM, BotIntern verifies that users can *actually see and interact with it* using headless browser automation.

2. **🧬 AST-Powered Code Surgery**: When a test fails, BotIntern:
   - Reads your source code using Abstract Syntax Trees (AST)
   - Identifies the exact buggy component
   - Uses **Google Gemini 1.5 Flash** to generate a surgical patch
   - Applies the fix directly to your source file

3. **♻️ Loops Until Green**: BotIntern re-runs the test, and if it still fails, it iterates—refining the fix until the test passes.

**You write tests. BotIntern makes them pass.**

---

## 🎯 Key Features

### 👁️ Visual "Vibe Checks"
Goes beyond DOM presence checks. Verifies **user reality**:
- Is the button visible? (Not `opacity-0` or `hidden`)
- Is the text readable? (Not `color: white` on white background)
- Can users actually interact with it? (Not blocked by overlays)

### 🔧 Self-Healing Code
Reads, understands, and patches your source code:
- Uses AST parsing to locate buggy components
- Context-aware repairs using Gemini's reasoning
- Preserves code style and structure

### 📝 Vibe DSL
A simple, human-readable YAML syntax that abstracts away Playwright complexity:

```yaml
tests:
  - name: "Login Flow"
    url: "http://localhost:3000"
    actions:
      - see: "Login"
      - click: "Submit"
      - waitFor: "Welcome back!"
```

No more brittle selectors. Just describe what users see and do.

### 🔒 Safety First: "Read-Many, Write-One"
BotIntern has a strict safety architecture:
- ✅ **Can edit**: Source code (your components)
- ❌ **Cannot edit**: Test suite (your vibe.yaml)

This prevents the AI from "cheating" by modifying tests to pass.

---

## 📦 Installation & Usage

### 1️⃣ Install BotIntern

```bash
npm install -g @vatzzza/botintern
```

### 2️⃣ Authenticate

BotIntern uses Google Gemini API for intelligent code repairs:

```bash
botintern login
```

This will prompt you to enter your Gemini API key (get one at [Google AI Studio](https://aistudio.google.com/app/apikey)).

### 3️⃣ Create Your Test Config

Create a `vibe.yaml` file in your project root:

```yaml
tests:
  - name: "Homepage Vibe Check"
    url: "http://localhost:3000"
    actions:
      - see: "Welcome to BotIntern"
      - click: "Get Started"
      - see: "Dashboard"

  - name: "Login Verification"
    url: "http://localhost:3000/login"
    actions:
      - see: "Email"
      - type: 
          selector: "input[type='email']"
          text: "user@example.com"
      - click: "Login"
      - waitFor: "Welcome back"
```

### 4️⃣ Run BotIntern

```bash
# Run tests with auto-fix enabled
botintern verify --fix

# Run tests without auto-fix (report only)
botintern verify
```

BotIntern will:
1. ✅ Run your vibe checks
2. 🔍 Detect visual regressions
3. 🔧 Automatically fix failing tests
4. ♻️ Loop until all tests pass (or max iterations reached)

---

## 🏗️ Architecture

BotIntern is built on three core components:

### 1. **The Vibe Engine** 🎯
- Translates Vibe DSL (YAML) into Playwright automation
- Handles visual verification logic
- Captures screenshots and console logs

### 2. **The Observer** 👀
- Monitors test execution in real-time
- Captures DOM snapshots and error states
- Extracts actionable context for repairs

### 3. **The Surgeon** 🔬
- Parses source code using AST
- Uses Gemini 1.5 Flash for context-aware repairs
- Applies surgical patches to fix bugs
- Validates fixes don't break existing code

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ Vibe Engine │ ───> │   Observer   │ ───> │   Surgeon   │
│  (YAML→PW)  │      │ (Logs+DOM)   │      │ (AST+Gemini)│
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │                      │
       └─────────────────────┴──────────────────────┘
                      Self-Healing Loop
```

---

## 📊 Comparison Table

| Feature                  | **BotIntern** | Maestro/Cypress | Cursor/Copilot |
|--------------------------|---------------|-----------------|----------------|
| **Primary Function**     | Fixes Code    | Finds Bugs      | Writes Code    |
| **Self-Healing**         | ✅ Yes        | ❌ No           | ❌ No          |
| **Visual Verification**  | ✅ Yes        | ⚠️ Limited      | ❌ No          |
| **Auto-Repairs Source**  | ✅ Yes        | ❌ No           | ❌ No          |
| **Context Switching**    | ✅ None       | ❌ Manual       | ❌ Manual      |
| **Product Type**         | Self-Healing Product | Test Reporter | Code Generator |
| **Use Case**             | QA + Auto-Fix | Testing Only    | Initial Dev    |

---

## 🛠️ Tech Stack

BotIntern is built with modern, reliable technologies:

- **Runtime**: [Node.js](https://nodejs.org/) (compatible with Bun)
- **AI Engine**: [Google Gemini 1.5 Flash](https://ai.google.dev/) for intelligent code repairs
- **Browser Automation**: [Playwright](https://playwright.dev/) for headless testing
- **CLI Framework**: [Commander.js](https://github.com/tj/commander.js/) for robust CLI
- **UI Libraries**: [Chalk](https://github.com/chalk/chalk) + [Ora](https://github.com/sindresorhus/ora) for beautiful terminal output
- **Config Parsing**: [js-yaml](https://github.com/nodeca/js-yaml) for Vibe DSL

---

## 🚀 Roadmap

We're just getting started. Here's what's coming next:

- [ ] **Visual Regression Snapshots**: Pixel-perfect comparisons for UI changes
- [ ] **GitHub Actions Integration**: Run BotIntern in CI/CD pipelines
- [ ] **Multi-Framework Support**: React, Vue, Angular, Svelte
- [ ] **Advanced DSL**: Support for complex user flows and assertions
- [ ] **Cloud Dashboard**: Centralized test history and analytics
- [ ] **Team Collaboration**: Share and sync vibe.yaml configs

---

## 📄 License

BotIntern is MIT licensed.

---

## 🙌 Contributing

We welcome contributions! Whether it's:
- 🐛 Bug reports
- 💡 Feature requests
- 📝 Documentation improvements
- 🔧 Code contributions

Feel free to open an issue or submit a pull request on GitHub!

---

## 🔗 Links

- **NPM Package**: [https://www.npmjs.com/package/@vatzzza/botintern](https://www.npmjs.com/package/@vatzzza/botintern)
- **Repository**: [https://github.com/vatsa2005/botintern](https://github.com/vatsa2005/botintern)
- **Issues**: [https://github.com/vatsa2005/botintern/issues](https://github.com/vatsa2005/botintern/issues)

---

<div align="center">

**Made with ❤️ by developers tired of being their own QA interns**

*BotIntern: The intern that actually fixes bugs.*

</div>
