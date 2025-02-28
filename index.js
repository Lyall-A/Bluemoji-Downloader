const fs = require("fs");
const https = require("https");
const path = require("path");

const downloadAllAtOnce = true;

// Regex
const emojisRegex = /<a href="\/emoji\/.+?" class="img-wrapper-link is-.+? w-inline-block">\s*?<img loading="lazy" alt=".*?" src=".+?"/g;
const emojiRegex = /<a href="\/emoji\/(.+?)" class="img-wrapper-link is-(.+?) w-inline-block">\s*?<img loading="lazy" alt="(.*?)" src="(.+?)"/;

const emojisPath = path.resolve("Emojis");

(async function main() {
    if (!fs.existsSync(emojisPath)) fs.mkdirSync(emojisPath); // Create Emojis directory

    const html = await getPage().catch(() => console.log("Failed to get page!")); // Get https://bluemoji.io/
    const htmlEmojis = html.match(emojisRegex); // Match all emoji HTML elements

    const startDate = Date.now();

    let downloaded = 0;
    let failed = 0;

    // Loop through each emoji HTML element
    for (const htmlEmoji of htmlEmojis) {
        const [match, name, color, realName, imgPath] = htmlEmoji.match(emojiRegex); // Try to get emoji details
        const imgUrl = imgPath.replace(/^\/+/, "https://bluemoji.io/");

        const fixedName = fixName(realName || name);

        const emojiColorPath = path.join(emojisPath, capitalize(color));
        if (!fs.existsSync(emojiColorPath)) fs.mkdirSync(emojiColorPath);

        const emojiPath = path.join(emojiColorPath, fixFilePath(`${fixedName}${path.extname(imgUrl) || ".png"}`));

        if (fs.existsSync(emojiPath)) {
            log(`Already downloaded '${fixedName}' in ${color}`, color);
            downloaded++;
            checkProgress();
            continue;
        }

        if (downloadAllAtOnce) {
            download();
        } else {
            await download();
        }

        async function download() {
            try {
                await downloadImg(imgUrl, emojiPath);
                log(`Downloaded '${fixedName}' in ${color}`, color);
                downloaded++;
            } catch (err) {
                log(`Failed to download '${fixedName}' in ${color}: ${err}`, "red");
                failed++;
            }
            checkProgress();
        }
    }

    function checkProgress() {
        if ((downloaded + failed) >= htmlEmojis.length) {
            const endDate = Date.now();
            console.log(`Downloaded ${downloaded} of ${htmlEmojis.length} emojis in ${(endDate - startDate) / 1000} seconds`);
        }
    }
})();

// Functions

function getPage() {
    return new Promise((resolve, reject) => {
        https.get("https://bluemoji.io/", res => {
            if (res.statusCode !== 200 || res.headers["content-type"] !== "text/html") return reject(`Got status code ${res.statusCode} and content type ${res.headers["content-type"]}`);
            const data = [];
            res.on("data", i => data.push(i));
            res.on("end", () => resolve(Buffer.concat(data).toString()));
        });
    });
}

function downloadImg(url, savePath) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode !== 200) return reject(`Got status code ${res.statusCode}`);
            const data = [];
            res.on("data", i => data.push(i));
            res.on("end", () => {
                fs.writeFileSync(savePath, Buffer.concat(data));
                resolve();
            });
        });
    });
}

function fixName(name) {
    return decodeHtmlHex(name).split("-").map(capitalize).join(" ");
}

function decodeHtmlHex(string) {
    return string.replace(/&#x([a-fA-F0-9]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function fixFilePath(path) {
    return path.replace(/\\|\/|\:|\*|\?|\"|\<|\>|\|/g, "");
}

function capitalize(string) { return `${string.charAt(0).toUpperCase()}${string.substring(1)}` }

function log(string, color) {
    const colors = {
        // https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
        // https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
        black: "\x1b[90m", // Changed to gray
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        violet: "\x1b[35m", // Added
        pink: "\x1b[95m", // Added
        cyan: "\x1b[36m",
        teal: "\x1b[36m", // Added
        white: "\x1b[37m",
        gray: "\x1b[90m"
    };
    const reset = "\x1b[0m";

    console.log(`${colors[color?.toLowerCase()] || ""}${string}${reset}`);
}
