// splitLogic.js
// Algorithm to minimize cash flow (simplified for the assignment)

function calculateDebts(expenses) {
    // 1. Calculate net balance for each person
    // expenses = [{ payer: "Alice", amount: 100, involves: ["Alice", "Bob"] }]
    
    const balances = {};
    
    // Initialize balances
    expenses.forEach(exp => {
        const splitAmount = exp.amount / exp.involves.length;
        
        // Payer gets positive balance (they paid, so they are owed money)
        if (!balances[exp.payer]) balances[exp.payer] = 0;
        balances[exp.payer] += exp.amount;

        // Participants get negative balance (they consumed, so they owe money)
        exp.involves.forEach(person => {
            if (!balances[person]) balances[person] = 0;
            balances[person] -= splitAmount;
        });
    });

    // 2. Separate into debtors (neg) and creditors (pos)
    let debtors = [];
    let creditors = [];

    for (const [person, amount] of Object.entries(balances)) {
        // Round to 2 decimals to avoid floating point weirdness
        const rounded = Math.round(amount * 100) / 100;
        if (rounded < -0.01) debtors.push({ person, amount: rounded });
        if (rounded > 0.01) creditors.push({ person, amount: rounded });
    }

    // 3. Match them up
    const transactions = [];
    let dIndex = 0;
    let cIndex = 0;

    // While there are still debts to settle
    while (dIndex < debtors.length && cIndex < creditors.length) {
        const debtor = debtors[dIndex];
        const creditor = creditors[cIndex];

        // The amount to settle is the minimum of what debtor owes vs what creditor is owed
        const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        transactions.push({
            from: debtor.person,
            to: creditor.person,
            amount: amount.toFixed(2)
        });

        // Update balances
        debtor.amount += amount;
        creditor.amount -= amount;

        // If settled, move to next
        if (Math.abs(debtor.amount) < 0.01) dIndex++;
        if (creditor.amount < 0.01) cIndex++;
    }

    return transactions;
}

module.exports = { calculateDebts };
