import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
    doc, setDoc, collection, getDocs, addDoc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// DOM Elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');

const bankNameInput = document.getElementById('bank-name');
const splitCountInput = document.getElementById('split-count');
const initialBalanceInput = document.getElementById('initial-balance');
const createBankBtn = document.getElementById('create-bank');
const banksContainer = document.getElementById('banks-container');

const newIncomeInput = document.getElementById('new-income');
const addIncomeBtn = document.getElementById('add-income');

let currentUser = null;

// Auth Logic
registerBtn.onclick = async () => {
    try {
        await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        alert("Registered!");
    } catch (err) {
        alert(err.message);
    }
};

loginBtn.onclick = async () => {
    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    } catch (err) {
        alert(err.message);
    }
};

logoutBtn.onclick = async () => {
    await signOut(auth);
};

onAuthStateChanged(auth, async user => {
    currentUser = user;
    if (user) {
        authSection.style.display = 'none';
        appSection.style.display = 'block';
        loadBanks();
    } else {
        authSection.style.display = 'block';
        appSection.style.display = 'none';
        banksContainer.innerHTML = '';
    }
});

// Create Bank
createBankBtn.onclick = async () => {
    const name = bankNameInput.value;
    const splits = parseInt(splitCountInput.value);
    const balance = parseFloat(initialBalanceInput.value);

    if (!name || !splits || isNaN(balance)) return alert("Please fill all fields.");

    const categories = [];
    const splitPercent = Math.floor(100 / splits);

    for (let i = 0; i < splits; i++) {
        const catPercent = i === splits - 1 ? 100 - (splitPercent * (splits - 1)) : splitPercent;
        const catBalance = (catPercent / 100) * balance;

        categories.push({
            name: `Category ${i + 1}`,
            percentage: catPercent,
            balance: catBalance,
            subcategories: []
        });
    }

    await addDoc(collection(db, "users", currentUser.uid, "banks"), {
        bankName: name,
        totalBalance: balance,
        categories
    });

    bankNameInput.value = '';
    splitCountInput.value = '';
    initialBalanceInput.value = '';

    loadBanks();
};


// Load Banks
async function loadBanks() {
    banksContainer.innerHTML = '';
    const bankDocs = await getDocs(collection(db, "users", currentUser.uid, "banks"));
    bankDocs.forEach(docSnap => {
        const data = docSnap.data();
        const bankId = docSnap.id;
        const bankDiv = document.createElement('div');
        bankDiv.innerHTML = `
      <h4>${data.bankName} (Total: ${data.totalBalance.toFixed(2)})</h4>
      ${data.categories.map((cat, i) => `
        <div style="margin-left: 20px;">
          <input value="${cat.name}" onchange="updateCategoryName('${bankId}', ${i}, this.value)">
          <input type="number" value="${cat.percentage}" onchange="updateCategoryPercent('${bankId}', ${i}, this.value)"> %
          <strong>Balance:</strong> ${cat.balance.toFixed(2)}
          <button onclick="addSubcategory('${bankId}', ${i})">Add Detail</button>
          <div id="sub-${bankId}-${i}">
            ${cat.subcategories.map((sub, j) => `
              <div style="margin-left: 20px;">
                <input value="${sub.name}" onchange="updateSubName('${bankId}', ${i}, ${j}, this.value)">
                <input type="number" value="${sub.percentage}" onchange="updateSubPercent('${bankId}', ${i}, ${j}, this.value)"> %
                <strong>Balance:</strong> ${sub.balance.toFixed(2)}
                <button onclick="spend('${bankId}', ${i}, ${j})">Spend</button>
                <input id="spend-${bankId}-${i}-${j}" type="number" placeholder="Amount">
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    `;
        banksContainer.appendChild(bankDiv);
    });
}

// Add Income
addIncomeBtn.onclick = async () => {
    const amount = parseFloat(newIncomeInput.value);
    if (!amount || isNaN(amount)) return;

    const bankDocs = await getDocs(collection(db, "users", currentUser.uid, "banks"));
    for (const docSnap of bankDocs.docs) {
        const data = docSnap.data();
        const bankId = docSnap.id;
        data.totalBalance += amount;

        data.categories.forEach(cat => {
            const catIncome = (cat.percentage / 100) * amount;
            cat.balance += catIncome;

            cat.subcategories.forEach(sub => {
                sub.balance += (sub.percentage / 100) * catIncome;
            });
        });

        await updateDoc(doc(db, "users", currentUser.uid, "banks", bankId), data);
    }

    newIncomeInput.value = '';
    loadBanks();
};

// Global for inline handlers
window.addSubcategory = async (bankId, catIdx) => {
    const bankRef = doc(db, "users", currentUser.uid, "banks", bankId);
    const bankSnap = await getDoc(bankRef);
    const bankData = bankSnap.data();
    const cat = bankData.categories[catIdx];

    const totalSubPercent = cat.subcategories.reduce((sum, s) => sum + s.percentage, 0);
    if (totalSubPercent >= 100) return alert("Subcategories already at 100%");

    cat.subcategories.push({
        name: "New Sub",
        percentage: 0,
        balance: 0
    });

    await updateDoc(bankRef, bankData);
    loadBanks();
};

window.updateCategoryName = async (bankId, idx, val) => {
    const ref = doc(db, "users", currentUser.uid, "banks", bankId);
    const snap = await getDoc(ref);
    const data = snap.data();
    data.categories[idx].name = val;
    await updateDoc(ref, data);
};

window.updateCategoryPercent = async (bankId, idx, val) => {
    const ref = doc(db, "users", currentUser.uid, "banks", bankId);
    const snap = await getDoc(ref);
    const data = snap.data();
    const newPerc = parseFloat(val);
    if (isNaN(newPerc)) return;
    data.categories[idx].percentage = newPerc;
    await updateDoc(ref, data);
};

window.updateSubName = async (bankId, catIdx, subIdx, val) => {
    const ref = doc(db, "users", currentUser.uid, "banks", bankId);
    const snap = await getDoc(ref);
    const data = snap.data();
    data.categories[catIdx].subcategories[subIdx].name = val;
    await updateDoc(ref, data);
};

window.updateSubPercent = async (bankId, catIdx, subIdx, val) => {
    const ref = doc(db, "users", currentUser.uid, "banks", bankId);
    const snap = await getDoc(ref);
    const data = snap.data();
    const newPerc = parseFloat(val);
    if (isNaN(newPerc)) return;
    data.categories[catIdx].subcategories[subIdx].percentage = newPerc;
    await updateDoc(ref, data);
};

window.spend = async (bankId, catIdx, subIdx) => {
    const input = document.getElementById(`spend-${bankId}-${catIdx}-${subIdx}`);
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) return;

    const ref = doc(db, "users", currentUser.uid, "banks", bankId);
    const snap = await getDoc(ref);
    const data = snap.data();

    data.totalBalance -= amount;
    data.categories[catIdx].balance -= amount; // ← update category balance too
    data.categories[catIdx].subcategories[subIdx].balance -= amount;

    await updateDoc(ref, data);
    loadBanks();
};

