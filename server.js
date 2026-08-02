// ============================================
// NODE⁴⁹ RECRUITMENT BACKEND
// With Telegram Bot Integration
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURATION VALIDATION
// ============================================
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID;
const whatsappGroupLink = process.env.WHATSAPP_GROUP_LINK || 'https://chat.whatsapp.com/YOUR_GROUP_LINK_HERE';

if (!botToken || botToken === 'YOUR_BOT_TOKEN_HERE') {
    console.error('❌ ERROR: TELEGRAM_BOT_TOKEN not set in .env file');
    console.error('📝 Get your bot token from @BotFather on Telegram');
    process.exit(1);
}

if (!adminChatId || adminChatId === 'YOUR_CHAT_ID_HERE') {
    console.error('❌ ERROR: ADMIN_CHAT_ID not set in .env file');
    console.error('📝 Get your chat ID from @userinfobot on Telegram');
    process.exit(1);
}

// ============================================
// CORS CONFIGURATION
// ============================================
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.warn(`⚠️ Blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// ============================================
// TELEGRAM BOT SETUP
// ============================================
const bot = new TelegramBot(botToken, { polling: true });

// Store pending applications (in-memory - use database for production)
const pendingApplications = new Map();

// ============================================
// TELEGRAM BOT COMMANDS
// ============================================

// Welcome message for admin
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() === adminChatId.toString()) {
        bot.sendMessage(chatId, 
            `🤖 *Node⁴⁹ Recruitment Bot Active*\n\n` +
            `📊 Pending applications: ${pendingApplications.size}\n` +
            `✅ Use /status to check pending applications\n` +
            `🔄 New applications will appear here automatically`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Status command
bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== adminChatId.toString()) return;

    if (pendingApplications.size === 0) {
        bot.sendMessage(chatId, '📭 No pending applications.');
        return;
    }

    let statusMsg = `📊 *Pending Applications: ${pendingApplications.size}*\n\n`;
    let count = 1;
    for (const [id, app] of pendingApplications) {
        statusMsg += `${count}. ${app.data.name} (${app.data.experience})\n`;
        statusMsg += `   📱 ${app.data.whatsapp}\n`;
        statusMsg += `   🆔 ${id}\n\n`;
        count++;
    }
    bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
});

// Helper: Format application for Telegram
function formatApplication(data, appId) {
    const skills = data.skills.join(', ');
    return `
🔐 *NEW NODE⁴⁹ APPLICATION*

👤 *Name:* ${data.name}
📅 *Age:* ${data.age}
🌍 *Country:* ${data.country}
📱 *WhatsApp:* ${data.whatsapp}
📨 *Telegram:* ${data.telegram || 'Not provided'}
📧 *Email:* ${data.email || 'Not provided'}
📊 *Experience:* ${data.experience}
🛠️ *Skills:* ${skills}
💭 *Why join:* ${data.reason}
📝 *Notes:* ${data.notes || 'None'}

---
🆔 *Application ID:* ${appId}
📅 *Received:* ${new Date().toLocaleString()}

*Actions:*
✅ /approve_${appId} - Approve
❌ /reject_${appId} - Reject
    `;
}

// Generate approval message for WhatsApp
function generateApprovalMessage(name) {
    return `🎉 *Congratulations ${name}!*\n\n` +
           `Your application to *Node⁴⁹* has been *APPROVED*! 🚀\n\n` +
           `You are now part of the elite cybersecurity team.\n\n` +
           `🔗 *Join our core group:*\n${whatsappGroupLink}\n\n` +
           `Welcome aboard! 🔥\n\n` +
           `- Node⁴⁹ Leadership Team`;
}

// Handle approval command
bot.onText(/\/approve_([a-zA-Z0-9_]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== adminChatId.toString()) {
        bot.sendMessage(chatId, '⛔ Unauthorized.');
        return;
    }

    const appId = match[1];
    const application = pendingApplications.get(appId);

    if (!application) {
        bot.sendMessage(chatId, '❌ Application not found or already processed.');
        return;
    }

    // Generate WhatsApp message
    const approvalMsg = generateApprovalMessage(application.data.name);
    const whatsappNumber = application.data.whatsapp.replace(/\s/g, '');
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(approvalMsg)}`;

    // Send admin confirmation with clickable link
    await bot.sendMessage(
        chatId,
        `✅ *Application APPROVED!*\n\n` +
        `👤 ${application.data.name}\n` +
        `📱 ${application.data.whatsapp}\n\n` +
        `📤 *Send approval message:*\n` +
        `[Click to Open WhatsApp](${whatsappLink})\n\n` +
        `📋 *Message preview:*\n${approvalMsg.substring(0, 200)}...`,
        { parse_mode: 'Markdown' }
    );

    // Remove from pending
    pendingApplications.delete(appId);
    bot.sendMessage(chatId, `✅ Application for ${application.data.name} has been approved and removed from pending.`);
});

// Handle rejection command
bot.onText(/\/reject_([a-zA-Z0-9_]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== adminChatId.toString()) {
        bot.sendMessage(chatId, '⛔ Unauthorized.');
        return;
    }

    const appId = match[1];
    const application = pendingApplications.get(appId);

    if (!application) {
        bot.sendMessage(chatId, '❌ Application not found or already processed.');
        return;
    }

    await bot.sendMessage(
        chatId,
        `❌ *Application REJECTED*\n\n` +
        `👤 ${application.data.name}\n` +
        `📱 ${application.data.whatsapp}\n\n` +
        `💬 *Reason (optional):*\n` +
        `Reply with /reason_${appId} Your reason here`
    );

    pendingApplications.delete(appId);
});

// Handle rejection reason
bot.onText(/\/reason_([a-zA-Z0-9_]+)\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== adminChatId.toString()) return;

    const appId = match[1];
    const reason = match[2];
    
    await bot.sendMessage(
        chatId,
        `📝 *Rejection reason saved*\n` +
        `Application: ${appId}\n` +
        `Reason: ${reason}`
    );
});

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        pendingApplications: pendingApplications.size,
        timestamp: new Date().toISOString()
    });
});

// Submit application
app.post('/apply', async (req, res) => {
    try {
        const applicationData = req.body;

        // Validate required fields
        const required = ['name', 'age', 'country', 'whatsapp', 'experience', 'skills', 'reason'];
        for (const field of required) {
            if (!applicationData[field] || (typeof applicationData[field] === 'string' && !applicationData[field].trim())) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required field: ${field}`
                });
            }
        }

        // Validate age
        const age = parseInt(applicationData.age);
        if (isNaN(age) || age < 16 || age > 99) {
            return res.status(400).json({
                success: false,
                message: 'Age must be between 16 and 99'
            });
        }

        // Validate WhatsApp
        const whatsapp = applicationData.whatsapp.replace(/\s/g, '');
        if (!/^\+?\d{7,15}$/.test(whatsapp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid WhatsApp number format. Use: +1234567890'
            });
        }

        // Validate skills
        if (!Array.isArray(applicationData.skills) || applicationData.skills.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please select at least one skill'
            });
        }

        // Generate unique application ID
        const appId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        // Store application
        pendingApplications.set(appId, {
            id: appId,
            data: applicationData,
            timestamp: new Date().toISOString()
        });

        // Send to Telegram admin
        const formattedMessage = formatApplication(applicationData, appId);
        
        await bot.sendMessage(adminChatId, formattedMessage, {
            parse_mode: 'Markdown'
        }).catch(err => {
            console.error('Failed to send Telegram message:', err);
        });

        // Send confirmation response
        res.status(200).json({
            success: true,
            message: 'Application submitted successfully! The admin will review it shortly.',
            applicationId: appId
        });

    } catch (error) {
        console.error('Error processing application:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
});

// Get pending applications (admin only - optional)
app.get('/applications/pending', (req, res) => {
    const apps = Array.from(pendingApplications.values()).map(app => ({
        id: app.id,
        name: app.data.name,
        whatsapp: app.data.whatsapp,
        experience: app.data.experience,
        timestamp: app.timestamp
    }));
    res.json({
        count: apps.length,
        applications: apps
    });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀 NODE⁴⁹ RECRUITMENT BACKEND');
    console.log('========================================');
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`🤖 Telegram bot: @${botToken.split(':')[0]}`);
    console.log(`📊 Admin Chat ID: ${adminChatId}`);
    console.log(`📝 Pending applications: ${pendingApplications.size}`);
    console.log(`🔗 WhatsApp Group: ${whatsappGroupLink}`);
    console.log('========================================\n');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
});
