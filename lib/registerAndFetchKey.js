import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

// Store API key in user's home directory
const CONFIG_DIR = path.join(os.homedir(), '.botintern');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Save API key to global config
 */
export function saveApiKey(apiKey) {
    try {
        // Create config directory if it doesn't exist
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }

        // Save API key to config file
        const config = {
            geminiApiKey: apiKey,
            updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error(chalk.red(`Failed to save API key: ${error.message}`));
        return false;
    }
}

/**
 * Get API key from global config or environment
 */
export function getApiKey() {
    // First, try to get from global config
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
            if (config.geminiApiKey) {
                return config.geminiApiKey;
            }
        }
    } catch (error) {
        // Silently fail and try environment variable
    }

    // Fallback to environment variable
    return process.env.GEMINI_API_KEY || process.env.API_KEY;
}

/**
 * Check if API key is configured
 */
export function hasApiKey() {
    return !!getApiKey();
}

/**
 * Remove saved API key
 */
export function removeApiKey() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            fs.unlinkSync(CONFIG_FILE);
            return true;
        }
        return false;
    } catch (error) {
        console.error(chalk.red(`Failed to remove API key: ${error.message}`));
        return false;
    }
}
