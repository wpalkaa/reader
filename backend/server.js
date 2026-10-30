const express = require('express');
const fs = require('fs').promises;
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '150mb' }));

const CACHE_FILE = path.join(__dirname, 'translation_cache.json');

// Funkcja generująca unikalny identyfikator rozdziału na podstawie jego oryginalnej zawartości
function generateChapterHash(originalHtmlArray) {
    return crypto.createHash('sha256').update(JSON.stringify(originalHtmlArray)).digest('hex');
}

async function loadCache() {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf-8');
        const parsedData = JSON.parse(data);

        if(!parsedData.__PROGRESS__) {
            parsedData.__PROGRESS__ = {}
        };

        return parsedData;
    } catch (error) {
        return { __PROGRESS__ : {} };
    }
}

async function saveCache(cacheData) {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf-8');
}

// Endpoint do pobierania przetłumaczonego rozdziału
app.post('/api/cache/get', async (req, res) => {
    console.log(`[Info]: Received GET /cache/get request.`);
    try {
        const { originalHtmlArray } = req.body;
        if (!originalHtmlArray || !Array.isArray(originalHtmlArray)) {
            console.log(`[Info]: Request rejected. No valid text array provided.`)
            return res.status(400).json({ error: "No valid text array provided.." });
        }

        const chapterHash = generateChapterHash(originalHtmlArray);
        const cache = await loadCache();
        
        if (cache[chapterHash]) {
            console.log(`[Info]: Sending chapter from cache.`);
            return res.json({ translatedHtmlArray: cache[chapterHash] });
        }
        
        console.log(`[Info]: Request rejected - chapter not in cache.`)
        res.json({ translatedHtmlArray: null });
    } catch (error) {
        console.error("Cache read error:", error);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

// Endpoint do zapisywania przetłumaczonego rozdziału
app.post('/api/cache/save', async (req, res) => {
    console.log(`[Info]: Received POST /cache/save request.`);
    try {
        const { originalHtmlArray, translatedHtmlArray } = req.body;
        
        if (!originalHtmlArray || !translatedHtmlArray) {
            console.log(`[Info]: Request rejected. No valid text array provided.`)
            return res.status(400).json({ error: "No valid text array provided." });
        }

        const chapterHash = generateChapterHash(originalHtmlArray);
        const cache = await loadCache();

        // Zapisujemy tylko jeśli jeszcze nie istnieje w bazie
        if (!cache[chapterHash]) {
            console.log(`[Info]: Saving chapter to cache.`)
            cache[chapterHash] = translatedHtmlArray;
            await saveCache(cache);
        }

        console.log(`[Info]: Chapter saved to cache.`)
        res.json({ success: true });
    } catch (error) {
        console.error("Cache save error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// --- ENDPOINTY POSTĘPU CZYTANIA ---

app.post('/api/progress/get', async (req, res) => {
    console.log(`[Info]: Received GET /progress/get request.`);
    try {
        const { bookId } = req.body;
        const cache = await loadCache();
        res.json({ location: cache.__PROGRESS__[bookId] || null });
    } catch (error) {
        console.error("Błąd pobierania postępu:", error);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

app.post('/api/progress/save', async (req, res) => {
    console.log(`[Info]: Received POST /progress/save request.`);
    try {
        const { bookId, location } = req.body;
        const cache = await loadCache();
        
        cache.__PROGRESS__[bookId] = location;
        await saveCache(cache);
        
        res.json({ success: true });
    } catch (error) {
        console.error("Błąd zapisu postępu:", error);
        res.status(500).json({ error: "Błąd serwera" });
    }
});

app.listen(PORT, () => {
    console.log(`Cache server listening on port = ${PORT}`);
});