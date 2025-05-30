// Global variables
let currentUser = null;
let userStats = {
    totalEarnings: 0,
    lifetimeEarnings: 0,
    totalViews: 0,
    todayViews: 0,
    streakDays: 0,
    username: '',
    email: '',
    lastAdWatch: null,
    adHistory: [],
    withdrawalHistory: []
};

const MINIMUM_WITHDRAWAL_AMOUNT = 2.0; // Updated to $2.0 as per your request

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeInteractiveElements();
});

async function initializeApp() {
    // Firebase services (auth, db) are expected to be on the window object
    // from index.html's <script type="module">
    if (window.onAuthStateChanged && window.auth) {
        window.onAuthStateChanged(window.auth, async (user) => {
            if (user && user.emailVerified) {
                currentUser = user;
                await loadUserData();
                showDashboard();
            } else {
                if (user && !user.emailVerified) {
                    console.log("User email not verified.");
                }
                currentUser = null; 
                showLandingPage(); 
            }
        });
    } else {
        console.error("Firebase Auth or onAuthStateChanged not available on window object.");
        showLandingPage(); 
    }
}

function showLandingPage() {
    document.getElementById('landing-page').classList.add('active');
    document.getElementById('dashboard-page').classList.remove('active');
}

function showDashboard() {
    document.getElementById('landing-page').classList.remove('active');
    document.getElementById('dashboard-page').classList.add('active');
    updateDashboard();
}

function scrollToStats() {
    document.getElementById('stats').scrollIntoView({ behavior: 'smooth' });
}

function showAuthModal(mode = 'login') {
    const modal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-password-form');

    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';
    
    if (mode === 'login') loginForm.style.display = 'flex';
    else if (mode === 'register') registerForm.style.display = 'flex';
    else if (mode === 'forgot') forgotForm.style.display = 'flex';
    
    modal.classList.add('active');
}

function hideAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
}

function switchAuthMode(mode) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-password-form');
    
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    forgotForm.style.display = 'none';
    
    if (mode === 'login') loginForm.style.display = 'flex';
    else if (mode === 'register') registerForm.style.display = 'flex';
    else if (mode === 'forgot') forgotForm.style.display = 'flex';
}

function showForgotPassword() { switchAuthMode('forgot'); }

async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const forgotBtn = document.getElementById('forgot-btn');
    const revert = addLoadingState(forgotBtn, 'Sending...');
    try {
        await window.sendPasswordResetEmail(window.auth, email);
        showToast('Reset link sent!', 'Please check your email.', 'success');
        hideAuthModal();
    } catch (error) {
        showToast('Error', error.message || 'Failed to send reset email.', 'error');
    } finally {
        revert();
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const loginBtn = document.getElementById('login-btn');
    const revert = addLoadingState(loginBtn, 'Signing In...');
    try {
        const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
        if (!userCredential.user.emailVerified) {
            await window.signOut(window.auth); 
            currentUser = null; 
            throw new Error('Please verify your email address before signing in.');
        }
        hideAuthModal();
        showToast('Welcome back!', 'Successfully signed in.', 'success');
        // onAuthStateChanged will handle loading data and showing dashboard
    } catch (error) {
        showToast('Login failed', error.message || 'Check credentials.', 'error');
    } finally {
        revert();
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const registerBtn = document.getElementById('register-btn');
    const revert = addLoadingState(registerBtn, 'Creating Account...');
    try {
        const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
        await window.updateProfile(userCredential.user, { displayName: username });
        await window.sendEmailVerification(userCredential.user);
        await window.signOut(window.auth); 
        hideAuthModal();
        showToast('Account created!', 'Please verify your email before signing in.', 'success');
    } catch (error) {
        showToast('Registration failed', error.message || 'Try different credentials.', 'error');
    } finally {
        revert();
    }
}

async function logout() {
    try {
        await window.signOut(window.auth);
        currentUser = null;
        userStats = { 
            totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0,
            streakDays: 0, username: '', email: '', lastAdWatch: null,
            adHistory: [], withdrawalHistory: []
        };
        showLandingPage();
        showToast('Signed out', 'Successfully signed out.', 'info');
    } catch (error) {
        showToast('Error', 'Failed to sign out.', 'error');
    }
}

async function loadUserData() {
    if (!currentUser || !window.db) {
        userStats = {
            totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0,
            streakDays: 0, username: 'Guest', email: '', lastAdWatch: null,
            adHistory: [], withdrawalHistory: []
        };
        return;
    }
    
    const userDocRef = window.doc(window.db, "users", currentUser.uid);
    try {
        const docSnap = await window.getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            userStats = {
                totalEarnings: data.totalEarnings || 0,
                lifetimeEarnings: data.lifetimeEarnings || 0,
                totalViews: data.totalViews || 0,
                todayViews: data.todayViews || 0,
                streakDays: data.streakDays || 0,
                username: data.username || currentUser.displayName || currentUser.email.split('@')[0],
                email: data.email || currentUser.email,
                lastAdWatch: data.lastAdWatch || null,
                adHistory: data.adHistory || [],
                withdrawalHistory: data.withdrawalHistory || []
            };
        } else {
            userStats = { 
                totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0,
                streakDays: 0, username: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email, lastAdWatch: null, adHistory: [], withdrawalHistory: []
            };
            await saveUserData(); 
        }
    } catch (error) {
        console.error("Error loading user data from Firestore:", error);
        showToast('Error', 'Could not load your data.', 'error');
        userStats = {
            totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0,
            streakDays: 0, username: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email, lastAdWatch: null, adHistory: [], withdrawalHistory: []
        };
    }
}

async function saveUserData() {
    if (!currentUser || !window.db) {
        return;
    }
    userStats.username = userStats.username || currentUser.displayName || currentUser.email.split('@')[0];
    userStats.email = userStats.email || currentUser.email;

    const userDocRef = window.doc(window.db, "users", currentUser.uid);
    try {
        await window.setDoc(userDocRef, userStats, { merge: true });
        console.log("User data saved to Firestore.");
    } catch (error) {
        console.error("Error saving user data to Firestore:", error);
        showToast('Error', 'Could not save your progress.', 'error');
    }
}

function updateDashboard() {
    if (!currentUser) return; 
    
    document.getElementById('username-display').textContent = `Welcome back, ${userStats.username}!`;
    document.getElementById('profile-username').textContent = userStats.username;
    document.getElementById('profile-email').textContent = userStats.email;
    document.getElementById('profile-avatar').textContent = userStats.username.charAt(0).toUpperCase();
    
    document.getElementById('total-earnings').textContent = `$${userStats.totalEarnings.toFixed(3)}`;
    document.getElementById('lifetime-earnings').textContent = `$${userStats.lifetimeEarnings.toFixed(3)}`;
    document.getElementById('total-views').textContent = userStats.totalViews.toLocaleString();
    document.getElementById('today-views').textContent = userStats.todayViews;
    
    updateAchievements();
    
    const withdrawBtn = document.getElementById('withdraw-btn');
    withdrawBtn.disabled = userStats.totalEarnings < MINIMUM_WITHDRAWAL_AMOUNT;
    
    const withdrawalLimitTextElement = document.querySelector('.withdrawal-card p');
    if (withdrawalLimitTextElement) {
        withdrawalLimitTextElement.textContent = `Minimum withdrawal: $${MINIMUM_WITHDRAWAL_AMOUNT.toFixed(1)}`; 
    }

    updateActivityList();
    updateWithdrawalHistoryList();
}

function updateAchievements() {
    const views = userStats.totalViews;
    const streak = userStats.streakDays;

    const ach100 = document.getElementById('achievement-100');
    const ach100Prog = document.getElementById('achievement-100-progress');
    if (views >= 100) { ach100.classList.add('completed'); ach100Prog.textContent = 'Completed'; }
    else { ach100.classList.remove('completed'); ach100Prog.textContent = `${views}/100`; }

    const achStreak = document.getElementById('achievement-streak');
    const achStreakProg = document.getElementById('achievement-streak-progress');
    if (streak >= 7) { achStreak.classList.add('completed'); achStreakProg.textContent = 'Active'; }
    else { achStreak.classList.remove('completed'); achStreakProg.textContent = `${streak}/7 days`; }

    const ach1000 = document.getElementById('achievement-1000');
    const ach1000Prog = document.getElementById('achievement-1000-progress');
    if (views >= 1000) { ach1000.classList.add('completed'); ach1000Prog.textContent = 'Completed'; }
    else { ach1000.classList.remove('completed'); ach1000Prog.textContent = `${views}/1000`; }
}

function updateActivityList() {
    const activityList = document.getElementById('activity-list');
    if (!userStats.adHistory || userStats.adHistory.length === 0) {
        activityList.innerHTML = '<div class="no-activity">👁️ No ad views yet.</div>';
        return;
    }
    const recentActivity = userStats.adHistory.slice(-10).reverse();
    activityList.innerHTML = recentActivity.map(activity => `
        <div class="activity-item">
            <div class="activity-details">
                <div class="activity-icon">✅</div>
                <div class="activity-text">
                    <div class="activity-title">Ad Completed</div>
                    <div class="activity-time">${new Date(activity.timestamp).toLocaleString()}</div>
                </div>
            </div>
            <div class="activity-earnings">+$${activity.earnings.toFixed(3)}</div>
        </div>
    `).join('');
}

function updateWithdrawalHistoryList() {
    const historyList = document.getElementById('withdrawal-history-list');
    if (!userStats.withdrawalHistory || userStats.withdrawalHistory.length === 0) {
        historyList.innerHTML = '<div class="no-activity">💸 No withdrawals made yet.</div>';
        return;
    }
    const recentWithdrawals = userStats.withdrawalHistory.slice(-10).reverse(); 
    historyList.innerHTML = recentWithdrawals.map(withdrawal => `
        <div class="activity-item withdrawal-item">
            <div class="activity-details">
                <div class="activity-icon">💸</div>
                <div class="activity-text">
                    <div class="activity-title">Withdrawal ${withdrawal.status || 'Requested'}</div>
                    <div class="activity-time">${new Date(withdrawal.timestamp).toLocaleString()}</div>
                </div>
            </div>
            <div class="withdrawal-amount">-$${withdrawal.amount.toFixed(3)}</div>
        </div>
    `).join('');
}

async function watchAd() {
    const watchAdBtn = document.getElementById('watch-ad-btn');
    const watchAdText = document.getElementById('watch-ad-text'); 
    
    const originalButtonText = watchAdText.innerHTML;
    watchAdText.innerHTML = '<span class="loading"></span> Loading Ad...';
    watchAdBtn.disabled = true;

    try {
        if (typeof window.show_9388838 === 'function') {
            console.log("Monetag: Calling show_9388838()...");
            
            await window.show_9388838(); 
            
            console.log("Monetag: Promise from show_9388838() resolved. Ad interaction successful.");

            const earnings = 0.001; 
            userStats.totalEarnings += earnings;
            userStats.lifetimeEarnings += earnings; 
            userStats.totalViews += 1;
            
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            if (userStats.lastAdWatch) {
                const lastWatchDateStr = new Date(userStats.lastAdWatch).toISOString().split('T')[0];
                if (lastWatchDateStr !== todayStr) {
                    userStats.todayViews = 0;
                }
            } else {
                 userStats.todayViews = 0;
            }
            userStats.todayViews += 1;

            if (userStats.lastAdWatch) {
                const lastWatchDate = new Date(userStats.lastAdWatch);
                const lastDay = new Date(lastWatchDate.getFullYear(), lastWatchDate.getMonth(), lastWatchDate.getDate());
                const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const diffTime = currentDay.getTime() - lastDay.getTime(); 
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 

                if (diffDays === 1) { 
                     userStats.streakDays += 1;
                } else if (diffDays > 1) { 
                     userStats.streakDays = 1; 
                } 
            } else {
                userStats.streakDays = 1; 
            }
            
            userStats.lastAdWatch = now.toISOString();
            
            if (!userStats.adHistory) userStats.adHistory = [];
            userStats.adHistory.push({ timestamp: now.toISOString(), earnings: earnings });
            if (userStats.adHistory.length > 20) userStats.adHistory.shift(); 
            
            await saveUserData(); 
            updateDashboard();    
            showToast('Ad Watched & Rewarded!', `You've earned $${earnings.toFixed(3)}.`, 'success');

        } else {
            console.warn("Monetag SDK function 'show_9388838' not found. Simulating successful ad for testing.");
            await new Promise(resolve => setTimeout(resolve, 1000)); 
            
            const earnings = 0.001; 
            userStats.totalEarnings += earnings;
            userStats.lifetimeEarnings += earnings;
            userStats.totalViews += 1; 
            // Add simulated stats updates for todayViews, streak, lastAdWatch if you want full simulation
            const now = new Date();
             const todayStr = now.toISOString().split('T')[0];
            if (userStats.lastAdWatch) {
                const lastWatchDateStr = new Date(userStats.lastAdWatch).toISOString().split('T')[0];
                if (lastWatchDateStr !== todayStr) userStats.todayViews = 0;
            } else userStats.todayViews = 0;
            userStats.todayViews += 1;
            if (userStats.lastAdWatch) {
                const lastWatchDate = new Date(userStats.lastAdWatch);
                const lastDay = new Date(lastWatchDate.getFullYear(),lastWatchDate.getMonth(),lastWatchDate.getDate());
                const currentDay = new Date(now.getFullYear(),now.getMonth(),now.getDate());
                const diffTime = currentDay.getTime() - lastDay.getTime();
                const diffDays = Math.round(diffTime / (1000*60*60*24));
                if(diffDays === 1) userStats.streakDays+=1; else if(diffDays > 1) userStats.streakDays=1;
            } else userStats.streakDays=1;
            userStats.lastAdWatch = now.toISOString();
            if (!userStats.adHistory) userStats.adHistory = [];
            userStats.adHistory.push({ timestamp: now.toISOString(), earnings: earnings });
            if (userStats.adHistory.length > 20) userStats.adHistory.shift();


            await saveUserData();
            updateDashboard();
            showToast('Ad Simulated!', `You've earned $${earnings.toFixed(3)}. (Test Mode)`, 'info');
        }
    } catch (error) {
        console.error("Error during ad process or ad not rewarded:", error);
        showToast('Ad Not Rewarded', 'The ad could not be shown or was not completed successfully. No earnings recorded.', 'warning');
    } finally {
        watchAdText.innerHTML = originalButtonText; 
        watchAdBtn.disabled = false; 
    }
}

async function withdrawEarnings() {
    if (userStats.totalEarnings < MINIMUM_WITHDRAWAL_AMOUNT) {
        showToast('Insufficient balance', `Minimum withdrawal is $${MINIMUM_WITHDRAWAL_AMOUNT.toFixed(1)}`, 'warning');
        return;
    }

    const withdrawBtn = document.getElementById('withdraw-btn');
    const revertBtnLoadingState = addLoadingState(withdrawBtn, 'Processing...');

    const withdrawAmount = userStats.totalEarnings;
    const withdrawalTimestamp = new Date().toISOString();
    
    const userWithdrawalRecord = {
        timestamp: withdrawalTimestamp,
        amount: withdrawAmount,
        status: 'Requested',
        // id: `local_${Date.now()}` // Not strictly needed if matching by timestamp in admin for user update
    };

    const previousTotalEarnings = userStats.totalEarnings;
    const previousUserWithdrawalHistory = userStats.withdrawalHistory ? [...userStats.withdrawalHistory] : [];

    if (!userStats.withdrawalHistory) userStats.withdrawalHistory = [];
    userStats.withdrawalHistory.push(userWithdrawalRecord);
    if (userStats.withdrawalHistory.length > 20) userStats.withdrawalHistory.shift();
    
    userStats.totalEarnings = 0;
    updateDashboard(); 

    try {
        await saveUserData();

        const withdrawalRequestRef = await window.addDoc(window.collection(window.db, "withdrawalRequests"), {
            userId: currentUser.uid,
            username: userStats.username,
            email: userStats.email,
            amount: withdrawAmount,
            requestedAt: withdrawalTimestamp, 
            status: 'Requested',
            paymentMethod: null, 
            transactionId: null,
            notes: null,
            processedAt: null 
        });
        console.log("Withdrawal request created in 'withdrawalRequests' with ID: ", withdrawalRequestRef.id);
        
        showToast('Withdrawal Initiated', `$${withdrawAmount.toFixed(3)} recorded. Your balance is now $0.000.`, 'success');
        
        const googleFormUrl = 'https://forms.gle/NEiK8TVhJWN3RSvFA'; // REPLACE with your actual Google Form URL
        window.open(googleFormUrl, '_blank');
        
    } catch (error) {
        console.error("Error processing withdrawal:", error);
        showToast('Withdrawal Error', 'Could not process your withdrawal. Please try again.', 'error');
        
        userStats.totalEarnings = previousTotalEarnings;
        userStats.withdrawalHistory = previousUserWithdrawalHistory;
        updateDashboard(); 
    } finally {
        revertBtnLoadingState(); 
    }
}

function showToast(title, description, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toastId = 'toast_' + Date.now();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${description ? `<div class="toast-description">${description}</div>` : ''}
        </div>
        <button class="toast-close" onclick="hideToast('${toastId}')">×</button>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => hideToast(toastId), 5000);
}

function hideToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }
}

document.addEventListener('click', function(event) {
    const modal = document.getElementById('auth-modal');
    if (event.target === modal) { 
        hideAuthModal();
    }
});
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') { 
        hideAuthModal();
    }
});
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
        const form = event.target.closest('form');
        if (form && typeof form.onsubmit === 'function') { 
            // Let HTML onsubmit handler take care of it.
        }
    }
});

function addLoadingState(element, text = 'Loading...') {
    const originalHTML = element.innerHTML;
    const isButton = element.tagName === 'BUTTON';
    if (isButton) element.disabled = true;

    element.innerHTML = `<span class="loading"></span> ${text}`;
    
    return () => {
        element.innerHTML = originalHTML;
        if (isButton) element.disabled = false;
    };
}

function initializeInteractiveElements() {
    const cards = document.querySelectorAll('.stat-card, .step-card, .feature-card, .dashboard-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() { this.style.transform = 'translateY(-5px)'; });
        card.addEventListener('mouseleave', function() { this.style.transform = 'translateY(0)'; });
    });
}
