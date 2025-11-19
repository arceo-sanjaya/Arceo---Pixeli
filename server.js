const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/pxpic', async (req, res) => {
    try {
        const params = new URLSearchParams(req.body);
        const response = await fetch("https://pxpic.com/callAiFunction", {
            method: "POST",
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded' 
            },
            body: params
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;