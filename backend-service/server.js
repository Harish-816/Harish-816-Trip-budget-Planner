const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
// In a real scalability scenario, these would be env vars
const CLASSMATE_API_URL = process.env.CLASSMATE_API_URL || 'http://localhost:4000/api/split';
const PUBLIC_CURRENCY_API = 'https://api.frankfurter.app/latest'; // Free Public API

app.use(cors());
app.use(bodyParser.json());

// --- Persistence Layer (In-Memory for Demo Stability, Replace with MongoDB for Production) ---
const db = {
    trips: {}
    // Structure: { 'tripId': { id, name, participants: [], expenses: [], baseCurrency: 'USD' } }
};

// --- Routes ---

// 1. Health Check
app.get('/', (req, res) => {
    res.json({ status: "User Trip Backend is running" });
});

// 2. Create a Trip
app.post('/api/trips', (req, res) => {
    const { name, participants, baseCurrency } = req.body;
    if (!name || !participants) {
        return res.status(400).json({ error: "Name and participants required" });
    }

    const newTrip = {
        id: uuidv4(),
        name,
        participants, // Array of strings (names)
        baseCurrency: baseCurrency || 'USD',
        expenses: [],
        createdAt: new Date()
    };

    db.trips[newTrip.id] = newTrip;
    console.log(`Trip created: ${name} (${newTrip.id})`);
    res.status(201).json(newTrip);
});

// 3. Get All Trips
app.get('/api/trips', (req, res) => {
    res.json(Object.values(db.trips));
});

// 4. Get Single Trip
app.get('/api/trips/:id', (req, res) => {
    const trip = db.trips[req.params.id];
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json(trip);
});

// 5. Get All Expenses (Production-ready Improvement)
app.get('/api/expenses', (req, res) => {
    const allExpenses = Object.values(db.trips).flatMap(trip =>
        trip.expenses.map(exp => ({
            ...exp,
            tripId: trip.id,
            tripName: trip.name
        }))
    );
    res.json(allExpenses);
});

// --- Production-Ready Aliases ---
app.get('/trips', (req, res) => {
    res.json(Object.values(db.trips));
});

app.get('/expenses', (req, res) => {
    const allExpenses = Object.values(db.trips).flatMap(trip =>
        trip.expenses.map(exp => ({
            ...exp,
            tripId: trip.id,
            tripName: trip.name
        }))
    );
    res.json(allExpenses);
});

// 6. Add Expense to Trip
app.post('/api/trips/:id/expenses', (req, res) => {
    const trip = db.trips[req.params.id];
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const { description, amount, currency, payer, involves } = req.body;

    // Validation
    if (!amount || !payer || !involves) {
        return res.status(400).json({ error: "Missing expense details" });
    }

    const newExpense = {
        id: uuidv4(),
        description,
        amount: parseFloat(amount),
        currency: currency || trip.baseCurrency,
        payer,
        involves, // Array of names
        date: new Date()
    };

    trip.expenses.push(newExpense);
    res.status(201).json(newExpense);
});

// 7. Generate "Final Report" (The Distributed System Logic)
// This demonstrates Orchestration involved in Cloud Computing
app.get('/api/trips/:id/calculate', async (req, res) => {
    const trip = db.trips[req.params.id];
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    try {
        console.log(`Starting calculation for trip: ${trip.name}`);

        // Step A: Normalize all expenses to Trip's Base Currency
        // calls Public API if needed
        const normalizedExpenses = await normalizeExpenses(trip.expenses, trip.baseCurrency);

        // Step B: Call Classmate API to calculate split
        console.log("Calling Classmate API...");
        try {
            const response = await axios.post(CLASSMATE_API_URL, { expenses: normalizedExpenses });
            const transactions = response.data.transactions;

            res.json({
                tripName: trip.name,
                baseCurrency: trip.baseCurrency,
                totalExpenses: normalizedExpenses.reduce((sum, e) => sum + e.amount, 0),
                settlements: transactions
            });
        } catch (err) {
            console.error("Classmate API Failed:", err.message);
            res.status(503).json({ error: "Failed to contact Calculation Service (Classmate API)" });
        }

    } catch (err) {
        console.error("Orchestration Error:", err);
        res.status(500).json({ error: "Internal Server Error during calculation" });
    }
});

// --- Helper Functions ---

async function normalizeExpenses(expenses, baseCurrency) {
    // If all expenses are already in base currency, return them
    // optimization: group by currency to minimize API calls

    const convertedExpenses = [];

    // Real-world: Batch these or cache rates.
    // For demo: We'll fetch rates for any expense not in base currency

    for (const exp of expenses) {
        if (exp.currency === baseCurrency) {
            convertedExpenses.push(exp);
        } else {
            // Call Public API
            try {
                // Example: Convert EUR to USD
                // https://api.frankfurter.app/latest?amount=10&from=EUR&to=USD
                const url = `${PUBLIC_CURRENCY_API}?amount=${exp.amount}&from=${exp.currency}&to=${baseCurrency}`;
                const apiRes = await axios.get(url);
                const convertedAmount = apiRes.data.rates[baseCurrency];

                convertedExpenses.push({
                    ...exp,
                    amount: convertedAmount,
                    originalAmount: exp.amount,
                    originalCurrency: exp.currency
                });
            } catch (e) {
                console.error(`Failed to convert ${exp.currency} to ${baseCurrency}`);
                // Fallback: just use 1:1 if API fails (so demo doesn't crash)
                convertedExpenses.push(exp);
            }
        }
    }
    return convertedExpenses;
}

app.listen(PORT, () => {
    console.log(`Trip Backend running on http://localhost:${PORT}`);
});
