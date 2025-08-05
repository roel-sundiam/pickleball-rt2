const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testCoinPurchase() {
    console.log('🔍 Testing coin purchase flow...');
    
    try {
        // Step 1: Login to get a fresh token
        console.log('📝 Step 1: Logging in...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'bo2t',
                password: 'your-password-here' // You'll need to provide the correct password
            })
        });

        if (!loginResponse.ok) {
            console.log('❌ Login failed. Please update the password in this script.');
            const error = await loginResponse.json();
            console.log('Login error:', error);
            return;
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Login successful, token:', token.substring(0, 20) + '...');

        // Step 2: Test coin purchase
        console.log('🛒 Step 2: Testing coin purchase...');
        const purchaseData = {
            coinAmount: 200,
            gcashReference: 'TEST-REF-123',
            totalCost: 200,
            buyerName: 'Test User',
            phoneNumber: '09175105185'
        };

        const purchaseResponse = await fetch(`${API_BASE}/coins/purchase-request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(purchaseData)
        });

        const purchaseResult = await purchaseResponse.text();
        console.log('📤 Purchase response status:', purchaseResponse.status);
        console.log('📥 Purchase response body:', purchaseResult);

        if (purchaseResponse.ok) {
            console.log('✅ Coin purchase successful!');
        } else {
            console.log('❌ Coin purchase failed');
        }

    } catch (error) {
        console.error('💥 Test failed with error:', error.message);
    }
}

testCoinPurchase();