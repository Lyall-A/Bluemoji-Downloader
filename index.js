const fs = require("fs");
const https = require("https");
const path = require("path");

// Regex
const htmlRegex = /<a href="\/emoji\/.*?" class="img-wrapper-link is-.*? w-inline-block">\s*<img loading="lazy" alt=".*?" src=".*?"/g;
const emojiRegex = /<a href="\/emoji\/(.*?)" class="img-wrapper-link is-(.*?) w-inline-block">\s*<img loading="lazy" alt="(.*?)" src="(.*?)"/;
const fileRegex = /\\|\/|\*|\?|\"|\<|\>|\|/g;
const htmlHexRegex = /&#x([a-fA-F0-9]+);/g

const names = {};
const dirs = {};

(async () => {
    if (!fs.existsSync("Emojis")) fs.mkdirSync("Emojis"); // Create Emojis directory

    const html = await getPage().catch(() => console.log("Failed to get page!")); // Get https://bluemoji.io/
    const htmlMatch = html.match(htmlRegex); // Match all emoji elements

    const startDate = Date.now();

    // Download all emojis
    await (async function downloadEmoji(index = 0) {
        const [match, name, color, alt, imgPath] = htmlMatch[index].match(emojiRegex); // Try to get emoji name, color and image URL
        if (!name || !color || !imgPath) {
            // Skip emoji if name, color or image URL not matched
            console.log(`Couldn't get full match of an emoji! Match: ${match}`);
            return downloadNextEmoji();
        }

        const imgUrl = imgPath.startsWith("/") ? `https://bluemoji.io${imgPath}` : imgPath;

        if (alt) names[name] = fixName(alt);
        const fixedName = names[name] || fixName(name);

        // Create directory for emoji color if not already created
        const emojiColorPath = path.join("Emojis", fixFilePath(upperCase(color)));
        if (!dirs[color]) {
            if (!fs.existsSync(emojiColorPath)) fs.mkdirSync(emojiColorPath);
            dirs[color] = true;
        }

        const emojiPath = path.join(emojiColorPath, fixFilePath(`${fixedName}${path.extname(imgUrl) || ".png"}`));

        if (fs.existsSync(emojiPath)) {
            // Skip emoji if already downloaded
            log(`Already downloaded '${fixedName}' in ${color}`, color);
        } else {
            // Download emoji if not already downloaded
            await downloadImg(imgUrl, emojiPath);
            log(`Downloaded '${fixedName}' in ${color}`, color);
        }

        // Download next emoji
        return downloadNextEmoji();

        function downloadNextEmoji() { if (htmlMatch[index + 1]) return downloadEmoji(index + 1) };
    })();

    // Done
    const endDate = Date.now();
    console.log(`Done! Took ${(endDate - startDate) / 1000} seconds.`);
})();

function getPage() {
    return new Promise((resolve, reject) => {
        https.get("https://bluemoji.io/", res => {
            if (res.statusCode != 200 || res.headers["content-type"] != "text/html") return reject(res);
            let data = "";
            res.on("data", i => data += i);
            res.on("end", () => resolve(data));
        });
    });
}

function downloadImg(url, savePath) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode != 200) return reject(res);
            let data;
            res.on("data", i => data = data ? Buffer.concat([data, i]) : i);
            res.on("end", () => {
                fs.writeFileSync(savePath, data);
                resolve(res);
            });
        });
    });
}

function fixName(name) {
    return decodeHtmlHex(name).split("-").map(upperCase).join(" ");
}

function decodeHtmlHex(string) {
    return string.replace(htmlHexRegex, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function fixFilePath(path) {
    return path.replace(fileRegex, "");
}

function upperCase(string) { return `${string.charAt(0).toUpperCase()}${string.substring(1)}` }

function log(string, color) {
    console.log(`${log.colors[color?.toLowerCase()] || ""}${string}${log.reset}`);
}
log.colors = {
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
}
log.reset = "\x1b[0m";