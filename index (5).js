/**
   * Create By @shahzu_404
   * Contact Me on on tele
*/

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const figlet = require('figlet');
const express = require('express');
const cors = require('cors');

const AUTH_FILE = './auth.json';
const PAIRING_DIR = './kingbadboitimewisher/pairing/';
let startpairing;
function getStartPairing() {
    if (!startpairing) startpairing = require('./pair');
    return startpairing;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const pairingRequests = new Set();
const recentPairRequests = new Map();

function startApiServer() {
    const app = express();
    const allowedOrigins = String(process.env.CORS_ORIGIN || '*')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);

    app.use(cors({
        origin: allowedOrigins.includes('*') ? true : allowedOrigins,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type']
    }));
    app.use(express.json({ limit: '16kb' }));

    app.get('/', (_req, res) => {
        res.json({ ok: true, service: 'Shahzu pairing API', status: 'online' });
    });

    app.get('/health', (_req, res) => {
        res.json({ ok: true, status: 'online' });
    });

    app.post('/api/pair', async (req, res) => {
        const phone = String(req.body?.phone || '').replace(/\D/g, '');
        const requestIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
        const requestKey = `${requestIp}:${phone}`;
        const lastRequest = recentPairRequests.get(requestKey) || 0;

        if (!/^\d{7,15}$/.test(phone) || phone.startsWith('0')) {
            return res.status(400).json({ error: 'Enter a valid WhatsApp number with country code.' });
        }
        if (['252', '201'].includes(phone.slice(0, 3))) {
            return res.status(400).json({ error: 'This country code is not supported.' });
        }
        if (pairingRequests.size > 0) {
            return res.status(409).json({ error: 'Another pairing request is already running. Try again shortly.' });
        }
        if (Date.now() - lastRequest < 30000) {
            return res.status(429).json({ error: 'Please wait 30 seconds before requesting another code.' });
        }

        const pairingFile = path.join(__dirname, 'kingbadboitimewisher', 'pairing', 'pairing.json');
        pairingRequests.add(phone);
        recentPairRequests.set(requestKey, Date.now());
        try {
            fs.mkdirSync(path.dirname(pairingFile), { recursive: true });
            try { fs.unlinkSync(pairingFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }

            await getStartPairing()(`${phone}@s.whatsapp.net`);
            const deadline = Date.now() + 20000;
            let pairingData = null;
            while (Date.now() < deadline) {
                await delay(500);
                if (!fs.existsSync(pairingFile)) continue;
                try {
                    const candidate = JSON.parse(fs.readFileSync(pairingFile, 'utf8'));
                    if (candidate.number === `${phone}@s.whatsapp.net` && candidate.code) {
                        pairingData = candidate;
                        break;
                    }
                } catch (error) {
                    if (error.code !== 'ENOENT') console.error('Pairing response read error:', error.message);
                }
            }
            if (!pairingData) return res.status(504).json({ error: 'Pairing code was not generated in time. Please try again.' });
            return res.json({ ok: true, code: pairingData.code, expiresIn: 120 });
        } catch (error) {
            console.error('Web pairing request failed:', error.message);
            return res.status(500).json({ error: 'Pairing service is temporarily unavailable.' });
        } finally {
            pairingRequests.delete(phone);
        }
    });

    const port = Number(process.env.PORT || 3000);
    app.listen(port, '0.0.0.0', () => {
        console.log(chalk.green(`🌐 Pairing API listening on port ${port}`));
    });
}

const autoLoadPairs = async () => {
    console.log(chalk.cyan('🔄 Auto-loading all paired users...'));
    
    if (!fs.existsSync(PAIRING_DIR)) {
        console.log(chalk.red('❌ Pairing directory not found.'));
        return;
    }

    const pairedUsers = fs.readdirSync(PAIRING_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(name => name.endsWith('@s.whatsapp.net'));

    if (pairedUsers.length === 0) {
        console.log(chalk.yellow('ℹ️  No paired users found.'));
        return;
    }

    console.log(chalk.green(`✅ Found ${pairedUsers.length} paired users. Starting connections...`));
    console.log(chalk.blue('⏳ Waiting 4 seconds before starting connections...'));
    await delay(4000);

    for (let i = 0; i < pairedUsers.length; i++) {
        const userNumber = pairedUsers[i];
        
        try {
            console.log(chalk.blue(`🔄 Connecting user ${i + 1}/${pairedUsers.length}: ${userNumber}`));
            await getStartPairing()(userNumber);
            console.log(chalk.green(`✅ Connected successfully: ${userNumber}`));
            
            if (i < pairedUsers.length - 1) {
                console.log(chalk.blue('⏳ Waiting 4 seconds before next connection...'));
                await delay(4000);
            }
        } catch (error) {
            console.log(chalk.red(`❌ Failed for ${userNumber}: ${error.message}`));
            
            if (i < pairedUsers.length - 1) {
                console.log(chalk.blue('⏳ Waiting 4 seconds before retry...'));
                await delay(4000);
            }
        }
    }

    console.log(chalk.green('✅ All paired users processed.'));
    console.log(chalk.blue('⏳ Waiting 4 seconds before continuing...'));
    await delay(4000);
};

const initializeBot = async () => {
    console.clear();
    console.log(chalk.cyan(figlet.textSync('SHADOW', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    })));
    
    console.log(chalk.yellow('\n═══════════════════════════════════════════════'));
    console.log(chalk.green('   𝐅𝐦𝐬 𝐂𝐡𝐚𝐧𝐝 𝐗𝐦𝐝 𝐩𝐚𝐢𝐫𝐢𝐧𝐠 𝐬𝐲𝐬𝐭𝐞𝐦       '));
    console.log(chalk.yellow('═══════════════════════════════════════════════\n'));

    // Start HTTP immediately so Railway health checks never wait for session
    // auto-loading or Telegram initialization.
    startApiServer();
    await autoLoadPairs();
    launchBot();
};

function launchBot() {
    console.clear();
    console.log(chalk.green('🚀 Starting C H A N D - X M D system...\n'));

    let telegramLoaded = false;
    let whatsappLoaded = false;

    // Load Telegram bot (bot.js)
    const botPath = path.join(__dirname, 'bot.js');
    if (fs.existsSync(botPath)) {
        try {
            console.log(chalk.blue('📱 Loading Telegram pairing system...'));
            require('./bot');
            telegramLoaded = true;
            console.log(chalk.green('✅ C H A N D - X M D loaded successfully!'));
        } catch (error) {
            console.log(chalk.red('❌ Failed to load Telegram bot (bot.js):'));
            console.log(chalk.red('   Error:', error.message));
            
            if (error.stack) {
                console.log(chalk.gray('   Stack:', error.stack.split('\n')[1].trim()));
            }
            
            console.log(chalk.yellow('⚠️  Continuing without Telegram bot...\n'));
        }
    } else {
        console.log(chalk.yellow('⚠️  bot.js not found, skipping Telegram bot...\n'));
    }

    // Load WhatsApp commands (drenox.js)
    const drenoxPath = path.join(__dirname, 'drenox.js');
    if (fs.existsSync(drenoxPath)) {
        try {
            console.log(chalk.blue('💬 Loading WhatsApp commands system...'));
            const drenoxModule = require('./drenox');
            whatsappLoaded = true;
            console.log(chalk.green('✅ WhatsApp commands loaded successfully!'));
            
        } catch (error) {
            console.log(chalk.red('❌ Failed to load WhatsApp commands (drenox.js):'));
            console.log(chalk.red('   Error:', error.message));
            
            if (error.stack) {
                console.log(chalk.gray('   Stack:', error.stack.split('\n')[1].trim()));
            }
            
            console.log(chalk.yellow('⚠️  Continuing without WhatsApp commands...\n'));
        }
    } else {
        console.log(chalk.yellow('⚠️  drenox.js not found, skipping WhatsApp commands...\n'));
    }

    // Summary
    console.log(chalk.cyan('\n═══════════════════════════════════════════════'));
    console.log(chalk.bold.white('F M S - C H A N D - X M D INITIALIZATION SUMMARY          '));
    console.log(chalk.cyan('═══════════════════════════════════════════════'));
    console.log(telegramLoaded ? chalk.green('✅𝐒ＨＡＤＯＷ тɛℓɛɢяαм вσт: Active') : chalk.red('❌𝐒ＨＡＤＯＷ тɛℓɛɢяαм вσт : Inactive'));
    console.log(whatsappLoaded ? chalk.green('✅ WhatsApp Commands: Active') : chalk.red('❌ WhatsApp Commands: Inactive'));
    console.log(chalk.cyan('═══════════════════════════════════════════════\n'));

    if (!telegramLoaded && !whatsappLoaded) {
        console.log(chalk.red('⚠️  Warning: No bot systems loaded! Check your files.\n'));
    } else {
        console.log(chalk.green('✅ C H A N D - X M D BOT system is ready and running!\n'));
    }

    // Error handlers
    const ignoredErrors = [
        'Socket connection timeout',
        'EKEYTYPE',
        'item-not-found',
        'rate-overlimit',
        'Connection Closed',
        'Timed Out',
        'Value not found'
    ];

    process.on('unhandledRejection', (reason, promise) => {
        if (ignoredErrors.some(e => String(reason).includes(e))) return;
        
        console.log(chalk.red('\n⚠️  Unhandled Promise Rejection:'));
        console.log(chalk.yellow('Reason:'), reason);
    });

    process.on('uncaughtException', (error) => {
        if (ignoredErrors.some(e => String(error).includes(e))) return;
        
        console.log(chalk.red('\n❌ Uncaught Exception:'));
        console.log(chalk.yellow('Error:'), error.message);
        if (error.stack) {
            console.log(chalk.gray(error.stack));
        }
    });

    const originalConsoleError = console.error;
    console.error = function (message, ...optionalParams) {
        if (typeof message === 'string' && ignoredErrors.some(e => message.includes(e))) {
            return;
        }
        originalConsoleError.apply(console, [message, ...optionalParams]);
    };

    const originalStderrWrite = process.stderr.write;
    process.stderr.write = function (message, encoding, fd) {
        if (typeof message === 'string' && ignoredErrors.some(e => message.includes(e))) {
            return;
        }
        originalStderrWrite.apply(process.stderr, arguments);
    };

    console.log(chalk.blue('📊 Bot monitoring active...'));
    console.log(chalk.gray('Press Ctrl+C to stop the bot\n'));
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n⚠️  Shutting down gracefully...'));
    console.log(chalk.green('👋 Goodbye!'));
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n\n⚠️  Received termination signal...'));
    process.exit(0);
});

initializeBot().catch((error) => {
    console.log(chalk.red('\n❌ Fatal error during initialization:'));
    console.log(chalk.yellow('Error:'), error.message);
    if (error.stack) {
        console.log(chalk.gray(error.stack));
    }
    process.exit(1);
});
