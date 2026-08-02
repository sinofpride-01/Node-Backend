// ============================================
// NODE⁴⁹ RECRUITMENT BACKEND
// Professional Telegram Bot with Inline Buttons
// ============================================

const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURATION (HARDCODED FOR NOW)
// ============================================
// ⚠️ REPLACE THESE WITH YOUR ACTUAL VALUES
const BOT_TOKEN = '8530622963:AAEZFQqXi-oSD6h-B9Ns49GGHd5k6Vk9ATQ'; // Get from @BotFather
const ADMIN_CHAT_ID = '8889541324'; // Get from @userinfobot
const WHATSAPP_GROUP_LINK ='https://chat.whatsapp.com/DGs2ktleDoJ4yni7TEo7nV?s=cl&p=a&ilr=1';

// ============================================
// CORS CONFIGURATION - Allow all origins for testing
// ============================================
app.use(cors({
    origin: '*', // Allow all origins (update for production)
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============================================
// TELEGRAM BOT SETUP
// ============================================
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Store pending applications
const pendingApplications = new Map();

// ============================================
// PROFESSIONAL TELEGRAM UI HELPERS
// ============================================

// Format application for Telegram with inline buttons
function formatApplication(data, appId) {
    const skills = data.skills.join(', ');
    const timestamp = new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    return `
🔐 *NEW APPLICATION* · Node⁴⁹

👤 *Name:* ${data.name}
📅 *Age:* ${data.age}
🌍 *Country:* ${data.country}
📱 *WhatsApp:* ${data.whatsapp}
📨 *Telegram:* ${data.telegram || 'Not provided'}
📧 *Email:* ${data.email || 'Not provided'}
📊 *Experience:* ${data.experience}
🛠️ *Skills:* ${skills}
💭 *Motivation:* ${data.reason}
📝 *Notes:* ${data.notes || 'None'}

---
🆔 *ID:* \`${appId}\`
🕐 *Received:* ${timestamp}
`;
}

// Generate approval message for WhatsApp
function generateApprovalMessage(name) {
    return `🎉 *Congratulations ${name}!*\n\n` +
           `Your application to *Node⁴⁹* has been *APPROVED*! 🚀\n\n` +
           `You are now part of the elite cybersecurity team.\n\n` +
           `🔗 *Join our core group:*\n${WHATSAPP_GROUP_LINK}\n\n` +
           `Welcome aboard! 🔥\n\n` +
           `- Node⁴⁹ Leadership Team`;
}

// ============================================
// TELEGRAM BOT COMMANDS
// ============================================

// /start - Welcome message with status
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_CHAT_ID.toString()) {
        bot.sendMessage(chatId, '⛔ Unauthorized access.');
        return;
    }

    const pending = pendingApplications.size;
    const statusText = pending === 0 
        ? '📭 No pending applications.' 
        : `📊 *${pending} application(s)* pending review.`;

    bot.sendMessage(chatId, 
        `🤖 *Node⁴⁹ Recruitment Bot*\n\n` +
        `✅ System: *Active*\n` +
        `${statusText}\n\n` +
        `📌 Use /status to view all pending applications.`,
        { parse_mode: 'Markdown' }
    );
});

// /status - List all pending applications
bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_CHAT_ID.toString()) return;

    if (pendingApplications.size === 0) {
        bot.sendMessage(chatId, '📭 *No pending applications.*', { parse_mode: 'Markdown' });
        return;
    }

    let statusMsg = `📊 *Pending Applications: ${pendingApplications.size}*\n\n`;
    let count = 1;
    for (const [id, app] of pendingApplications) {
        statusMsg += `${count}. *${app.data.name}* (${app.data.experience})\n`;
        statusMsg += `   📱 ${app.data.whatsapp}\n`;
        statusMsg += `   🆔 \`${id}\`\n\n`;
        count++;
    }

    bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
});

// ============================================
// INLINE BUTTON HANDLING FOR APPROVAL/REJECTION
// ============================================

// Send application to admin with inline buttons
async function sendApplicationToAdmin(applicationData, appId) {
    const formattedMsg = formatApplication(applicationData, appId);

    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { 
                        text: '✅ APPROVE', 
                        callback_data: `approve_${appId}`,
                        style: 'primary'
                    },
                    { 
                        text: '❌ REJECT', 
                        callback_data: `reject_${appId}`,
                        style: 'danger'
                    }
                ],
                [
                    { 
                        text: '📊 View All Pending', 
                        callback_data: 'view_pending'
                    }
                ]
            ]
        },
        parse_mode: 'Markdown'
    };

    await bot.sendMessage(ADMIN_CHAT_ID, formattedMsg, inlineKeyboard);
}

// Handle inline button callbacks
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    // Only allow admin
    if (chatId.toString() !== ADMIN_CHAT_ID.toString()) {
        await bot.answerCallbackQuery(callbackQuery.id, {
            text: '⛔ Unauthorized.',
            show_alert: true
        });
        return;
    }

    // Handle view pending
    if (data === 'view_pending') {
        await bot.answerCallbackQuery(callbackQuery.id);
        
        if (pendingApplications.size === 0) {
            await bot.sendMessage(chatId, '📭 *No pending applications.*', { parse_mode: 'Markdown' });
            return;
        }

        let msg = `📊 *Pending Applications: ${pendingApplications.size}*\n\n`;
        let count = 1;
        for (const [id, app] of pendingApplications) {
            msg += `${count}. *${app.data.name}* (${app.data.experience})\n`;
            msg += `   📱 ${app.data.whatsapp}\n`;
            msg += `   🆔 \`${id}\`\n\n`;
            count++;
        }
        await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        return;
    }

    // Handle approval
    if (data.startsWith('approve_')) {
        const appId = data.replace('approve_', '');
        const application = pendingApplications.get(appId);

        if (!application) {
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '❌ Application not found or already processed.',
                show_alert: true
            });
            return;
        }

        // Generate WhatsApp approval link
        const approvalMsg = generateApprovalMessage(application.data.name);
        const whatsappNumber = application.data.whatsapp.replace(/\s/g, '');
        const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(approvalMsg)}`;

        // Remove from pending
        pendingApplications.delete(appId);

        // Send confirmation with WhatsApp link
        await bot.editMessageText(
            `✅ *APPROVED* · ${application.data.name}\n\n` +
            `📱 WhatsApp: ${application.data.whatsapp}\n\n` +
            `📤 *Send approval message:*\n` +
            `[Click to Open WhatsApp](${whatsappLink})\n\n` +
            `📋 *Message preview:*\n${approvalMsg.substring(0, 150)}...\n\n` +
            `🕐 Processed: ${new Date().toLocaleString()}`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { 
                                text: '📤 Open WhatsApp', 
                                url: whatsappLink
                            }
                        ],
                        [
                            { 
                                text: '📊 View Pending', 
                                callback_data: 'view_pending'
                            }
                        ]
                    ]
                }
            }
        );

        // Also send a separate message with the full approval text
        await bot.sendMessage(
            chatId,
            `📋 *Full Approval Message*\n\n${approvalMsg}`,
            { parse_mode: 'Markdown' }
        );

        await bot.answerCallbackQuery(callbackQuery.id, {
            text: `✅ ${application.data.name} approved! WhatsApp link ready.`,
            show_alert: true
        });

        return;
    }

    // Handle rejection
    if (data.startsWith('reject_')) {
        const appId = data.replace('reject_', '');
        const application = pendingApplications.get(appId);

        if (!application) {
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '❌ Application not found or already processed.',
                show_alert: true
            });
            return;
        }

        // Remove from pending
        pendingApplications.delete(appId);

        // Update message with rejection status
        await bot.editMessageText(
            `❌ *REJECTED* · ${application.data.name}\n\n` +
            `📱 WhatsApp: ${application.data.whatsapp}\n` +
            `🕐 Processed: ${new Date().toLocaleString()}\n\n` +
            `💬 *Reason:* (Optional - reply with /reason_${appId} Your reason)`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { 
                                text: '📊 View Pending', 
                                callback_data: 'view_pending'
                            }
                        ]
                    ]
                }
            }
        );

        await bot.answerCallbackQuery(callbackQuery.id, {
            text: `❌ ${application.data.name} rejected.`,
            show_alert: true
        });

        return;
    }

    await bot.answerCallbackQuery(callbackQuery.id);
});

// Handle rejection reason command
bot.onText(/\/reason_([a-zA-Z0-9_]+)\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_CHAT_ID.toString()) return;

    const appId = match[1];
    const reason = match[2];
    
    await bot.sendMessage(
        chatId,
        `📝 *Rejection reason saved*\n` +
        `🆔 Application: \`${appId}\`\n` +
        `💬 Reason: ${reason}`,
        { parse_mode: 'Markdown' }
    );
});

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Node⁴⁹ Recruitment API',
        version: '1.0.0',
        pendingApplications: pendingApplications.size,
        timestamp: new Date().toISOString()
    });
});

// Submit application
app.post('/apply', async (req, res) => {
    try {
        const data = req.body;

        // Validate required fields
        const required = ['name', 'age', 'country', 'whatsapp', 'experience', 'skills', 'reason'];
        for (const field of required) {
            if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required field: ${field}`
                });
            }
        }

        // Validate age
        const age = parseInt(data.age);
        if (isNaN(age) || age < 16 || age > 99) {
            return res.status(400).json({
                success: false,
                message: 'Age must be between 16 and 99'
            });
        }

        // Validate WhatsApp
        const whatsapp = data.whatsapp.replace(/\s/g, '');
        if (!/^\+?\d{7,15}$/.test(whatsapp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid WhatsApp number format. Use: +1234567890'
            });
        }

        // Validate skills
        if (!Array.isArray(data.skills) || data.skills.length === 0) {
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
            data: data,
            timestamp: new Date().toISOString()
        });

        // Send to Telegram admin with inline buttons
        try {
            await sendApplicationToAdmin(data, appId);
        } catch (botError) {
            console.error('Failed to send Telegram message:', botError);
            // Don't fail the request if Telegram fails
        }

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

// Get pending applications
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
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  🚀 NODE⁴⁹ RECRUITMENT BACKEND        ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`🤖 Bot: Active`);
    console.log(`📊 Pending: ${pendingApplications.size}`);
    console.log('╔════════════════════════════════════════╗');
    console.log('⚠️  IMPORTANT: Replace BOT_TOKEN and');
    console.log('   ADMIN_CHAT_ID with your actual values');
    console.log('╚════════════════════════════════════════╝\n');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
});
