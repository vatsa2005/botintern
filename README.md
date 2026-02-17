<div align="center">

# 🤖 BotIntern

### *The autonomous QA agent that doesn't just find bugs—it fixes them.*

[![NPM Version](https://img.shields.io/npm/v/@vatzzza/botintern?color=blue&logo=npm)](https://www.npmjs.com/package/@vatzzza/botintern)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%203.0%20Pro-4285F4?logo=google)](https://ai.google.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/vatsa2005/botintern/npm-publish.yml?label=CI%2FCD&logo=github)](https://github.com/vatsa2005/botintern/actions)
[![npm downloads](https://img.shields.io/npm/dm/@vatzzza/botintern?color=orange&logo=npm)](https://www.npmjs.com/package/@vatzzza/botintern)
[![GitHub Issues](https://img.shields.io/github/issues/vatsa2005/botintern?logo=github)](https://github.com/vatsa2005/botintern/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/vatsa2005/botintern/pulls)
[![GitHub Stars](https://img.shields.io/github/stars/vatsa2005/botintern?style=social)](https://github.com/vatsa2005/botintern)

**Write tests. BotIntern makes them pass.** Scan, fix, test, generate, and loop — all from your terminal.

---

```
$ botintern

  ╔══════════════════════════════════════════════════════╗
  ║  🤖 BotIntern — Self-Healing Code Engine            ║
  ╚══════════════════════════════════════════════════════╝

  🚀 Ready to validate your AI-generated code? 🚀
  ✨ Scan • Fix • Test • Generate • Loop

  📖 Getting Started:
     1. botintern login       — Authenticate with Gemini
     2. botintern scan        — Detect build errors
     3. botintern fix         — Auto-fix with AI
     4. botintern test        — Run vibe checks
     5. botintern loop "..."  — AI iterative dev loop
```

---

</div>

## ⚡ Quick Start

Get up and running in under a minute:

```bash
# 1. Install globally
npm install -g @vatzzza/botintern

# 2. Authenticate with your Gemini API key
botintern login

# 3. Run your first vibe check with auto-fix
botintern verify --fix
```

> **New to BotIntern?** Jump to [Installation & Usage](#-installation--usage) for a detailed walkthrough, or see [CLI Commands](#-cli-commands) for the full reference.

---

## 🚨 The Problem: The Trust Gap

Modern AI coding assistants like **Cursor** and **Copilot** have revolutionized how fast we write code. But there's a catch:

> **Developers now spend more time *verifying* AI-generated code than they did writing it manually.**

This is the **Trust Gap**.

### The Hidden Cost of AI Code Generation

| Pain Point | What Happens |
|---|---|
| **Visual Regressions** | AI generates a button with `opacity-0` — it exists in the DOM but is invisible to users |
| **Report-Only Tools** | Cypress, Playwright, and Maestro can *find* bugs, but they can't *fix* them |
| **Context Switching** | Read failure → switch to editor → hunt for the bug → fix manually → re-run tests → repeat |

**The result?** You're still the intern doing the grunt work.

---

## ✨ The Solution: Self-Healing Code

**BotIntern** bridges the Trust Gap by going beyond detection—it *autonomously fixes bugs*.

### How It Works: The Self-Healing Loop

```
  ┌────────────────────────────────────────────────────────────┐
  │                    SELF-HEALING LOOP                        │
  │                                                            │
  │   ┌─────────┐     ┌──────────┐     ┌──────────┐           │
  │   │  WRITE  │────▶│  CHECK   │────▶│   FIX    │           │
  │   │  Tests  │     │  Vibes   │     │  Code    │           │
  │   └─────────┘     └────┬─────┘     └────┬─────┘           │
  │        ▲               │                │                  │
  │        │               ▼                │                  │
  │        │         ❌ Test Fails ──────────┘                  │
  │        │                                                   │
  │        └──────── ✅ Test Passes ◀──── Re-run               │
  └────────────────────────────────────────────────────────────┘
```

1. **🔍 Visual "Vibe Checks"**: Instead of just checking if a button exists in the DOM, BotIntern verifies that users can *actually see and interact with it* using headless browser automation.

2. **🧬 AST-Powered Code Surgery**: When a test fails, BotIntern:
   - Reads your source code using Abstract Syntax Trees (AST)
   - Identifies the exact buggy component
   - Uses **Google Gemini** to generate a surgical patch
   - Applies the fix directly to your source file

3. **♻️ Loops Until Green**: BotIntern re-runs the test, and if it still fails, it iterates—refining the fix until the test passes.

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

**Supported DSL Actions:**

| Action | Description | Example |
|--------|-------------|---------|
| `see` | Assert text/element is visible | `- see: "Welcome"` |
| `click` | Click a button or element | `- click: "Submit"` |
| `type` | Type text into an input | `- type: { selector: "input", text: "hello" }` |
| `waitFor` | Wait for text to appear | `- waitFor: "Dashboard"` |

### 🔒 Safety First: "Read-Many, Write-One"
BotIntern has a strict safety architecture:
- ✅ **Can edit**: Source code (your components)
- ❌ **Cannot edit**: Test suite (your `vibe.yaml`)

This prevents the AI from "cheating" by modifying tests to pass.

---

## 📋 Prerequisites

Before installing BotIntern, make sure you have:

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | ≥ 18 | Or [Bun](https://bun.sh/) runtime |
| **Gemini API Key** | — | Free at [Google AI Studio](https://aistudio.google.com/app/apikey) |
| **Playwright Browsers** | — | Auto-installed on first run |

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

## 🖥️ CLI Commands

BotIntern ships with a comprehensive set of CLI commands for every stage of your workflow:

### `botintern login`
Authenticate with your Google Gemini API key. The key is saved globally so you only need to do this once.

```bash
botintern login
# Prompts: Enter your Gemini API Key: ********
# ✨ Success! Key saved globally.
```

### `botintern scan`
Scan your codebase for build errors. Runs `npm run build` under the hood and reports any failures with detailed diagnostics.

```bash
botintern scan
# 🔍 Scanning for AI hallucinations...
# ✅ BUILD PASSED — No issues found
```

### `botintern fix`
Automatically detect **and fix** build errors using AI. When a build fails, BotIntern extracts the error, identifies the broken file, and uses Gemini to generate a surgical patch.

```bash
botintern fix
# ❌ BUILD ERRORS FOUND
# 🧠 AI generating solution...
# ✅ Code repaired successfully
```

### `botintern test`
Run your Playwright-based vibe checks against the `vibe.yaml` test suite. Launches a headless browser and verifies each test case.

```bash
botintern test
# 🚀 Setting up test browser...
# 🌐 Browser ready
# ✅ ALL TESTS PASSED
```

### `botintern generate-yaml`
Let AI generate intelligent YAML test cases for your project. BotIntern reads your file tree, source code, and existing `vibe.yaml` to produce comprehensive test scenarios.

```bash
botintern generate-yaml
# 📝 Analyzing project structure...
# ✨ YAML test cases generated → vibe.yaml
```

### `botintern loop <prompt>`
The flagship command. Starts an **AI-powered iterative development loop** — BotIntern runs tests, detects failures, applies AI fixes, and re-runs until everything passes.

```bash
botintern loop "Fix the login page styling"
# 🔄 AI LOOP MODE
# 🌐 Environment ready
# 🧪 Running initial test suite...
# 🤖 AI improvement loop starting...
# 🎯 Loop completed
```

---

## 🏗️ Architecture

BotIntern is built on three core components that work together in a self-healing loop:

```
┌──────────────────────────────────────────────────────────────┐
│                      BotIntern Pipeline                       │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Vibe Engine 🎯  │  │   Observer 👀    │  │  Surgeon 🔬  │ │
│  │                 │  │                 │  │              │ │
│  │ • YAML → PW     │──│ • DOM Snapshots │──│ • AST Parse  │ │
│  │ • Visual checks │  │ • Error States  │  │ • Gemini AI  │ │
│  │ • Screenshots   │  │ • Console Logs  │  │ • Patch Code │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │
│           │                    │                   │         │
│           └────────────────────┼───────────────────┘         │
│                                │                             │
│                     ♻️  Self-Healing Loop                     │
└──────────────────────────────────────────────────────────────┘
```

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
- Uses Gemini for context-aware repairs
- Applies surgical patches to fix bugs
- Validates fixes don't break existing code

---

## 📊 Comparison Table

| Feature                  | **BotIntern** | Maestro/Cypress | Cursor/Copilot |
|--------------------------|---------------|-----------------|----------------|
| **Primary Function**     | Fixes Code    | Finds Bugs      | Writes Code    |
| **Self-Healing**         | ✅ Yes        | ❌ No           | ❌ No          |
| **Visual Verification**  | ✅ Yes        | ⚠️ Limited      | ❌ No          |
| **Auto-Repairs Source**  | ✅ Yes        | ❌ No           | ❌ No          |
| **Context Switching**    | ✅ None       | ❌ Manual       | ❌ Manual      |
| **Product Type**         | Self-Healing  | Test Reporter   | Code Generator |
| **Use Case**             | QA + Auto-Fix | Testing Only    | Initial Dev    |

---

## 🛠️ Tech Stack

BotIntern is built with modern, reliable technologies:

| Technology | Purpose |
|---|---|
| [Node.js](https://nodejs.org/) | Runtime (also compatible with [Bun](https://bun.sh/)) |
| [Google Gemini](https://ai.google.dev/) | AI engine for intelligent code repairs |
| [Playwright](https://playwright.dev/) | Headless browser automation & testing |
| [Commander.js](https://github.com/tj/commander.js/) | Robust CLI framework |
| [Chalk](https://github.com/chalk/chalk) + [Ora](https://github.com/sindresorhus/ora) | Beautiful terminal output & spinners |
| [js-yaml](https://github.com/nodeca/js-yaml) | Vibe DSL config parsing |

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

## 🔄 CI/CD & Releases

BotIntern uses **GitHub Actions** for automated publishing to npm:

- **Stable Release**: When the `version` in `package.json` is bumped and pushed to `main`, a new stable release is published to npm under the `latest` tag.
- **Canary Release**: When code is pushed to `main` without a version bump, a canary snapshot is auto-published under the `canary` tag for early testing.

```bash
# Install the stable release
npm install -g @vatzzza/botintern

# Try the bleeding-edge canary build
npm install -g @vatzzza/botintern@canary
```

---

## 📄 License

BotIntern is [MIT](https://opensource.org/licenses/MIT) licensed — use it freely in personal and commercial projects.

---

## 🙌 Contributing

We welcome contributions of all kinds! Here's how to get started:

### Ways to Contribute
- 🐛 **Bug Reports** — Found something broken? [Open an issue](https://github.com/vatsa2005/botintern/issues/new)
- 💡 **Feature Requests** — Have an idea? Let us know!
- 📝 **Documentation** — Improve guides, fix typos, add examples
- 🔧 **Code** — Fix bugs or build new features

### Development Setup

```bash
# 1. Fork & clone the repo
git clone https://github.com/<your-username>/botintern.git
cd botintern

# 2. Install dependencies
npm install

# 3. Run in development mode (watch for changes)
npm run dev

# 4. Create a feature branch
git checkout -b feature/your-feature-name

# 5. Make your changes, then push & open a PR
git push origin feature/your-feature-name
```

### PR Guidelines
- Keep PRs focused — one feature or fix per PR
- Follow existing code style
- Test your changes before submitting
- Write a clear PR description explaining the *what* and *why*

---

## 🔗 Links

- **NPM Package**: [npmjs.com/@vatzzza/botintern](https://www.npmjs.com/package/@vatzzza/botintern)
- **Repository**: [github.com/vatsa2005/botintern](https://github.com/vatsa2005/botintern)
- **Issues**: [github.com/vatsa2005/botintern/issues](https://github.com/vatsa2005/botintern/issues)

---

<div align="center">

**Made with ❤️ by developers tired of being their own QA interns**

*BotIntern: The intern that actually fixes bugs.*

⭐ **Star this repo** if BotIntern saved you from debugging at 2 AM!

*Do not just blame, contribute. 😉*

</div>
