import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { PlusCircle, Wallet } from 'lucide-react';

const API_URL = 'http://localhost:3001/api'; // User Backend

// Types
interface Trip {
  id: string;
  name: string;
  participants: string[];
  baseCurrency: string;
  exercises?: Expense[]; // typo in backend? no, 'expenses'
  expenses: Expense[];
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  payer: string;
  involves: string[];
}

interface CalculationResult {
  totalExpenses: number;
  settlements: { from: string; to: string; amount: string }[];
}

// --- Components ---

// 1. Home / Create Trip
function Home() {
  const [name, setName] = useState('');
  const [participants, setParticipants] = useState('');
  const [currency, setCurrency] = useState('USD');
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const partsArray = participants.split(',').map(p => p.trim()).filter(p => p);
    try {
      const res = await axios.post(`${API_URL}/trips`, {
        name,
        participants: partsArray,
        baseCurrency: currency
      });
      navigate(`/trip/${res.data.id}`);
    } catch (err) {
      alert("Error creating trip");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <Wallet className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Trip Budget Planner</h1>
        <p className="text-center text-gray-500 mb-8">Split costs, track expenses, travel stress-free.</p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Trip Name</label>
            <input
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Summer in Paris"
              value={name} onChange={e => setName(e.target.value)} required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Participants (comma separated)</label>
            <input
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Hari, John, Sarah"
              value={participants} onChange={e => setParticipants(e.target.value)} required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Base Currency</label>
            <select
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Start Planning
          </button>
        </form>
      </div>
    </div>
  );
}

// 2. Trip Dashboard
function TripDashboard() {
  const { id } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balance'>('expenses');

  // New Expense State
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Results
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);

  useEffect(() => {
    fetchTrip();
  }, [id]);

  const fetchTrip = async () => {
    try {
      const res = await axios.get(`${API_URL}/trips/${id}`);
      setTrip(res.data);
      // setPayer(res.data.participants[0]); // Don't reset payer every time
      if (!payer && res.data.participants.length > 0) setPayer(res.data.participants[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/trips/${id}/expenses`, {
        description: desc,
        amount: amount,
        currency: trip.baseCurrency, // simplified
        payer: payer,
        involves: trip.participants
      });
      setDesc('');
      setAmount('');
      fetchTrip();
    } catch (err) {
      alert("Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateSplit = async () => {
    setCalculation(null);
    try {
      const res = await axios.get(`${API_URL}/trips/${id}/calculate`);
      setCalculation(res.data);
    } catch (err: any) {
      alert("Error connecting to Calculation Service: " + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div className="text-center p-10">Loading Trip...</div>;
  if (!trip) return <div className="text-center p-10">Trip Not Found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Wallet size={24} /> Budget Planner
          </Link>
          <div className="text-gray-500">{trip.name} ({trip.participants.length} people)</div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-2 px-4 border-b-2 font-medium ${activeTab === 'expenses' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Expenses
          </button>
          <button
            onClick={() => { setActiveTab('balance'); calculateSplit(); }}
            className={`py-2 px-4 border-b-2 font-medium ${activeTab === 'balance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Balances & Settlement
          </button>
        </div>

        {activeTab === 'expenses' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Expense Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PlusCircle className="text-blue-500" /> Add Expense
                </h2>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700">Description</label>
                    <input type="text" required value={desc} onChange={e => setDesc(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Amount ({trip.baseCurrency})</label>
                    <input type="number" required value={amount} onChange={e => setAmount(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Paid By</label>
                    <select value={payer} onChange={e => setPayer(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2">
                      {trip.participants.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <button disabled={isSubmitting} type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                    {isSubmitting ? 'Adding...' : 'Add Expense'}
                  </button>
                </form>
              </div>
            </div>

            {/* Expense List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                </div>
                <ul className="divide-y divide-gray-100">
                  {(trip.expenses || []).length === 0 ? (
                    <li className="p-6 text-center text-gray-500">No expenses yet.</li>
                  ) : (
                    trip.expenses.map((exp) => (
                      <li key={exp.id} className="p-6 flex justify-between items-center hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900">{exp.description}</p>
                          <p className="text-sm text-gray-500">{exp.payer} paid for everyone</p>
                        </div>
                        <div className="font-semibold text-gray-900">
                          {trip.baseCurrency} {exp.amount.toFixed(2)}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="max-w-2xl mx-auto">
            {!calculation ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Calculating optimal settlements...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-center mb-6">Settlement Plan</h2>

                <div className="bg-blue-50 rounded-lg p-4 mb-8 text-center">
                  <p className="text-sm text-blue-600 uppercase tracking-wide font-semibold">Total Trip Cost</p>
                  <p className="text-3xl font-bold text-blue-900">{trip.baseCurrency} {calculation.totalExpenses.toFixed(2)}</p>
                </div>

                <div className="space-y-4">
                  {calculation.settlements.length === 0 ? (
                    <div className="text-center text-green-600 font-medium">All settled up! No one owes anything.</div>
                  ) : (
                    calculation.settlements.map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">{tx.from}</span>
                          <span className="text-gray-400">owes</span>
                          <span className="font-semibold text-gray-900">{tx.to}</span>
                        </div>
                        <div className="font-bold text-green-600">
                          {trip.baseCurrency} {tx.amount}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trip/:id" element={<TripDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
