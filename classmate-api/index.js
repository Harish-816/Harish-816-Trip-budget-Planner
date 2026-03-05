const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { calculateDebts } = require('./splitLogic');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Health Check
app.get('/', (req, res) => {
    res.json({ status: "Classmate API (Fare Splitter) is running" });
});

// The Core Service Endpoint
app.post('/api/split', (req, res) => {
    try {
        const { expenses } = req.body;

        if (!expenses || !Array.isArray(expenses)) {
            return res.status(400).json({ error: "Invalid input. 'expenses' array required." });
        }

        console.log(`Received split request for ${expenses.length} expenses.`);

        const transactions = calculateDebts(expenses);

        res.json({
            status: "success",
            transactions: transactions
        });
    } catch (error) {
        console.error("Error processing split:", error);
        res.status(500).json({ error: "Internal processing error" });
    }
});

app.listen(PORT, () => {
    console.log(`Classmate Service running on http://localhost:${PORT}`);
});
