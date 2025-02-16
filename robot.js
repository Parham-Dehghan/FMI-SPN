const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');  // برای خواندن فایل اکسل

// ===== تنظیمات اولیه =====
const TOKEN = "7793051705:AAGDMdjyjY2QbUtek6Cr4rZ66A-XHd0KXCI";  // توکن ربات خود را جایگزین کنید
const EXCEL_FILE = './Fault code.xlsx';   // مسیر فایل اکسل

// ایجاد ربات تلگرام
const bot = new TelegramBot(TOKEN, { polling: true });

// راه‌اندازی اپلیکیشن Express
const app = express();
app.use(express.json());

// پیکربندی logging
bot.on('polling_error', (error) => {
    console.error(error);
});

// تابع جستجو در فایل اکسل
const searchExcel = (spn, fmi) => {
    try {
        const data = fs.readFileSync(EXCEL_FILE, { encoding: 'utf8' });
        const rows = data.split('\n');
        const header = rows[0].split(',');
        const spnIndex = header.indexOf('SPN');
        const fmiIndex = header.indexOf('FMI');
        const repairGuideIndex = header.indexOf('راهنمایی تعمیر و نگهداری');
        const faultMeaningIndex = header.indexOf('معنی عیب');
        const faultMeaningCnIndex = header.indexOf('故障含义');
        const repairGuideCnIndex = header.indexOf('维修指导');

        const result = rows.slice(1).find(row => {
            const columns = row.split(',');
            return columns[spnIndex] === spn.toString() && columns[fmiIndex] === fmi.toString();
        });

        if (result) {
            const columns = result.split(',');
            return `
                راهنمایی تعمیر و نگهداری: ${columns[repairGuideIndex] || "راهنمایی موجود نیست"}
                معنی عیب: ${columns[faultMeaningIndex] || "معنی عیب موجود نیست"}
                故障含义: ${columns[faultMeaningCnIndex] || "故障含义 موجود نیست"}
                维修指导: ${columns[repairGuideCnIndex] || "维修指导 موجود نیست"}
            `;
        }
        return "نتیجه‌ای یافت نشد.";
    } catch (e) {
        console.error(`خطا در خواندن فایل اکسل: ${e}`);
        return "خطا در خواندن فایل اکسل.";
    }
};

// توابع دستورات تلگرام
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "لطفاً دو عدد (SPN و FMI) را به صورت 'عدد1 عدد2' وارد کنید.");
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const parts = text.split(' ');

    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const [spn, fmi] = parts.map(Number);
        const response = searchExcel(spn, fmi);
        bot.sendMessage(chatId, response);
    } else {
        bot.sendMessage(chatId, "فرمت ورودی صحیح نیست. لطفاً دو عدد به صورت 'عدد1 عدد2' وارد کنید.");
    }
});

// راه‌اندازی Webhook
const setWebhook = () => {
    const WEBHOOK_URL = "https://yourdomain.com/telegram";  // جایگزین کنید با دامنه عمومی خود که باید با HTTPS باشد
    bot.setWebHook(WEBHOOK_URL)
        .then(() => {
            console.log("Webhook تنظیم شد: %s", WEBHOOK_URL);
        })
        .catch(error => console.error("خطا در تنظیم Webhook:", error));
};

// تنظیم Webhook هنگام شروع برنامه
setWebhook();

// راه‌اندازی سرور Express
app.post('/telegram', (req, res) => {
    try {
        const jsonUpdate = req.body;
        const update = new TelegramBot.Update(jsonUpdate, bot);
        bot.processUpdate(update);  // پردازش آپدیت به صورت asynchronous
        res.send('ok');
    } catch (e) {
        console.error(`خطا در پردازش آپدیت: ${e}`);
        res.status(500).send('خطا در پردازش درخواست.');
    }
});

app.get('/', (req, res) => {
    res.send("ربات تلگرام 24 ساعته در حال اجراست.");
});

// اجرای سرور روی پورت 5000
const port = 5000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
