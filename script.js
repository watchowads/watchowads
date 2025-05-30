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
    currentLevel: 1, // Add currentLevel
    levelName: "Seeker" // Add levelName
};

const MINIMUM_WITHDRAWAL_AMOUNT = 2.0;

// Level Definitions
const WATCHER_RANKS = {
    1: { name: "Seeker", icon: "🥉", viewsNeeded: 0,    nextLevelViews: 2000,  ratePer1000Views: 1,    earningDivisor: 1000, colorClass: 'seeker' },
    2: { name: "Explorer", icon: "🥈", viewsNeeded: 2000, nextLevelViews: 10000, ratePer1000Views: 1,    earningDivisor: 700,  colorClass: 'explorer' },
    3: { name: "Master", icon: "🥇", viewsNeeded: 10000,nextLevelViews: Infinity, ratePer1000Views: 1, earningDivisor: 500,   colorClass: 'master' }
};
const MAX_LEVEL = Object.keys(WATCHER_RANKS).length;

// In-App Interstitial configuration
const IN_APP_INTERSTITIAL_SETTINGS = {
  type: 'inApp',
  inAppSettings: {
    frequency: 2,    // Show 2 ads
    capping: 0.1,    // within 0.1 hours (6 minutes)
    interval: 30,    // with a 30-second interval
    timeout: 5,      // 5-second delay before the first
    everyPage: false // Session saved when navigating (for SPAs, this means on dashboard load/refresh)
  }
};
let inAppInterstitialShownThisSession = false; // To show only once per session/dashboard load

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeInteractiveElements();
});

async function initializeApp() {
    if (window.onAuthStateChanged && window.auth) {
        window.onAuthStateChanged(window.auth, async (user) => {
            if (user && user.emailVerified) {
                currentUser = user;
                await loadUserData(); // loadUserData will now also calculate level
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
    inAppInterstitialShownThisSession = false; // Reset for next dashboard view
}

function showDashboard() {
    document.getElementById('landing-page').classList.remove('active');
    document.getElementById('dashboard-page').classList.add('active');
    updateUserLevel(); // Ensure level is up-to-date
    updateDashboard();
    
    // Trigger In-App Interstitial on dashboard load (once per session)
    if (typeof window.show_9388838 === 'function' && !inAppInterstitialShownThisSession) {
        console.log("Monetag: Attempting to show In-App Interstitial...");
        try {
            window.show_9388838(IN_APP_INTERSTITIAL_SETTINGS); // Call with settings
            inAppInterstitialShownThisSession = true; // Mark as shown for this session
            console.log("Monetag: In-App Interstitial triggered.");
        } catch (error) {
            console.error("Monetag: Error triggering In-App Interstitial:", error);
        }
    }
}

function scrollToElement(elementId) {
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
}


// --- Level Calculation Logic ---
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

// --- Auth and Data Functions (largely same, loadUserData updated) ---
function showAuthModal(mode = 'login') { /* ... same ... */ const modal = document.getElementById('auth-modal'); const loginForm = document.getElementById('login-form'); const registerForm = document.getElementById('register-form'); const forgotForm = document.getElementById('forgot-password-form'); loginForm.style.display = 'none'; registerForm.style.display = 'none'; forgotForm.style.display = 'none'; if (mode === 'login') loginForm.style.display = 'flex'; else if (mode === 'register') registerForm.style.display = 'flex'; else if (mode === 'forgot') forgotForm.style.display = 'flex'; modal.classList.add('active'); }
function hideAuthModal() { /* ... same ... */ document.getElementById('auth-modal').classList.remove('active'); }
function switchAuthMode(mode) { /* ... same ... */ const loginForm = document.getElementById('login-form'); const registerForm = document.getElementById('register-form'); const forgotForm = document.getElementById('forgot-password-form'); loginForm.style.display = 'none'; registerForm.style.display = 'none'; forgotForm.style.display = 'none'; if (mode === 'login') loginForm.style.display = 'flex'; else if (mode === 'register') registerForm.style.display = 'flex'; else if (mode === 'forgot') forgotForm.style.display = 'flex'; }
function showForgotPassword() { switchAuthMode('forgot'); }
async function handleForgotPassword(event) { /* ... same ... */ event.preventDefault(); const email = document.getElementById('forgot-email').value; const forgotBtn = document.getElementById('forgot-btn'); const revert = addLoadingState(forgotBtn, 'Sending...'); try { await window.sendPasswordResetEmail(window.auth, email); showToast('Reset link sent!', 'Please check your email.', 'success'); hideAuthModal(); } catch (error) { showToast('Error', error.message || 'Failed to send reset email.', 'error'); } finally { revert(); } }
async function handleLogin(event) { /* ... same ... */ event.preventDefault(); const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value; const loginBtn = document.getElementById('login-btn'); const revert = addLoadingState(loginBtn, 'Signing In...'); try { const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password); if (!userCredential.user.emailVerified) { await window.signOut(window.auth); currentUser = null; throw new Error('Please verify your email address before signing in.'); } hideAuthModal(); showToast('Welcome back!', 'Successfully signed in.', 'success'); } catch (error) { showToast('Login failed', error.message || 'Check credentials.', 'error'); } finally { revert(); } }
async function handleRegister(event) { /* ... same ... */ event.preventDefault(); const username = document.getElementById('register-username').value; const email = document.getElementById('register-email').value; const password = document.getElementById('register-password').value; const registerBtn = document.getElementById('register-btn'); const revert = addLoadingState(registerBtn, 'Creating Account...'); try { const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password); await window.updateProfile(userCredential.user, { displayName: username }); await window.sendEmailVerification(userCredential.user); await window.signOut(window.auth); hideAuthModal(); showToast('Account created!', 'Please verify your email before signing in.', 'success'); } catch (error) { showToast('Registration failed', error.message || 'Try different credentials.', 'error'); } finally { revert(); } }
async function logout() { /* ... same ... */ try { await window.signOut(window.auth); currentUser = null; userStats = { totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0, streakDays: 0, username: '', email: '', lastAdWatch: null, adHistory: [], withdrawalHistory: [], currentLevel: 1, levelName: "Seeker" }; showLandingPage(); showToast('Signed out', 'Successfully signed out.', 'info'); } catch (error) { showToast('Error', 'Failed to sign out.', 'error'); } }

async function loadUserData() {
    if (!currentUser || !window.db) {
        userStats = {
            totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0,
            streakDays: 0, username: 'Guest', email: '', lastAdWatch: null,
            adHistory: [], withdrawalHistory: [], currentLevel: 1, levelName: "Seeker"
        };
        updateUserLevel(); // Ensure level is set even for default/guest
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
                // currentLevel and levelName will be recalculated based on totalViews
            };
        } else {
            userStats = { 
                totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0,
                streakDays: 0, username: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email, lastAdWatch: null, adHistory: [], withdrawalHistory: [],
                // currentLevel and levelName will be set by updateUserLevel
            };
            // await saveUserData() will be called after updateUserLevel if needed
        }
        updateUserLevel(); // Calculate and set currentLevel and levelName based on totalViews
        if (!docSnap.exists() || !docSnap.data().currentLevel) { // Save if new user or level info missing
            await saveUserData();
        }

    } catch (error) {
        console.error("Error loading user data from Firestore:", error);
        showToast('Error', 'Could not load your data.', 'error');
        userStats = {
            totalEarnings: 0, lifetimeEarnings: 0, totalViews: 0, todayViews: 0,
            streakDays: 0, username: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email, lastAdWatch: null, adHistory: [], withdrawalHistory: [],
            currentLevel: 1, levelName: "Seeker" // Fallback
        };
        updateUserLevel();
    }
}

async function saveUserData() { /* ... same, ensures userStats (now with level info) is saved ... */ if(!currentUser||!window.db)return;userStats.username=userStats.username||currentUser.displayName||currentUser.email.split('@')[0];userStats.email=userStats.email||currentUser.email;const userDocRef=window.doc(window.db,"users",currentUser.uid);try{await window.setDoc(userDocRef,userStats,{merge:true});console.log("User data saved to Firestore.");}catch(error){console.error("Error saving user data:",error);showToast('Error','Could not save progress.','error')}}

function updateDashboard() {
    if (!currentUser) return; 
    
    // Update standard stats
    document.getElementById('username-display').textContent = `Welcome back, ${userStats.username}!`;
    document.getElementById('profile-username').textContent = userStats.username;
    document.getElementById('profile-email').textContent = userStats.email;
    document.getElementById('profile-avatar').textContent = userStats.username.charAt(0).toUpperCase();
    document.getElementById('total-earnings').textContent = `$${userStats.totalEarnings.toFixed(3)}`;
    document.getElementById('lifetime-earnings').textContent = `$${userStats.lifetimeEarnings.toFixed(3)}`;
    document.getElementById('total-views').textContent = userStats.totalViews.toLocaleString();
    document.getElementById('today-views').textContent = userStats.todayViews;
    
    // Update User Rank Display
    const rank = WATCHER_RANKS[userStats.currentLevel];
    document.getElementById('rank-icon').textContent = rank.icon;
    document.getElementById('rank-icon').className = `rank-icon ${rank.colorClass}-icon`; // For specific icon background
    document.getElementById('rank-name').textContent = `Watcher Rank: ${rank.name}`;
    
    const rankProgressFill = document.getElementById('rank-progress-fill');
    rankProgressFill.className = `progress-fill-rank ${rank.colorClass}-fill`;

    if (userStats.currentLevel < MAX_LEVEL) {
        const viewsForNextLevel = WATCHER_RANKS[userStats.currentLevel + 1].viewsNeeded;
        const viewsProgress = userStats.totalViews - rank.viewsNeeded;
        const viewsRange = viewsForNextLevel - rank.viewsNeeded;
        const progressPercentage = Math.min(100, (viewsProgress / viewsRange) * 100);
        rankProgressFill.style.width = `${progressPercentage}%`;
        document.getElementById('rank-progress-text').textContent = 
            `${viewsForNextLevel - userStats.totalViews} views to ${WATCHER_RANKS[userStats.currentLevel + 1].name}`;
    } else {
        rankProgressFill.style.width = '100%';
        document.getElementById('rank-progress-text').textContent = "You've reached the highest rank! 🎉";
    }
    
    updateAchievements();
    
    const withdrawBtn = document.getElementById('withdraw-btn');
    withdrawBtn.disabled = userStats.totalEarnings < MINIMUM_WITHDRAWAL_AMOUNT;
    const wlText = document.querySelector('.withdrawal-card p');
    if(wlText) wlText.textContent = `Minimum withdrawal: $${MINIMUM_WITHDRAWAL_AMOUNT.toFixed(1)}`;

    updateActivityList();
    updateWithdrawalHistoryList();
}

function updateAchievements() { /* ... same ... */ const v=userStats.totalViews,s=userStats.streakDays;const a100=document.getElementById('achievement-100'),p100=document.getElementById('achievement-100-progress');v>=100?(a100.classList.add('completed'),p100.textContent='Completed'):(a100.classList.remove('completed'),p100.textContent=`${v}/100`);const as=document.getElementById('achievement-streak'),ps=document.getElementById('achievement-streak-progress');s>=7?(as.classList.add('completed'),ps.textContent='Active'):(as.classList.remove('completed'),ps.textContent=`${s}/7 days`);const a1k=document.getElementById('achievement-1000'),p1k=document.getElementById('achievement-1000-progress');v>=1000?(a1k.classList.add('completed'),p1k.textContent='Completed'):(a1k.classList.remove('completed'),p1k.textContent=`${v}/1000`)}
function updateActivityList() { /* ... same ... */ const el=document.getElementById('activity-list');if(!userStats.adHistory||userStats.adHistory.length===0){el.innerHTML='<div class="no-activity">👁️ No ad views yet.</div>';return}const recent=userStats.adHistory.slice(-10).reverse();el.innerHTML=recent.map(a=>`<div class="activity-item"><div class="activity-details"><div class="activity-icon">✅</div><div class="activity-text"><div class="activity-title">Ad Completed</div><div class="activity-time">${new Date(a.timestamp).toLocaleString()}</div></div></div><div class="activity-earnings">+$${a.earnings.toFixed(5)}</div></div>`).join('')} {/* .toFixed(5) for randomized small earnings */}
function updateWithdrawalHistoryList() { /* ... same ... */ const el=document.getElementById('withdrawal-history-list');if(!userStats.withdrawalHistory||userStats.withdrawalHistory.length===0){el.innerHTML='<div class="no-activity">💸 No withdrawals made yet.</div>';return}const recent=userStats.withdrawalHistory.slice(-10).reverse();el.innerHTML=recent.map(w=>`<div class="activity-item withdrawal-item"><div class="activity-details"><div class="activity-icon">💸</div><div class="activity-text"><div class="activity-title">Withdrawal ${w.status||'Requested'}</div><div class="activity-time">${new Date(w.timestamp).toLocaleString()}</div></div></div><div class="withdrawal-amount">-$${w.amount.toFixed(3)}</div></div>`).join('')}

// --- MODIFIED watchAd Function ---
async function watchAd() {
    const watchAdBtn = document.getElementById('watch-ad-btn');
    const watchAdText = document.getElementById('watch-ad-text'); 
    
    const originalButtonText = watchAdText.innerHTML;
    watchAdText.innerHTML = '<span class="loading"></span> Loading Ad...';
    watchAdBtn.disabled = true;

    try {
        if (typeof window.show_9388838 === 'function') {
            console.log("Monetag: Calling show_9388838() for rewarded ad...");
            await window.show_9388838(); // This is for the main rewarded ad (Promise based)
            console.log("Monetag: Promise from rewarded ad show_9388838() resolved.");

            // --- User Reward Logic ---
            const currentRank = WATCHER_RANKS[userStats.currentLevel];
            const baseRatePerAd = currentRank.ratePer1000Views / currentRank.earningDivisor; // This is the average target

            // Randomized earning: e.g., 50% to 150% of the baseRatePerAd
            // Adjust minFactor and maxFactor to control the randomness spread
            // Ensure it averages out to baseRatePerAd over many views.
            // For example, if random number is 0, earnings = base * 0.5. If random is 1, earnings = base * 1.5
            const minFactor = 0.7; // Earn at least 70% of average
            const maxFactor = 1.3; // Earn at most 130% of average
            // To make it average out correctly, the random part should be centered around 1.
            // A simple way: (Math.random() * (maxFactor - minFactor)) + minFactor
            // A better way for averaging: baseRatePerAd * (1 + (Math.random() - 0.5) * 0.6) // e.g. +/- 30%
            
            let earnings;
            // Simple random factor between 0.7 and 1.3 to average around the target.
            // This ensures that over time, the average earning per ad is close to `baseRatePerAd`.
            // Example: (Math.random() generates 0 to <1)
            // If Math.random() = 0, factor = 0.7. If Math.random() = 0.5, factor = 1.0. If Math.random() = 0.99, factor = 1.294
            const randomFactor = minFactor + (Math.random() * (maxFactor - minFactor));
            earnings = baseRatePerAd * randomFactor;
            earnings = parseFloat(earnings.toFixed(5)); // Limit to 5 decimal places

            userStats.totalEarnings += earnings;
            userStats.lifetimeEarnings += earnings; 
            userStats.totalViews += 1;
            
            // Check for level up
            const previousLevel = userStats.currentLevel;
            updateUserLevel(); // This updates userStats.currentLevel and userStats.levelName
            if (userStats.currentLevel > previousLevel) {
                showToast("Rank Up!", `Congratulations! You've reached ${userStats.levelName}! Enjoy higher earnings.`, "success");
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

        } else { /* ... simulation logic (same as before) ... */ console.warn("Monetag SDK function 'show_9388838' not found. Simulating successful ad for testing.");await new Promise(resolve=>setTimeout(resolve,1000));const earnings=0.001;userStats.totalEarnings+=earnings;userStats.lifetimeEarnings+=earnings;userStats.totalViews+=1;const now=new Date();const todayStr=now.toISOString().split('T')[0];if(userStats.lastAdWatch){const lastWatchDateStr=new Date(userStats.lastAdWatch).toISOString().split('T')[0];if(lastWatchDateStr!==todayStr)userStats.todayViews=0}else userStats.todayViews=0;userStats.todayViews+=1;if(userStats.lastAdWatch){const lastWatchDate=new Date(userStats.lastAdWatch);const lastDay=new Date(lastWatchDate.getFullYear(),lastWatchDate.getMonth(),lastWatchDate.getDate());const currentDay=new Date(now.getFullYear(),now.getMonth(),now.getDate());const diffTime=currentDay.getTime()-lastDay.getTime();const diffDays=Math.round(diffTime/(1000*60*60*24));if(diffDays===1)userStats.streakDays+=1;else if(diffDays>1)userStats.streakDays=1}else userStats.streakDays=1;userStats.lastAdWatch=now.toISOString();if(!userStats.adHistory)userStats.adHistory=[];userStats.adHistory.push({timestamp:now.toISOString(),earnings:earnings});if(userStats.adHistory.length>20)userStats.adHistory.shift();updateUserLevel();await saveUserData();updateDashboard();showToast('Ad Simulated!',`You've earned $${earnings.toFixed(5)}. (Test Mode)`,'info')}
    } catch (error) {
        console.error("Error during ad process or ad not rewarded:", error);
        showToast('Ad Not Rewarded', 'The ad could not be shown or was not completed successfully. No earnings recorded.', 'warning');
    } finally {
        watchAdText.innerHTML = originalButtonText; 
        watchAdBtn.disabled = false; 
    }
}

async function withdrawEarnings() { /* ... same as before, ensure MINIMUM_WITHDRAWAL_AMOUNT.toFixed(1) is used in toast ... */ if(userStats.totalEarnings<MINIMUM_WITHDRAWAL_AMOUNT){showToast('Insufficient balance',`Minimum withdrawal is $${MINIMUM_WITHDRAWAL_AMOUNT.toFixed(1)}`,'warning');return}const withdrawBtn=document.getElementById('withdraw-btn');const revertBtnLoadingState=addLoadingState(withdrawBtn,'Processing...');const withdrawAmount=userStats.totalEarnings;const withdrawalTimestamp=new Date().toISOString();const userWithdrawalRecord={timestamp:withdrawalTimestamp,amount:withdrawAmount,status:'Requested'};const previousTotalEarnings=userStats.totalEarnings;const previousUserWithdrawalHistory=userStats.withdrawalHistory?[...userStats.withdrawalHistory]:[];if(!userStats.withdrawalHistory)userStats.withdrawalHistory=[];userStats.withdrawalHistory.push(userWithdrawalRecord);if(userStats.withdrawalHistory.length>20)userStats.withdrawalHistory.shift();userStats.totalEarnings=0;updateDashboard();try{await saveUserData();const withdrawalRequestRef=await window.addDoc(window.collection(window.db,"withdrawalRequests"),{userId:currentUser.uid,username:userStats.username,email:userStats.email,amount:withdrawAmount,requestedAt:withdrawalTimestamp,status:'Requested',paymentMethod:null,transactionId:null,notes:null,processedAt:null});console.log("Withdrawal request created in 'withdrawalRequests' with ID: ",withdrawalRequestRef.id);showToast('Withdrawal Initiated',`$${withdrawAmount.toFixed(3)} recorded. Your balance is now $0.000.`,'success');const googleFormUrl='https://forms.gle/NEiK8TVhJWN3RSvFA';window.open(googleFormUrl,'_blank')}catch(error){console.error("Error processing withdrawal:",error);showToast('Withdrawal Error','Could not process your withdrawal. Please try again.','error');userStats.totalEarnings=previousTotalEarnings;userStats.withdrawalHistory=previousUserWithdrawalHistory;updateDashboard()}finally{revertBtnLoadingState()}}
function showToast(title, description, type = 'info') { /* ... same ... */ const tC=document.getElementById('toast-container');const tI='toast_'+Date.now();const i={success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'};const t=document.createElement('div');t.id=tI;t.className=`toast ${type}`;t.innerHTML=`<div class="toast-icon">${i[type]}</div><div class="toast-content"><div class="toast-title">${title}</div>${description?`<div class="toast-description">${description}</div>`:''}</div><button class="toast-close" onclick="hideToast('${tI}')">×</button>`;tC.appendChild(t);setTimeout(()=>t.classList.add('show'),10);setTimeout(()=>hideToast(tI),5000)}
function hideToast(toastId) { /* ... same ... */ const t=document.getElementById(toastId);if(t){t.classList.remove('show');setTimeout(()=>t.remove(),300)}}
document.addEventListener('click',function(event){const m=document.getElementById('auth-modal');if(event.target===m)hideAuthModal()});
document.addEventListener('keydown',function(event){if(event.key==='Escape')hideAuthModal()});
document.addEventListener('keydown',function(event){if(event.key==='Enter'&&event.target.tagName==='INPUT'){const f=event.target.closest('form');if(f&&typeof f.onsubmit==='function'){/* Let HTML onsubmit handle */}}});
function addLoadingState(element,text='Loading...'){const oH=element.innerHTML;const iB=element.tagName==='BUTTON';if(iB)element.disabled=true;element.innerHTML=`<span class="loading"></span> ${text}`;return()=>{element.innerHTML=oH;if(iB)element.disabled=false}}
function initializeInteractiveElements(){const c=document.querySelectorAll('.stat-card,.step-card,.feature-card,.dashboard-card,.level-card');c.forEach(card=>{card.addEventListener('mouseenter',function(){this.style.transform='translateY(-5px)'});card.addEventListener('mouseleave',function(){this.style.transform='translateY(0)'})})} // Added .level-card
