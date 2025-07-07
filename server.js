const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const path = require('path');
const PORT = process.env.PORT || 3000;

const fs = require('fs');

app.use(express.json()); // JSON-Parsing aktivieren

const dataFilePath = path.join(__dirname, '.data', 'data.json'); // Pfad zur data.json


let slugs = [];

// Middleware zur Umleitung von soft-encyclopedia.net auf www.soft-encyclopedia.net
app.use((req, res, next) => {
  if (req.headers.host === 'soft-encyclopedia.net') {
    return res.redirect(301, `https://www.soft-encyclopedia.net${req.url}`);
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/add-slug', (req, res) => {
  const { slug } = req.body;
  slugs.push(slug);
  sendNewSlugEvent(slug);
  res.status(200).send('Slug hinzugefügt');
});

function sendNewSlugEvent(slug) {
  httpServer.emit('newSlug', slug);
}

function sendClearSlugsEvent() {
  httpServer.emit('clearSlugs');
}

app.get('/sse/slugs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const slugListener = (slug) => {
    res.write(`data: ${JSON.stringify(slug)}\n\n`);
  };

  const clearListener = () => {
    res.write(`event: clearSlugs\n`);
    res.write(`data: {}\n\n`);
  };

  httpServer.on('newSlug', slugListener);
  httpServer.on('clearSlugs', clearListener);

  req.on('close', () => {
    httpServer.off('newSlug', slugListener);
    httpServer.off('clearSlugs', clearListener);
  });
});

// Route zum Initialisieren/Leeren der Slug-Liste
app.get('/api/reset-slugs', (req, res) => {
  slugs = [];
  sendClearSlugsEvent();
  res.status(200).send('Slugs zurückgesetzt und Event gesendet');
});

// Route für anzeige.html
app.get('/anzeige.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'anzeige.html'));
});

// Catch-all Route für die Umleitung auf index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Debugging für neue Slugs
httpServer.on('newSlug', slug => {
  console.log('Neuer Slug empfangen:', slug);
});

function saveToJSON(newEntry) {
    let data = [];

    // Prüfen, ob die Datei existiert und Inhalte hat
    if (fs.existsSync(dataFilePath)) {
        const fileContent = fs.readFileSync(dataFilePath, 'utf8');
        if (fileContent) {
            data = JSON.parse(fileContent);
        }
    }

    data.push(newEntry); // Neues Wort hinzufügen

    // Maximal 50 Einträge speichern (optional)
    if (data.length > 50) {
        data = data.slice(-50);
    }

    // Speichern der aktualisierten Liste
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}
// POST: Spracheingaben speichern
app.post('/saveSpeech', (req, res) => {
    const { text } = req.body;

    console.log("Empfangener Text:", text); // Debugging

    if (!text) {
        console.log("Fehler: Kein Text erhalten!");
        return res.status(400).json({ error: 'Kein Text erhalten' });
    }

    saveToJSON({ text, timestamp: new Date().toISOString() });

    console.log("Text erfolgreich gespeichert!");
    res.json({ message: 'Erfolgreich gespeichert' });
});


// GET: Gespeicherte Spracheingaben abrufen
app.get('/getSpeechData', (req, res) => {
    if (!fs.existsSync(dataFilePath)) {
        return res.json([]);
    }

    const data = fs.readFileSync(dataFilePath, 'utf8');
    res.json(JSON.parse(data));
});

app.get('/debug-data', (req, res) => {
    if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        res.send(`<pre>${data}</pre>`);
    } else {
        res.send('data.json existiert nicht!');
    }
});

app.get('/sse/slugs', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Testnachricht
    setInterval(() => {
        // Beispiel einer richtigen JSON-Nachricht
        const message = JSON.stringify({ text: "Test-Nachricht" });
        res.write(`data: ${message}\n\n`);
    }, 3000);
});

app.get('/keep-alive', (req, res) => {
    res.json({ status: 'alive' });
});


// Ping Route zum Empfang von Pings
app.get('/ping', (req, res) => {
    console.log('Ping von index.html erhalten!');
    res.send('Pong');
});

// Optional: Route für den letzten Ping-Zeitstempel (falls nötig für Anzeige)
let lastPingTime = null;
app.get('/last-ping', (req, res) => {
    res.json({ lastPingTime });
});

// Route zum Empfangen von Pings und Setzen des Zeitstempels
app.get('/ping', (req, res) => {
    lastPingTime = new Date().toISOString();  // Zeitstempel setzen
    res.send('Pong'); // Antwort an den Client
    console.log('Ping von index.html erhalten!');
});

