// ==UserScript==
// @name         Wayfarer Auto Reviewer
// @namespace    https://wayfarer.nianticlabs.com
// @version      1.0
// @description  Auto review.
// @author       Chucny
// @match        https://wayfarer.nianticlabs.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(() => {
    'use strict';

    console.log('%cWayfarer Auto Reviewer (made by Chucny)', 'color:#f0f; font-size:18px; font-weight:bold');

    let isRunning = false;
    let reviewsDone = 0;
    let maxReviews = 100000000;
    let currentTimeout = null;   // ← Fixed: properly declared here

    const CONFIG = {
        minDelay: 2300,
        maxDelay: 5800,
        acceptChance: 96,
        skipChance: 4,
        reportChance: 0,
        fillText: true
    };

    const RANDOM_SENTENCES = [
        "This meets all acceptance criteria.",
        "Clear and accurate wayspot candidate.",
        "Good location for exploration.",
        "Safe and appropriate for the community.",
        "Would be a nice addition to the map.",
        "No issues found with this nomination."
    ];

    function createPanel() {
        if (document.getElementById('auto-reviewer-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'auto-reviewer-panel';
        panel.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999999; width: 480px;
            background: linear-gradient(145deg, #111133, #1a1a2e); border: 4px solid #f0f;
            border-radius: 16px; box-shadow: 0 0 40px #f0f; color: #0ff;
            font-family: monospace; font-size: 13px; padding: 0; overflow: hidden;
        `;

        panel.innerHTML = `
            <div style="background:#f0f;color:#000;padding:14px 20px;font-weight:bold;font-size:18px;display:flex;justify-content:space-between;">
                🔥 AUTO-REVIEWER v1.6
                <span id="status-dot" style="width:14px;height:14px;background:#0f0;border-radius:50%;display:inline-block;"></span>
            </div>
            <div style="padding:16px;">
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <button onclick="toggleAutoReview()" id="start-btn" style="flex:1;padding:14px;background:#0f0;color:#000;font-weight:bold;border:none;border-radius:12px;">▶️ START REVIEW</button>
                    <button onclick="stopAutoReview()" style="flex:1;padding:14px;background:#f80;color:#000;font-weight:bold;border:none;border-radius:12px;">⏹️ STOP</button>
                </div>

                <div style="background:#112233;padding:12px;border-radius:8px;margin-bottom:12px;">
                    Reviews done: <span id="count" style="color:#0ff;font-weight:bold;">0</span> / ${maxReviews}<br>
                    Status: <span id="live-status" style="color:#ff0;">Ready</span>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
    }

    function findAndClickButton(patternLists, maxAttempts = 15, delayBetween = 350) {
        return new Promise(resolve => {
            let attempts = 0;

            const tryClick = () => {
                attempts++;
                const elements = Array.from(document.querySelectorAll('button, [role="button"], input[type="radio"], label, div[role="radio"]'));

                for (let patterns of patternLists) {
                    for (let el of elements) {
                        const text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('value') || '').trim().toLowerCase();
                        if (patterns.some(p => text.includes(p))) {
                            console.log(`%c✅ CLICKING: "${el.textContent.trim()}"`, 'color:#0f0; font-weight:bold');
                            el.scrollIntoView({ block: "center", behavior: "smooth" });
                            setTimeout(() => el.click(), 180);
                            resolve(true);
                            return;
                        }
                    }
                }

                if (attempts < maxAttempts) {
                    setTimeout(tryClick, delayBetween);
                } else {
                    console.warn('%c⚠️ Button not found after retries', 'color:#f80');
                    resolve(false);
                }
            };
            tryClick();
        });
    }

    async function clickAllThumbs() {
        console.log('%c📍 Clicking thumbs criteria...', 'color:#ff0');
        const upPatterns = [['thumbs up', 'thumb up', '👍', 'yes', 'good', 'great place', 'exploring', 'exercise', 'i don't know', 'socialize', 'appropriate', 'safe', 'accurate']];
        await findAndClickButton(upPatterns, 10, 280);

        if (Math.random() < 0.18) {
            const downPatterns = [['thumbs down', 'thumb down', '👎', 'no', 'bad', 'i don't know']];
            await findAndClickButton(downPatterns, 6, 280);
        }
    }

    function fillTextFields() {
        if (!CONFIG.fillText) return;
        document.querySelectorAll('textarea, input[type="text"]').forEach(ta => {
            if (!ta.value || ta.value.length < 5) {
                const sentence = RANDOM_SENTENCES[Math.floor(Math.random() * RANDOM_SENTENCES.length)];
                ta.value = sentence;
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    async function handleSubmit() {
        console.log('%c✅ SUBMIT flow', 'color:#0f0');
        await clickAllThumbs();
        fillTextFields();

        const submitPatterns = [['submit', 'confirm', 'accept', 'finish', 'next', 'send', 'submit & next']];
        await findAndClickButton(submitPatterns, 12, 350);
    }

    async function handleSkip() {
        console.log('%c⏭️ SKIP', 'color:#ff0');
        await findAndClickButton([['skip']], 10, 300);
    }

    async function handleReport() {
        console.log('%c🚩 REPORT flow', 'color:#f80');

        await findAndClickButton([['report']], 8, 400);
        await new Promise(r => setTimeout(r, 800)); // wait for modal

        // Choose random reason
        const reasonPatterns = [
            ['duplicate', 'already exists'],
            ['private', 'private property', 'home'],
            ['inappropriate', 'offensive'],
            ['spam', 'low quality']
        ];
        await findAndClickButton(reasonPatterns, 12, 300);

        fillTextFields();

        // FIXED: More reliable final Submit Report click
        await new Promise(r => setTimeout(r, 900));
        console.log('%c📤 Clicking final Submit Report...', 'color:#ff0');

        const finalPatterns = [
            ['submit report', 'submit', 'confirm report', 'send report', 'yes', 'confirm']
        ];
        const clicked = await findAndClickButton(finalPatterns, 18, 400);

        if (!clicked) {
            // Last resort fallback
            const fallbackBtn = Array.from(document.querySelectorAll('button')).find(b =>
                /submit|confirm|send/i.test((b.textContent || '').toLowerCase())
            );
            if (fallbackBtn) fallbackBtn.click();
        }
    }

    async function runAutoReview() {
        if (!isRunning || reviewsDone >= maxReviews) {
            stopAutoReview();
            return;
        }

        if (!/review/i.test(window.location.href)) {
            document.getElementById('live-status').textContent = 'Go to Review tab!';
            setTimeout(runAutoReview, 1500);
            return;
        }

        document.getElementById('live-status').textContent = `Review #${reviewsDone + 1}...`;

        const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay) + CONFIG.minDelay);
        console.log(`%c⏳ Waiting ${Math.round(delay/1000)}s`, 'color:#ff0');

        await new Promise(r => { currentTimeout = setTimeout(r, delay); });

        if (!isRunning) return;

        const rand = Math.random() * 100;
        if (rand < CONFIG.acceptChance) await handleSubmit();
        else if (rand < CONFIG.acceptChance + CONFIG.skipChance) await handleSkip();
        else await handleReport();

        reviewsDone++;
        document.getElementById('count').textContent = reviewsDone;

        setTimeout(runAutoReview, 650);
    }

    window.toggleAutoReview = () => {
        isRunning = !isRunning;
        const btn = document.getElementById('start-btn');
        const dot = document.getElementById('status-dot');

        if (isRunning) {
            btn.textContent = '⏹️ STOP';
            btn.style.background = '#f80';
            dot.style.background = '#0f0';
            document.getElementById('live-status').textContent = 'RUNNING';
            runAutoReview();
            console.log('%c🚀 v1.6 STARTED!', 'color:#0ff');
        } else {
            stopAutoReview();
        }
    };

    window.stopAutoReview = () => {
        isRunning = false;
        if (currentTimeout) clearTimeout(currentTimeout);
        const btn = document.getElementById('start-btn');
        const dot = document.getElementById('status-dot');
        btn.textContent = '▶️ START REVIEW';
        btn.style.background = '#0f0';
        dot.style.background = '#f80';
        document.getElementById('live-status').textContent = `Paused — ${reviewsDone} done`;
    };

    function init() {
        createPanel();
        console.log('%c✅ v1.6 loaded and fixed. Go to Review tab and start.', 'color:#0ff');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
