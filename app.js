/* ====== PWA Service Worker Registration ====== */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered!', reg.scope))
            .catch(err => console.log('Service Worker Reg Failed:', err));
    });
}

/* ====== Theme Management ====== */
const themeToggles = document.querySelectorAll('.theme-toggle');
const body = document.body;
const themeColorMeta = document.getElementById('themeColorMeta');

const updateIcons = (theme) => {
    themeToggles.forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon) {
            if (theme === 'dark') icon.classList.replace('fa-sun', 'fa-moon');
            else icon.classList.replace('fa-moon', 'fa-sun');
        }
    });
};

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.setAttribute('data-theme', 'dark');
    updateIcons('dark');
    if (themeColorMeta) themeColorMeta.setAttribute('content', '#12181b');
}

themeToggles.forEach(themeToggle => {
    themeToggle.addEventListener('click', () => {
        if (body.hasAttribute('data-theme')) {
            body.removeAttribute('data-theme');
            updateIcons('light');
            localStorage.setItem('theme', 'light');
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#f4f9f9');
        } else {
            body.setAttribute('data-theme', 'dark');
            updateIcons('dark');
            localStorage.setItem('theme', 'dark');
            if (themeColorMeta) themeColorMeta.setAttribute('content', '#12181b');
        }
    });
});


/* ====== iOS Install Prompt ====== */
const iosPrompt = document.getElementById('iosPrompt');
const closeIosPrompt = document.getElementById('closeIosPrompt');

const checkIosApp = () => {
    if (!iosPrompt) return;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isIos && !isStandalone) {
        if (!localStorage.getItem('iosPromptDismissed')) {
            setTimeout(() => {
                iosPrompt.classList.add('show');
            }, 2000);
        }
    }
};

if (closeIosPrompt) {
    closeIosPrompt.addEventListener('click', () => {
        iosPrompt.classList.remove('show');
        localStorage.setItem('iosPromptDismissed', 'true');
    });
}


/* ====== SPA Routing ====== */
const views = {
    random: document.getElementById('view-random'),
    lottery: document.getElementById('view-lottery'),
    check: document.getElementById('view-check')
};

const navItems = {
    random: document.getElementById('nav-random'),
    lottery: document.getElementById('nav-lottery'),
    check: document.getElementById('nav-check')
};

let lotteryLoaded = false;
let checkLoaded = false;

function navigateTo(viewName) {
    if (!views[viewName]) return;

    // Hide all views
    Object.values(views).forEach(view => {
        if (view) view.classList.remove('active');
    });

    // Deactivate all nav items
    Object.values(navItems).forEach(nav => {
        if (nav) nav.classList.remove('active');
    });

    // Show active
    views[viewName].classList.add('active');
    if (navItems[viewName]) navItems[viewName].classList.add('active');

    // Trigger loads if empty
    if (viewName === 'lottery' && !lotteryLoaded) {
        fetchLotteryData();
        lotteryLoaded = true;
    }
    if (viewName === 'check') {
        if (!checkLoaded) {
            loadDates();
            checkLoaded = true;
        }

        // Refresh check lottery form fields every time we enter this view
        ['numberInput', 'numberInput3', 'numberInput2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const rBox = document.getElementById('resultBox');
        if (rBox) {
            rBox.style.display = 'none';
            rBox.className = 'result-box';
            rBox.innerHTML = '';
        }
    }

    window.location.hash = viewName;
    window.scrollTo(0, 0);
}

// Listen to Nav Clicks
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const viewName = item.getAttribute('data-view');
        if (viewName) navigateTo(viewName);
    });
});

// Initial View Load
window.addEventListener('load', () => {
    let hash = window.location.hash.replace('#', '');
    if (!views[hash]) hash = 'random'; // default view
    navigateTo(hash);
    checkIosApp();
});


/* =========================================================
   1. RANDOM NUMBER LOGIC
   ========================================================= */
const resultDisplay = document.getElementById('resultDisplay');
let isAnimating = false;

function resetNumber() {
    if (isAnimating || !resultDisplay) return;
    resultDisplay.textContent = '- - -';
    resultDisplay.classList.add('placeholder');
}

function generateNumber(digits) {
    if (isAnimating || !resultDisplay) return;

    isAnimating = true;
    const btn = event.currentTarget || event.target;
    // We can disable button while animating to prevent spam
    const originalText = btn.innerHTML;

    resultDisplay.classList.remove('placeholder');
    resultDisplay.classList.remove('animate-number');

    let counter = 0;
    const duration = 20; // Number of shuffles
    const intervalTime = 40; // Ms between shuffles

    const interval = setInterval(() => {
        let tempNum = '';
        for (let i = 0; i < digits; i++) {
            tempNum += Math.floor(Math.random() * 10);
        }
        // Force rendering spacing for layout stability
        if (digits === 6) resultDisplay.style.letterSpacing = "0.3rem";
        else resultDisplay.style.letterSpacing = "0.5rem";

        resultDisplay.textContent = tempNum;
        counter++;

        if (counter >= duration) {
            clearInterval(interval);
            let finalNum = '';
            for (let i = 0; i < digits; i++) {
                finalNum += Math.floor(Math.random() * 10);
            }
            resultDisplay.textContent = finalNum;
            resultDisplay.classList.add('animate-number');
            isAnimating = false;
        }
    }, intervalTime);
}

// Make functions available globally since they're called from inline onclick=""
window.resetNumber = resetNumber;
window.generateNumber = generateNumber;


/* =========================================================
   2. LOTTERY LOGIC
   ========================================================= */
const lotteryContainer = document.getElementById('lotteryContainer');
const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const thaiMonthsFull = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

async function fetchLotteryData() {
    if (!lotteryContainer) return;

    try {
        const listRes = await fetch('https://lotto.api.rayriffy.com/list/1');
        if (!listRes.ok) throw new Error('Network response list was not ok');

        const listData = await listRes.json();
        const recentDates = listData.response.slice(0, 5);
        lotteryContainer.innerHTML = '';

        for (let i = 0; i < recentDates.length; i++) {
            const dateId = recentDates[i].id;
            const res = await fetch(`https://lotto.api.rayriffy.com/lotto/${dateId}`);
            if (res.ok) {
                const data = await res.json();
                renderLotteryCard(data.response, i === 0);
            }
        }
    } catch (error) {
        console.error("Error fetching lottery data:", error);
        lotteryContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i> ขออภัย ไม่สามารถดึงข้อมูลสลากกินแบ่งได้ในขณะนี้ การเชื่อมต่ออาจมีปัญหา
            </div>
        `;
    }
}

function formatThaiDate(dateString) {
    const parts = dateString.split(' ');
    if (parts.length >= 3) {
        const day = parts[0];
        const monthFull = parts[1];
        let monthShort = monthFull;

        const monthIndex = thaiMonthsFull.findIndex(m => m === monthFull);
        if (monthIndex !== -1) monthShort = thaiMonths[monthIndex];

        const year = parts[2];
        return { day, monthShort, year, fullString: dateString };
    }
    return { day: "-", monthShort: "-", year: "-", fullString: dateString };
}

function renderLotteryCard(data, isLatest = false) {
    if (!lotteryContainer) return;
    const dateInfo = formatThaiDate(data.date);

    const prize1 = data.prizes[0] ? data.prizes[0].number[0] : "------";
    const prize1Reward = data.prizes[0] && data.prizes[0].reward ? `(${parseInt(data.prizes[0].reward).toLocaleString()} บ.)` : "(6,000,000 บ.)";

    let numFront3 = ["---", "---"];
    let numBack3 = ["---", "---"];
    let numBack2 = "---";
    let front3Reward = "(4,000 บ.)";
    let back3Reward = "(4,000 บ.)";
    let back2Reward = "(2,000 บ.)";

    if (data.runningNumbers) {
        if (data.runningNumbers[0] && data.runningNumbers[0].number.length > 0) {
            numFront3 = data.runningNumbers[0].number;
            if (data.runningNumbers[0].reward) front3Reward = `(${parseInt(data.runningNumbers[0].reward).toLocaleString()} บ.)`;
        }
        if (data.runningNumbers[1] && data.runningNumbers[1].number.length > 0) {
            numBack3 = data.runningNumbers[1].number;
            if (data.runningNumbers[1].reward) back3Reward = `(${parseInt(data.runningNumbers[1].reward).toLocaleString()} บ.)`;
        }
        if (data.runningNumbers[2] && data.runningNumbers[2].number.length > 0) {
            numBack2 = data.runningNumbers[2].number[0];
            if (data.runningNumbers[2].reward) back2Reward = `(${parseInt(data.runningNumbers[2].reward).toLocaleString()} บ.)`;
        }
    }

    const isLatestStyle = isLatest ? 'style="border-color: var(--primary-color); box-shadow: 0 4px 15px rgba(129, 203, 234, 0.4);"' : '';
    const latestBadgeHtml = isLatest ? `<span style="background-color: var(--primary-color); color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; margin-left: 10px; vertical-align: middle;">ล่าสุด</span>` : '';

    const html = `
        <div class="lottery-card" ${isLatestStyle}>
            <div class="lottery-date-box">
                <div class="day">${dateInfo.day}</div>
                <div class="month-year">${dateInfo.monthShort}${dateInfo.year}</div>
            </div>
            <div class="lottery-content">
                <div class="lottery-title">งวดวันที่ ${dateInfo.fullString} ${latestBadgeHtml}</div>
                <div class="results-grid">
                    <div class="result-item">
                        <div class="result-label">รางวัลที่ 1 <span style="font-size: 0.75rem; color: var(--success-color);">${prize1Reward}</span></div>
                        <div class="result-number">${prize1}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">เลขหน้า 3 ตัว <span style="font-size: 0.75rem; color: var(--success-color);">${front3Reward}</span></div>
                        <div class="result-number multi">
                            <span>${numFront3[0] || "---"}</span>
                            <span>${numFront3[1] || "---"}</span>
                        </div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">เลขท้าย 3 ตัว <span style="font-size: 0.75rem; color: var(--success-color);">${back3Reward}</span></div>
                        <div class="result-number multi">
                            <span>${numBack3[0] || "---"}</span>
                            <span>${numBack3[1] || "---"}</span>
                        </div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">เลขท้าย 2 ตัว <span style="font-size: 0.75rem; color: var(--success-color);">${back2Reward}</span></div>
                        <div class="result-number">${numBack2}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    lotteryContainer.innerHTML += html;
}


/* =========================================================
   3. CHECK LOTTERY LOGIC
   ========================================================= */
const dateSelect = document.getElementById('dateSelect');
const numberInput = document.getElementById('numberInput');
const numberInput3 = document.getElementById('numberInput3');
const numberInput2 = document.getElementById('numberInput2');
const checkBtn = document.getElementById('checkBtn');
const resultBox = document.getElementById('resultBox');

let lottoDataCache = {};

async function loadDates() {
    if (!dateSelect) return;
    try {
        const listRes = await fetch('https://lotto.api.rayriffy.com/list/1');
        const listData = await listRes.json();
        const recentDates = listData.response.slice(0, 6);

        dateSelect.innerHTML = '';
        recentDates.forEach((dateItem) => {
            const option = document.createElement('option');
            option.value = dateItem.id;
            option.textContent = 'งวดวันที่ ' + dateItem.date;
            dateSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading dates:", error);
        dateSelect.innerHTML = '<option value="">ไม่สามารถโหลดงวดได้</option>';
    }
}

async function checkLottery() {
    if (!dateSelect) return;

    const dateId = dateSelect.value;
    const number6 = numberInput.value;
    const number3 = numberInput3.value;
    const number2 = numberInput2.value;

    if (!dateId) {
        showErrorBox("แจงเตือน", "กรุณาเลือกงวดที่ต้องการตรวจสอบ");
        return;
    }

    let checkTarget = '';
    let checkType = '';

    if (number6.length === 6) {
        checkTarget = number6;
        checkType = '6';
    } else if (number3.length === 3) {
        checkTarget = number3;
        checkType = '3';
    } else if (number2.length === 2) {
        checkTarget = number2;
        checkType = '2';
    } else {
        showErrorBox("กรุณาตรวจสอบสลาก", "กรุณากรอกตัวเลขให้ครบถ้วน");
        return;
    }

    checkBtn.disabled = true;
    checkBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> กำลังตรวจสอบ...';
    resultBox.style.display = 'none';
    resultBox.className = 'result-box';

    try {
        let data = lottoDataCache[dateId];
        if (!data) {
            const res = await fetch('https://lotto.api.rayriffy.com/lotto/' + dateId);
            if (!res.ok) throw new Error('API Error');
            const json = await res.json();
            data = json.response;
            lottoDataCache[dateId] = data;
        }

        let winPrizes = [];
        let totalReward = 0;

        // Validation logic for exact numbers based on checkType
        const checkFrontThree = (runNum) => {
            if (runNum.id === "runningNumberFrontThree" && runNum.number && runNum.number.includes(checkTarget)) {
                let rewardText = runNum.reward ? "" : " (4,000 บาท)";
                totalReward += runNum.reward ? parseInt(runNum.reward) : 4000;
                winPrizes.push((runNum.name || "รางวัลเลขหน้า 3 ตัว") + rewardText);
            }
        };

        const checkBackThree = (runNum) => {
            if (runNum.id === "runningNumberBackThree" && runNum.number && runNum.number.includes(checkTarget)) {
                let rewardText = runNum.reward ? "" : " (4,000 บาท)";
                totalReward += runNum.reward ? parseInt(runNum.reward) : 4000;
                winPrizes.push((runNum.name || "รางวัลเลขท้าย 3 ตัว") + rewardText);
            }
        };

        const checkBackTwo = (runNum) => {
            if (runNum.id === "runningNumberBackTwo" && runNum.number && runNum.number.includes(checkTarget)) {
                let rewardText = runNum.reward ? "" : " (2,000 บาท)";
                totalReward += runNum.reward ? parseInt(runNum.reward) : 2000;
                winPrizes.push((runNum.name || "รางวัลเลขท้าย 2 ตัว") + rewardText);
            }
        };

        if (checkType === '6') {
            if (data.prizes) {
                data.prizes.forEach(prize => {
                    if (prize.number && prize.number.includes(checkTarget)) {
                        winPrizes.push(prize.name);
                        if (prize.reward) totalReward += parseInt(prize.reward);
                    }
                });
            }
            if (data.runningNumbers) {
                const f3 = checkTarget.substring(0, 3);
                const b3 = checkTarget.substring(3, 6);
                const b2 = checkTarget.substring(4, 6);

                data.runningNumbers.forEach(runNum => {
                    if (runNum.id === "runningNumberFrontThree" && runNum.number && runNum.number.includes(f3)) {
                        totalReward += runNum.reward ? parseInt(runNum.reward) : 4000;
                        winPrizes.push((runNum.name || "รางวัลเลขหน้า 3 ตัว") + (runNum.reward ? "" : " (4,000 บาท)"));
                    }
                    if (runNum.id === "runningNumberBackThree" && runNum.number && runNum.number.includes(b3)) {
                        totalReward += runNum.reward ? parseInt(runNum.reward) : 4000;
                        winPrizes.push((runNum.name || "รางวัลเลขท้าย 3 ตัว") + (runNum.reward ? "" : " (4,000 บาท)"));
                    }
                    if (runNum.id === "runningNumberBackTwo" && runNum.number && runNum.number.includes(b2)) {
                        totalReward += runNum.reward ? parseInt(runNum.reward) : 2000;
                        winPrizes.push((runNum.name || "รางวัลเลขท้าย 2 ตัว") + (runNum.reward ? "" : " (2,000 บาท)"));
                    }
                });
            }
        } else if (checkType === '3') {
            if (data.runningNumbers) {
                data.runningNumbers.forEach(runNum => {
                    checkFrontThree(runNum);
                    checkBackThree(runNum);
                });
            }
        } else if (checkType === '2') {
            if (data.runningNumbers) {
                data.runningNumbers.forEach(runNum => {
                    checkBackTwo(runNum);
                });
            }
        }

        if (winPrizes.length > 0) {
            let totalText = totalReward > 0 ? `<div class="result-detail" style="margin-top: 15px; font-size: 1.25rem; font-weight: 500; color: var(--success-color); background-color: #ffffff; padding: 10px; border-radius: 10px; box-shadow: 0 4px 10px rgba(40, 167, 69, 0.1);">รวมเงินรางวัล: <strong>${totalReward.toLocaleString()}</strong> บาท</div>` : '';
            resultBox.classList.add('won');
            resultBox.innerHTML = `
                <div class="result-title"><i class="fas fa-check-circle"></i> ยินดีด้วย! คุณถูกรางวัล</div>
                <div class="result-detail">สลากหมายเลข: <strong>${checkTarget}</strong></div>
                <div class="result-detail" style="margin-top: 10px; font-weight: 400; font-size: 1.1rem; line-height: 1.6;"><strong>${winPrizes.join('<br>')}</strong></div>
                ${totalText}
            `;
        } else {
            resultBox.classList.add('none');
            resultBox.innerHTML = `
                <div class="result-title"><i class="fas fa-times-circle"></i> ไม่ถูกรางวัล</div>
                <div class="result-detail">สลากหมายเลข: <strong>${checkTarget}</strong></div>
                <div class="result-detail" style="margin-top: 5px; font-size: 0.95rem;">งวดวันที่ ${data.date}</div>
            `;
        }

    } catch (error) {
        console.error("Error checking lottery:", error);
        showErrorBox("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการตรวจสอบ กรุณาลองใหม่ในภายหลัง");
    }

    checkBtn.disabled = false;
    checkBtn.innerHTML = '<i class="fas fa-search"></i> ตรวจรางวัล';
    resultBox.style.display = 'block';
}

function showErrorBox(title, message) {
    resultBox.className = 'result-box none';
    resultBox.style.display = 'block';
    resultBox.innerHTML = `
        <div class="result-title"><i class="fas fa-exclamation-triangle"></i> ${title}</div>
        <div class="result-detail" style="font-weight: 500;">${message}</div>
    `;
}

window.checkLottery = checkLottery;

// Bind Enter keys if elements exist
if (numberInput) {
    const enterListener = (e) => { if (e.key === "Enter") { e.preventDefault(); checkLottery(); } };
    numberInput.addEventListener("keypress", enterListener);
    if (numberInput3) numberInput3.addEventListener("keypress", enterListener);
    if (numberInput2) numberInput2.addEventListener("keypress", enterListener);
}
