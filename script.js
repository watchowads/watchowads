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
    withdrawalHistory: [],
    currentLevel: 1,
    levelName: "Iron Watcher" 
};

const MINIMUM_WITHDRAWAL_AMOUNT = 2.0;

// Level Definitions
const WATCHER_RANKS = {
    1: { name: "Iron Watcher", icon: "🔩", viewsNeeded: 0,    nextLevelViews: 2000,  ratePer1000Views: 1, earningDivisor: 1000, description: "Forging your path!", colorClass: 'iron' },
    2: { name: "Golden Gazer", icon: "🌟", viewsNeeded: 2000, nextLevelViews: 10000, ratePer1000Views: 1, earningDivisor: 700,  description: "Shining with every view!", colorClass: 'golden' },
    3: { name: "Diamond Viewer", icon: "💎", viewsNeeded: 10000,nextLevelViews: Infinity, ratePer1000Views: 1, earningDivisor: 500,   description: "A true gem of dedication!", colorClass: 'diamond' }
};
const MAX_LEVEL = Object.keys(WATCHER_RANKS).length;

const IN_APP_INTERSTITIAL_SETTINGS = {
  type: 'inApp',
  inAppSettings: { frequency: 2, capping: 0.1, interval: 30, timeout: 5, everyPage: false }
};
let inAppInterstitialShownThisSession = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeInteractiveElements();
});

async function initializeApp() {
    if (window.onAuthStateChanged && window.auth) {
        window.onAuthStateChanged(window.auth, async (user) => {
            if (user && user.emailVerified) {
                currentUser = user;
                await loadUserData();
                showDashboard();
            } else {
                if (user && !user.emailVerified) console.log("User email not verified.");
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
    inAppInterstitialShownThisSession = false;
}

function showDashboard() {
    document.getElementById('landing-page').classList.remove('active');
    document.getElementById('dashboard-page').classList.add('active');
    updateUserLevel();
    updateDashboard();

    if (typeof window.show_9388838 === 'function' && !inAppInterstitialShownThisSession) {
        console.log("Monetag: Attempting to show In-App Interstitial...");
        try {
            window.show_9388838(IN_APP_INTERSTITIAL_SETTINGS);
            inAppInterstitialShownThisSession = true;
            console.log("Monetag: In-App Interstitial triggered with settings.");
        } catch (error) {
            console.error("Monetag: Error triggering In-App Interstitial:", error);
        }
    }
}

function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    } else {
        console.warn(`Element with ID '${elementId}' not found for scrolling.`);
    }
}
function scrollToStats() { // Original button scrolls to 'stats'
    scrollToElement('stats'); 
}


function calculateUserLevel(totalViews) {
    let userLevel = 1;
    for (let level = MAX_LEVEL; level >= 1; level--) {
        if (totalViews >= WATCHER_RANKS[level].viewsNeeded) {
            userLevel = level;
            break;
        }
    }
    return userLevel;
}

function updateUserLevel() {
    if (!userStats) return;
    const newLevel = calculateUserLevel(userStats.totalViews);
    userStats.currentLevel = newLevel;
    userStats.levelName = WATCHER_RANKS[newLevel].name;
}

function showAuthModal(mode = 'login') { const modal = document.getElementById('auth-modal'); const loginForm = document.getElementById('login-form'); const registerForm = document.getElementById('register-form'); const forgotForm = document.getElementById('forgot-password-form'); loginForm.style.display = 'none'; registerForm.style.display = 'none'; forgotForm.style.display = 'none'; if (mode === 'login') loginForm.style.display = 'flex'; else if (mode === 'register') registerForm.style.display = 'flex'; else if (mode === 'forgot') forgotForm.style.display = 'flex'; modal.classList.add('active'); }
function hideAuthModal() { document.getElementById('auth-modal').classList.remove('active'); }
function switchAuthMode(mode) { const loginForm = document.getElementById('login-form'); const registerForm = document.getElementById('register-form'); const forgotForm = document.getElementById('forgot-password-form'); loginForm.style.display = 'none'; registerForm.style.display = 'none'; forgotForm.style.display = 'none'; if (mode === 'login') loginForm.style.display = 'flex'; else if (mode === 'register') registerForm.style.display = 'flex'; else if (mode === 'forgot') forgotForm.style.display = 'flex'; }
function showForgotPassword() { switchAuthMode('forgot'); }
async function handleForgotPassword(event) { event.preventDefault(); const email = document.getElementById('forgot-email').value; const forgotBtn = document.getElementById('forgot-btn'); const revert = addLoadingState(forgotBtn, 'Sending...'); try { await window.sendPasswordResetEmail(window.auth, email); showToast('Reset link sent!', 'Please check your email.', 'success'); hideAuthModal(); } catch (error) { showToast('Error', error.message || 'Failed to send reset email.', 'error'); } finally { revert(); } }
async function handleLogin(event) { event.preventDefault(); const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value; const loginBtn = document.getElementById('login-btn'); const revert = addLoadingState(loginBtn, 'Signing In...'); try { const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password); if (!userCredential.user.emailVerified) { await window.signOut(window.auth); currentUser = null; throw new Error('Please verify your email address before signing in.'); } hideAuthModal(); showToast('Welcome back!', 'Successfully signed in.', 'success'); } catch (error) { showToast('Login failed', error.message || 'Check credentials.', 'error'); } finally { revert(); } }
async function handleRegister(event) { event.preventDefault(); const username = document.getElementById('register-username').value; const email = document.getElementById('register-email').value; const password = document.getElementById('register-password').value; const registerBtn = document.getElementById('register-btn'); const revert = addLoadingState(registerBtn, 'Creating Account...'); try { const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password); await window.updateProfile(userCredential.user, { displayName: username }); await window.sendEmailVerification(userCredential.user); await window.signOut(window.auth); hideAuthModal(); showToast('Account created!', 'Please verify your email before signing in.', 'success'); } catch (error) { showToast('Registration failed', error.message || 'Try different credentials.', 'error'); } finally { revert(); } }
async function logout() { try { await window.signOut(window.auth); currentUser = null; userStats = { totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0, streakDays: 0, username: '', email: '', lastAdWatch: null, adHistory: [], withdrawalHistory: [], currentLevel: 1, levelName: "Iron Watcher" }; showLandingPage(); showToast('Signed out', 'Successfully signed out.', 'info'); } catch (error) { showToast('Error', 'Failed to sign out.', 'error'); } }

async function loadUserData() {
    if (!currentUser || !window.db) {
        userStats = {
            totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0,
            streakDays: 0, username: 'Guest', email: '', lastAdWatch: null,
            adHistory: [], withdrawalHistory: [], currentLevel: 1, levelName: "Iron Watcher"
        };
        updateUserLevel();
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
                withdrawalHistory: data.withdrawalHistory || [],
                currentLevel: data.currentLevel || 1,
                levelName: data.levelName || "Iron Watcher"
            };
        } else {
            userStats = {
                totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0,
                streakDays: 0, username: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email, lastAdWatch: null, adHistory: [], withdrawalHistory: [],
                currentLevel: 1, levelName: "Iron Watcher"
            };
        }
        updateUserLevel(); 
        if (!docSnap.exists() || docSnap.data().currentLevel !== userStats.currentLevel || docSnap.data().levelName !== userStats.levelName) {
            await saveUserData(); 
        }
    } catch (error) {
        console.error("Error loading user data from Firestore:", error);
        showToast('Error', 'Could not load your data.', 'error');
        userStats = {
            totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0,
            streakDays: 0, username: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email, lastAdWatch: null, adHistory: [], withdrawalHistory: [],
            currentLevel: 1, levelName: "Iron Watcher"
        };
        updateUserLevel();
    }
}

async function saveUserData() {
    if (!currentUser || !window.db) return;
    userStats.username = userStats.username || currentUser.displayName || currentUser.email.split('@')[0];
    userStats.email = userStats.email || currentUser.email;
    if (typeof userStats.currentLevel === 'undefined') { 
        updateUserLevel();
    }
    const userDocRef = window.doc(window.db, "users", currentUser.uid);
    try {
        await window.setDoc(userDocRef, userStats, { merge: true });
        console.log("User data saved to Firestore:", userStats);
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

    // --- USER RANK DISPLAY UPDATE ---
    const rankIconEl = document.getElementById('dashboard-rank-icon-element'); 
    const rankNameEl = document.getElementById('dashboard-rank-name-element'); 
    const rankProgressTextEl = document.getElementById('dashboard-rank-progress-text-element'); 
    const rankProgressFillEl = document.getElementById('dashboard-rank-progress-fill-element'); 

    if (rankIconEl && rankNameEl && rankProgressTextEl && rankProgressFillEl) {
        const rank = WATCHER_RANKS[userStats.currentLevel];
        rankIconEl.textContent = rank.icon;
        rankIconEl.className = `rank-card-icon ${rank.colorClass}`; // Apply color class for background
        rankNameEl.textContent = `Rank: ${rank.name}`;
        
        rankProgressFillEl.className = `rank-card-progress-fill ${rank.colorClass}`; // Apply color to fill

        if (userStats.currentLevel < MAX_LEVEL) {
            const viewsForNextRank = WATCHER_RANKS[userStats.currentLevel + 1].viewsNeeded;
            const viewsInCurrentRank = userStats.totalViews - rank.viewsNeeded;
            const viewsRangeForCurrentRank = viewsForNextRank - rank.viewsNeeded;
            const progressPercentage = Math.min(100, (viewsInCurrentRank / viewsRangeForCurrentRank) * 100);
            
            rankProgressFillEl.style.width = `${progressPercentage}%`;
            rankProgressTextEl.textContent =
                `${Math.max(0, viewsForNextRank - userStats.totalViews)} views to ${WATCHER_RANKS[userStats.currentLevel + 1].name}`;
        } else {
            rankProgressFillEl.style.width = '100%';
            rankProgressTextEl.textContent = "Max Rank Achieved! 🎉";
        }
    } else {
        console.warn("One or more dashboard rank display elements not found. UI for rank will not be updated.");
    }
    // --- END USER RANK DISPLAY UPDATE ---

    updateAchievements();

    const withdrawBtn = document.getElementById('withdraw-btn');
    withdrawBtn.disabled = userStats.totalEarnings < MINIMUM_WITHDRAWAL_AMOUNT;
    const wlText = document.querySelector('.withdrawal-card p');
    if (wlText) wlText.textContent = `Minimum withdrawal: $${MINIMUM_WITHDRAWAL_AMOUNT.toFixed(1)}`;

    updateActivityList();
    updateWithdrawalHistoryList();
}

function updateAchievements() { const v=userStats.totalViews,s=userStats.streakDays;const a100=document.getElementById('achievement-100'),p100=document.getElementById('achievement-100-progress');v>=100?(a100.classList.add('completed'),p100.textContent='Completed'):(a100.classList.remove('completed'),p100.textContent=`${v}/100`);const as=document.getElementById('achievement-streak'),ps=document.getElementById('achievement-streak-progress');s>=7?(as.classList.add('completed'),ps.textContent='Active'):(as.classList.remove('completed'),ps.textContent=`${s}/7 days`);const a1k=document.getElementById('achievement-1000'),p1k=document.getElementById('achievement-1000-progress');v>=1000?(a1k.classList.add('completed'),p1k.textContent='Completed'):(a1k.classList.remove('completed'),p1k.textContent=`${v}/1000`)}
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
            <div class="activity-earnings">+$${activity.earnings.toFixed(5)}</div>
        </div>
    `).join('');
}
function updateWithdrawalHistoryList() { const el=document.getElementById('withdrawal-history-list');if(!userStats.withdrawalHistory||userStats.withdrawalHistory.length===0){el.innerHTML='<div class="no-activity">💸 No withdrawals made yet.</div>';return}const recent=userStats.withdrawalHistory.slice(-10).reverse();el.innerHTML=recent.map(w=>`<div class="activity-item withdrawal-item"><div class="activity-details"><div class="activity-icon">💸</div><div class="activity-text"><div class="activity-title">Withdrawal ${w.status||'Requested'}</div><div class="activity-time">${new Date(w.timestamp).toLocaleString()}</div></div></div><div class="withdrawal-amount">-$${w.amount.toFixed(3)}</div></div>`).join('')}

async function watchAd() {
    const watchAdBtn = document.getElementById('watch-ad-btn');
    const watchAdText = document.getElementById('watch-ad-text'); 
    
    const originalButtonText = watchAdText.innerHTML;
    watchAdText.innerHTML = '<span class="loading"></span> Loading Ad...';
    watchAdBtn.disabled = true;

    try {
        if (typeof window.show_9388838 === 'function') {
            console.log("Monetag: Calling show_9388838() for rewarded ad...");
            // For the main rewarded ad, call it without arguments to get the Promise
            await window.show_9388838(); 
            console.log("Monetag: Promise from rewarded ad show_9388838() resolved.");

            const currentRank = WATCHER_RANKS[userStats.currentLevel];
            const targetAveragePerAd = currentRank.ratePer1000Views / currentRank.earningDivisor;
            
            const randomVarianceFactor = (Math.random() - 0.5) * 0.6; 
            let earnings = targetAveragePerAd * (1 + randomVarianceFactor);
            earnings = Math.max(targetAveragePerAd * 0.5, earnings); 
            earnings = parseFloat(earnings.toFixed(5));

            userStats.totalEarnings += earnings;
            userStats.lifetimeEarnings += earnings; 
            userStats.totalViews += 1;
            
            const previousLevel = userStats.currentLevel;
            updateUserLevel(); 
            if (userStats.currentLevel > previousLevel) {
                showToast("Rank Up!", `Congratulations! You've reached ${userStats.levelName}! ${WATCHER_RANKS[userStats.currentLevel].description}`, "success");
            }
            
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            if (userStats.lastAdWatch) {
                const lastWatchDateStr = new Date(userStats.lastAdWatch).toISOString().split('T')[0];
                if (lastWatchDateStr !== todayStr) userStats.todayViews = 0;
            } else userStats.todayViews = 0;
            userStats.todayViews += 1;

            if (userStats.lastAdWatch) {
                const lastWatchDate = new Date(userStats.lastAdWatch);
                const lastDay = new Date(lastWatchDate.getFullYear(), lastWatchDate.getMonth(), lastWatchDate.getDate());
                const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const diffTime = currentDay.getTime() - lastDay.getTime(); 
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                if (diffDays === 1) userStats.streakDays += 1;
                else if (diffDays > 1) userStats.streakDays = 1; 
            } else userStats.streakDays = 1; 
            userStats.lastAdWatch = now.toISOString();
            
            if (!userStats.adHistory) userStats.adHistory = [];
            userStats.adHistory.push({ timestamp: now.toISOString(), earnings: earnings });
            if (userStats.adHistory.length > 20) userStats.adHistory.shift(); 
            
            await saveUserData(); 
            updateDashboard();    
            showToast('Ad Watched & Rewarded!', `You've earned $${earnings.toFixed(5)}.`, 'success');

        } else { 
            console.warn("Monetag SDK function 'show_9388838' not found. Simulating successful ad for testing.");
            await new Promise(resolve => setTimeout(resolve, 1000)); 
            const earnings = 0.001; 
            userStats.totalEarnings += earnings;
            userStats.lifetimeEarnings += earnings;
            userStats.totalViews += 1; 
            const now = new Date(); 
            const todayStr = now.toISOString().split('T')[0];if (userStats.lastAdWatch){const lastWatchDateStr=new Date(userStats.lastAdWatch).toISOString().split('T')[0];if(lastWatchDateStr!==todayStr)userStats.todayViews=0;}else userStats.todayViews=0;userStats.todayViews+=1;if(userStats.lastAdWatch){const lastWatchDate=new Date(userStats.lastAdWatch);const lastDay=new Date(lastWatchDate.getFullYear(),lastWatchDate.getMonth(),lastWatchDate.getDate());const currentDay=new Date(now.getFullYear(),now.getMonth(),now.getDate());const diffTime=currentDay.getTime()-lastDay.getTime();const diffDays=Math.round(diffTime/(1000*60*60*24));if(diffDays===1)userStats.streakDays+=1;else if(diffDays>1)userStats.streakDays=1;}else userStats.streakDays=1;userStats.lastAdWatch=now.toISOString();
            if (!userStats.adHistory) userStats.adHistory = [];userStats.adHistory.push({timestamp:now.toISOString(),earnings:earnings});if(userStats.adHistory.length>20)userStats.adHistory.shift();
            updateUserLevel(); 
            await saveUserData();
            updateDashboard();
            showToast('Ad Simulated!', `You've earned $${earnings.toFixed(5)}. (Test Mode)`, 'info');
        }
    } catch (error) {
        console.error("Error during ad process or ad not rewarded:", error);
        showToast('Ad Not Rewarded', 'The ad could not be shown, was not completed, or an error occurred. No earnings recorded.', 'warning');
    } finally {
        watchAdText.innerHTML = originalButtonText; 
        watchAdBtn.disabled = false; 
    }
}

async function withdrawEarnings() { if(userStats.totalEarnings<MINIMUM_WITHDRAWAL_AMOUNT){showToast('Insufficient balance',`Minimum withdrawal is $${MINIMUM_WITHDRAWAL_AMOUNT.toFixed(1)}`,'warning');return}const withdrawBtn=document.getElementById('withdraw-btn');const revertBtnLoadingState=addLoadingState(withdrawBtn,'Processing...');const withdrawAmount=userStats.totalEarnings;const withdrawalTimestamp=new Date().toISOString();const userWithdrawalRecord={timestamp:withdrawalTimestamp,amount:withdrawAmount,status:'Requested'};const previousTotalEarnings=userStats.totalEarnings;const previousUserWithdrawalHistory=userStats.withdrawalHistory?[...userStats.withdrawalHistory]:[];if(!userStats.withdrawalHistory)userStats.withdrawalHistory=[];userStats.withdrawalHistory.push(userWithdrawalRecord);if(userStats.withdrawalHistory.length>20)userStats.withdrawalHistory.shift();userStats.totalEarnings=0;updateDashboard();try{await saveUserData();const withdrawalRequestRef=await window.addDoc(window.collection(window.db,"withdrawalRequests"),{userId:currentUser.uid,username:userStats.username,email:userStats.email,amount:withdrawAmount,requestedAt:withdrawalTimestamp,status:'Requested',paymentMethod:null,transactionId:null,notes:null,processedAt:null});console.log("Withdrawal request created in 'withdrawalRequests' with ID: ",withdrawalRequestRef.id);showToast('Withdrawal Initiated',`$${withdrawAmount.toFixed(3)} recorded. Your balance is now $0.000.`,'success');const googleFormUrl='https://forms.gle/NEiK8TVhJWN3RSvFA';window.open(googleFormUrl,'_blank')}catch(error){console.error("Error processing withdrawal:",error);showToast('Withdrawal Error','Could not process your withdrawal. Please try again.','error');userStats.totalEarnings=previousTotalEarnings;userStats.withdrawalHistory=previousUserWithdrawalHistory;updateDashboard()}finally{revertBtnLoadingState()}}
function showToast(title, description, type = 'info') { const tC=document.getElementById('toast-container');const tI='toast_'+Date.now();const i={success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'};const t=document.createElement('div');t.id=tI;t.className=`toast ${type}`;t.innerHTML=`<div class="toast-icon">${i[type]}</div><div class="toast-content"><div class="toast-title">${title}</div>${description?`<div class="toast-description">${description}</div>`:''}</div><button class="toast-close" onclick="hideToast('${tI}')">×</button>`;tC.appendChild(t);setTimeout(()=>t.classList.add('show'),10);setTimeout(()=>hideToast(tI),5000)}
function hideToast(toastId) { const t=document.getElementById(toastId);if(t){t.classList.remove('show');setTimeout(()=>t.remove(),300)}}
document.addEventListener('click',function(event){const m=document.getElementById('auth-modal');if(event.target===m)hideAuthModal()});
document.addEventListener('keydown',function(event){if(event.key==='Escape')hideAuthModal()});
document.addEventListener('keydown',function(event){if(event.key==='Enter'&&event.target.tagName==='INPUT'){const f=event.target.closest('form');if(f&&typeof f.onsubmit==='function'){/* Let HTML onsubmit handle */}}});
function addLoadingState(element,text='Loading...'){const oH=element.innerHTML;const iB=element.tagName==='BUTTON';if(iB)element.disabled=true;element.innerHTML=`<span class="loading"></span> ${text}`;return()=>{element.innerHTML=oH;if(iB)element.disabled=false}}
function initializeInteractiveElements(){const c=document.querySelectorAll('.stat-card,.step-card,.feature-card,.dashboard-card, .level-card-landing');c.forEach(card=>{card.addEventListener('mouseenter',function(){this.style.transform='translateY(-5px)'});card.addEventListener('mouseleave',function(){this.style.transform='translateY(0)'})})}
