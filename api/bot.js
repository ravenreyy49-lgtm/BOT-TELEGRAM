const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set, update } = require('firebase/database');

// --- MENGGUNAKAN ENVIRONMENT VARIABLES (AMAN DARI GITHUB) ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_TOKEN;
const OWNER_ID = process.env.OWNER_ID || "6793028697";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USER = process.env.GITHUB_USER || "ravenreyy49-lgtm";
const GITHUB_REPO = process.env.GITHUB_REPO || "BOT-TELEGRAM";

// Firebase Config Realtime Database
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDXB9GO3EF1AlTG51JEdXOEX_XCtij_xn0",
  authDomain: "registrasi-aplikasi.firebaseapp.com",
  databaseURL: "https://registrasi-aplikasi-default-rtdb.firebaseio.com",
  projectId: "registrasi-aplikasi",
  storageBucket: "registrasi-aplikasi.firebasestorage.app",
  messagingSenderId: "847541474550",
  appId: "1:847541474550:web:faef8ca9e07291243f88d7",
  measurementId: "G-BYD3HWZJVL"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Serverless Handler untuk Vercel Webhook
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (err) {
    console.error(err);
    res.status(200).send('OK');
  }
};

// Middleware Cek Akses & Limit User (Free 3x, lalu Berbayar)
async function checkAccess(ctx, next) {
    const userId = ctx.from.id.toString();
    if (userId === OWNER_ID) return next();

    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    const now = Date.now();

    if (!snapshot.exists()) {
        await set(userRef, { freeLimit: 2, expiredAt: 0, status: "FREE" });
        return next();
    }

    const userData = snapshot.val();
    if (userData.expiredAt && userData.expiredAt > now) {
        return next();
    }

    if (userData.freeLimit > 0) {
        await update(userRef, { freeLimit: userData.freeLimit - 1 });
        return next();
    }

    return ctx.reply(
        "⚠️ *AKSES DITOLAK!*\n\nLimit gratis Anda sudah habis (3x pakai). Silakan lakukan pembayaran:\n\n" +
        "💰 *LIST HARGA PREMIUM*:\n" +
        "• Rp 30.000 / 1 Bulan (Tanpa Limit)\n" +
        "• Rp 60.000 / 3 Bulan (Tanpa Limit)\n" +
        "• Rp 150.000 / Permanen\n\n" +
        "Silakan hubungi Owner: @RavenZy",
        { parse_mode: "Markdown" }
    );
}

// Command Start
bot.start(async (ctx) => {
    const userId = ctx.from.id.toString();
    const welcomeText = 
        `BOT BUILD FREE RAVEN\n` +
        `BOT BUILD APK REAL\n\n` +
        `BOT BUILD RAVEN OFFICIAL\n` +
        `BOT BUILD APK REAL\n\n` +
        `SELAMAT DATANG, ✨ **RavenZy**\n\n` +
        `ANDA KINI MEMILIKI AKSES PENUH KE:\n` +
        `- BUILD APK FLUTTER – OTOMATIS & INSTAN\n` +
        `- WEB TO APK CONVERTER\n` +
        `- ENCRYPT SOURCE CODE\n` +
        `- AUTO DEPLOY – VERCEL / NETLIFY\n` +
        `- RENAME DOMAIN – GANTI DOMAIN DI FILE\n` +
        `- EXCLUSIVE DIGITAL STORE\n\n` +
        `STATUS : ${userId === OWNER_ID ? 'OWNER (UNLIMITED)' : 'USER'}\n` +
        `VERSION : v1.0.0\n\n` +
        `TEKAN MENU DI BAWAH UNTUK MEMULAI`;

    const menu = Markup.inlineKeyboard([
        [Markup.button.callback('🚀 MULAI BUILD APK', 'build_apk'), Markup.button.callback('🌐 WEB TO APK', 'web_to_apk')],
        [Markup.button.callback('🔒 ENCRYPT MENU', 'encrypt_menu'), Markup.button.callback('📦 DEPLOY MENU', 'deploy_menu')],
        [Markup.button.callback('🔄 HTML TO DART', 'html_to_dart'), Markup.button.callback('✏️ RENAME DOMAIN BASE', 'rename_domain')],
        [Markup.button.callback('✏️ UBAH NAMA BASE', 'ubah_nama'), Markup.button.callback('📊 ANTRIAN BUILD', 'antrian')],
        [Markup.button.callback('⚙️ STATUS BOT', 'status_bot'), Markup.button.callback('💳 CREDIT SAYA', 'credit_saya')],
        [Markup.button.callback('📖 PANDUAN', 'panduan'), Markup.button.callback('🛒 PRODUCT', 'product')],
        [Markup.button.callback('⚠️ LAPORKAN BUG', 'bug'), Markup.button.callback('👑 OWNER', 'owner_info')],
        [Markup.button.callback('🤖 BOT', 'bot_info'), Markup.button.callback('🖼️ UBAH FOTO BASE', 'ubah_foto')]
    ]);

    await ctx.reply(welcomeText, { parse_mode: 'Markdown', ...menu });
});

// Fitur Add User Khusus Owner
bot.command('adduser', async (ctx) => {
    if (ctx.from.id.toString() !== OWNER_ID) {
        return ctx.reply("❌ Perintah ini khusus untuk Owner Raven!");
    }
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        return ctx.reply("⚠️ Format salah! Contoh: `/adduser 1234422 5`", { parse_mode: 'Markdown' });
    }
    const targetId = args[1];
    const days = parseInt(args[2]);
    const expiredTime = Date.now() + (days * 24 * 60 * 60 * 1000);

    await update(ref(db, `users/${targetId}`), {
        expiredAt: expiredTime,
        status: `PREMIUM (${days} Hari)`
    });

    await ctx.reply(`✅ Berhasil menambahkan akses untuk User ID: \`${targetId}\` selama **${days} hari**.`);
});

// Fitur Ambil HTML dari Link Web
bot.command('gethtml', checkAccess, async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (!args[1]) return ctx.reply("⚠️ Masukkan URL web! Contoh: `/gethtml https://example.com`", { parse_mode: 'Markdown' });
    
    try {
        const response = await axios.get(args[1]);
        const htmlSnippet = response.data.substring(0, 1000);
        await ctx.reply(`📄 *Hasil HTML (1000 karakter pertama)*:\n\n\`\`\`html\n${htmlSnippet}\n\`\`\``, { parse_mode: 'Markdown' });
    } catch (e) {
        await ctx.reply("❌ Gagal mengambil HTML dari link tersebut.");
    }
});

// Fitur Auto Build APK
bot.action('build_apk', checkAccess, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("🚀 Memicu Auto Build APK...");
    try {
        await axios.post(
            `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/dispatches`,
            { event_type: "build_apk" },
            { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json" } }
        );
        await ctx.reply("✅ Build berhasil dipicu! Tunggu beberapa saat hingga proses selesai.");
    } catch (e) {
        await ctx.reply("❌ Gagal memicu build sistem.");
    }
});

// Cek Credit
bot.action('credit_saya', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (userId === OWNER_ID) {
        return ctx.reply("💳 Status Credit Anda: **UNLIMITED (OWNER)**", { parse_mode: 'Markdown' });
    }
    const snap = await get(ref(db, `users/${userId}`));
    const data = snap.val();
    const free = data ? data.freeLimit + 1 : 3;
    await ctx.reply(`💳 Sisa Kuota Gratis Anda: **${free} kali**.`, { parse_mode: 'Markdown' });
});

bot.action('owner_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("👑 **Owner Bot**: Raven\n📞 Kontak: @RavenZy", { parse_mode: 'Markdown' });
});
