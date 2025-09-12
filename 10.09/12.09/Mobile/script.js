document.addEventListener('DOMContentLoaded', () => {
    const quiz = document.getElementById('quiz');
    const quizWrapper = document.querySelector('.quiz-wrapper');
    const quizContainer = document.querySelector('.quiz-container');
    const resultsContainer = document.getElementById('results-container');
    const loader = document.getElementById('perceptual-loader');
    const stagedText = document.getElementById('staged-text');
    const stagedPct = document.getElementById('staged-pct');
    const stagedFill = document.getElementById('staged-fill');
    const stagedHint = document.getElementById('staged-hint');
    const resultsGrid = document.getElementById('results');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progress = document.getElementById('progress');
    const rtsBtn = document.getElementById('rtsBtn');
    const customBtn = document.getElementById('customBtn');
    const emailForm = document.getElementById('email-results-form');
    const emailInput = document.getElementById('user-email');
    const emailSuccessMessage = document.getElementById('email-success-message');

    const webhookUrl = 'https://jameswall.app.n8n.cloud/webhook/41f4c517-afe6-48ce-8cc7-bc77306eebc2';
    const emailWebhookUrl = 'https://jameswall.app.n8n.cloud/webhook-test/ee3fe09d-c32c-49e3-b316-65fe9a89b956';

    let currentStepIndex = 0;
    let stepHistory = [];
    let answers = {};
    let currentStepOrder = ['primaryUse'];
    let allRecommendations = {};
    let currentView = 'RTS';
    let messageInterval;
    let abortController = null;

    const LOADER_CFG = {
        minShowMs: 800,
        slowBeatMs: 45000,
        hardTimeoutMs: 90000,
        copy: [
            'Preparing your results…',
            'Matching components and stock…',
            'Ranking the best value…',
            'Finalising picks…'
        ]
    };

    const allSteps = Array.from(document.querySelectorAll('.step'));

    function determineStepOrder() {
        const primaryUse = answers.primaryUse || [];
        let newOrder = ['primaryUse', 'pcType'];

        if (primaryUse.includes('Gaming')) {
            newOrder.push('games', 'resolution');
        }
        // Add other conditional steps based on primary use if they exist
        // For now, we only have 'games' and 'resolution' as conditional

        if (answers.pcType && answers.pcType[0] === 'Desktop') {
            newOrder.push('caseSize');
        }
        
        newOrder.push('budget');
        
        // Remove duplicates, keeping the first occurrence
        currentStepOrder = [...new Set(newOrder)];
    }

    function showStep(stepId) {
        allSteps.forEach(step => {
            step.style.display = 'none';
        });

        const nextStepElement = allSteps.find(step => step.dataset.stepId === stepId);
        if (nextStepElement) {
            nextStepElement.style.display = 'block';
        }

        if (stepId === 'budget') {
            updateBudgetOptions();
        }

        currentStepIndex = currentStepOrder.indexOf(stepId);
        updateProgress();
        updateButtons();
    }

    function updateProgress() {
        const totalSteps = currentStepOrder.length;
        const progressPercentage = totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 0;
        progress.style.width = `${progressPercentage}%`;
    }

    function updateButtons() {
        const currentStepId = currentStepOrder[currentStepIndex];
        const currentStepElement = document.querySelector(`.step[data-step-id="${currentStepId}"]`);
        if (!currentStepElement) return;

        const questions = currentStepElement.querySelectorAll('.options-grid');
        let allRequiredAnswered = true;
        let isMultipleSelect = false;

        if (currentStepId !== 'games') {
            let answered = false;
            questions.forEach(q => {
                const questionId = q.dataset.questionId;
                if (answers[questionId] && answers[questionId].length > 0) {
                    answered = true;
                }
            });
            allRequiredAnswered = answered;
        }

        questions.forEach(q => {
            const questionId = q.dataset.questionId;
            if (q.dataset.selectType === 'multiple' && answers[questionId] && answers[questionId].length > 0) {
                isMultipleSelect = true;
            }
        });

        const isLastStep = currentStepIndex === currentStepOrder.length - 1;

        nextBtn.style.display = !isLastStep ? 'inline-block' : 'none';
        submitBtn.style.display = isLastStep ? 'inline-block' : 'none';
        prevBtn.style.display = currentStepIndex > 0 ? 'inline-block' : 'none';
        
        nextBtn.disabled = !allRequiredAnswered;
        submitBtn.disabled = !allRequiredAnswered;

        if (isMultipleSelect && allRequiredAnswered) {
            nextBtn.innerHTML = 'OK';
        } else {
            nextBtn.innerHTML = 'Next';
        }
    }

    quiz.addEventListener('click', (e) => {
        const card = e.target.closest('.option-card');
        if (!card) return;

        if (e.target.classList.contains('switch-res-button')) {
            e.stopPropagation();
            const newResolution = e.target.dataset.res;
            switchResolution(newResolution);
            selectCard(card);
            return;
        }

        if (e.target.classList.contains('change-budget-button')) {
            e.stopPropagation();
            card.classList.remove('expanded');
            const questionId = card.closest('.options-grid').dataset.questionId;
            const value = card.dataset.value;
            if (answers[questionId]) {
                const index = answers[questionId].indexOf(value);
                if (index > -1) {
                    answers[questionId].splice(index, 1);
                }
            }
            card.classList.remove('selected');
            updateButtons();
            return;
        }

        if (card.classList.contains('requires-attention') && !card.classList.contains('expanded')) {
            card.classList.add('expanded');
            return;
        }

        selectCard(card);
    });

    function selectCard(card) {
        const optionsGrid = card.closest('.options-grid');
        const questionId = optionsGrid.dataset.questionId;
        const selectType = optionsGrid.dataset.selectType;
        const value = card.dataset.value;

        if (!answers[questionId]) {
            answers[questionId] = [];
        }

        const isExclusive = selectType === 'single-exclusive';
        const isSingle = selectType === 'single';

        if (isExclusive) {
            const isSelected = card.classList.contains('selected');
            const allGridsForQuestion = card.closest('.step').querySelectorAll(`.options-grid[data-question-id="${questionId}"]`);
            allGridsForQuestion.forEach(grid => {
                grid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
            });
            answers[questionId] = isSelected ? [] : [value];
            if (!isSelected) card.classList.add('selected');
        } else {
            const exclusiveGrid = card.closest('.step').querySelector(`.options-grid[data-question-id="${questionId}"][data-select-type="single-exclusive"]`);
            if (exclusiveGrid) {
                exclusiveGrid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
                if (answers[questionId].includes(exclusiveGrid.querySelector('.option-card').dataset.value)) {
                    answers[questionId] = [];
                }
            }

            if (isSingle) {
                optionsGrid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                answers[questionId] = [value];
            } else {
                const index = answers[questionId].indexOf(value);
                if (index > -1) {
                    answers[questionId].splice(index, 1);
                    card.classList.remove('selected');
                } else {
                    answers[questionId].push(value);
                    card.classList.add('selected');
                }
            }
        }
        
        if (questionId === 'primaryUse' || questionId === 'pcType' || questionId === 'resolution') {
            determineStepOrder();
        }
        
        updateButtons();
    }

    function updateBudgetOptions() {
        const resolution = answers.resolution ? answers.resolution[0] : null;
        const budgetStep = document.querySelector('.step[data-step-id="budget"]');
        const budgetCardToModify = budgetStep.querySelector('.option-card[data-value="1500-2500"]');

        if (budgetCardToModify) {
            if (resolution === '4K') {
                budgetCardToModify.classList.add('requires-attention');
            } else {
                budgetCardToModify.classList.remove('requires-attention');
                budgetCardToModify.classList.remove('expanded');
            }
        }
    }

    function switchResolution(newResolution) {
        answers.resolution = [newResolution];
        const resolutionStep = document.querySelector('.step[data-step-id="resolution"]');
        const allResolutionCards = resolutionStep.querySelectorAll('.option-card');
        allResolutionCards.forEach(c => c.classList.remove('selected'));
        
        const newCard = resolutionStep.querySelector(`.option-card[data-value="${newResolution}"]`);
        if (newCard) {
            newCard.classList.add('selected');
        }

        updateBudgetOptions();
        updateButtons();
    }

    nextBtn.addEventListener('click', () => {
        if (nextBtn.disabled) return;
        stepHistory.push(currentStepIndex);
        const nextStepIndex = currentStepIndex + 1;
        if (nextStepIndex < currentStepOrder.length) {
            showStep(currentStepOrder[nextStepIndex]);
        }
    });

    prevBtn.addEventListener('click', () => {
        if (stepHistory.length > 0) {
            const prevStepIndex = stepHistory.pop();
            showStep(currentStepOrder[prevStepIndex]);
        }
    });

    // Perceptual loader controls (extended for long waits)
    function startPerceptualLoader() {
        if (!loader) return;
        loader.style.display = 'block';

        // Local history utilities for ETA (rolling median of last 5 runs)
        const HISTORY_KEY = 'qm_rec_durations';
        const maxHistory = 5;
        const readHistory = () => {
            try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
        };
        const writeHistory = (arr) => {
            try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(-maxHistory))); } catch {}
        };
        const median = (arr) => {
            if (!arr.length) return 90000;
            const s = [...arr].sort((a,b)=>a-b);
            const mid = Math.floor(s.length/2);
            return s.length % 2 ? s[mid] : Math.round((s[mid-1] + s[mid]) / 2);
        };

        loader._startTs = Date.now();
        loader._predictedMs = median(readHistory()) || 90000;
        loader._lastMicroTs = 0;

        const micro = [
            'Analyzing your choices…',
            'Matching CPU ↔ GPU…',
            'Checking thermals…',
            'Verifying prices…',
            'Ensuring compatibility…',
            'Ranking value…',
            'Looking at stock…',
            'Simulating performance…',
        ];
        let microIdx = 0;

        // Initial staged jumps for early momentum
        const stagedSeq = [
            { msg: 'Finding your perfect match…', pct: 15, dur: 500 },
            { msg: 'Comparing components…', pct: 40, dur: 700 },
            { msg: 'Running benchmarks…', pct: 60, dur: 700 },
            { msg: 'Polishing recommendations…', pct: 80, dur: 600 },
        ];
        let i = 0;
        function runStaged() {
            if (!loader || loader.style.display === 'none') return;
            if (i < stagedSeq.length) {
                const s = stagedSeq[i++];
                if (stagedText) stagedText.textContent = s.msg;
                if (stagedPct) stagedPct.textContent = s.pct + '%';
                if (stagedFill) stagedFill.style.width = s.pct + '%';
                loader._stagedTimer = setTimeout(runStaged, s.dur);
            } else {
                beginTrickle();
            }
        }
        runStaged();

        // Long-wait beats (reassurance copy)
        if (loader._beatTimers) loader._beatTimers.forEach(clearTimeout);
        loader._beatTimers = [
            setTimeout(() => { if (stagedText) stagedText.textContent = 'Still working… matching components and stock'; }, 30000),
            setTimeout(() => { if (stagedText) stagedText.textContent = 'Almost done—ranking best value'; }, 60000),
            setTimeout(() => { if (stagedText) stagedText.textContent = 'Finalising picks…'; }, 80000),
        ];

        // Reset hint initially
        if (stagedHint) stagedHint.textContent = '';

        function beginTrickle() {
            const tick = () => {
                if (!loader || loader.style.display === 'none') return;
                const now = Date.now();
                const elapsed = now - loader._startTs;
                const predicted = loader._predictedMs || 90000;

                // Time-based percent towards 97% with subtle jitter
                const base = Math.min(97, Math.floor((elapsed / predicted) * 97));
                const current = parseInt((stagedPct?.textContent || '0').replace('%','')) || 0;
                const jitter = Math.random() * 0.6 + 0.2; // 0.2–0.8%
                const target = Math.max(current, Math.min(97, base + (current < base ? 0 : jitter)));

                if (stagedPct) stagedPct.textContent = target.toFixed(0) + '%';
                if (stagedFill) stagedFill.style.width = target + '%';

                // Live ETA / final checks
                const remaining = Math.max(0, predicted - elapsed);
                if (target >= 97 || elapsed >= predicted) {
                    if (stagedHint) stagedHint.textContent = 'Final checks…';
                } else if (stagedHint) {
                    const sec = Math.ceil(remaining / 1000);
                    const m = Math.floor(sec / 60);
                    const s = sec % 60;
                    const parts = [];
                    if (m) parts.push(`${m}m`);
                    parts.push(`${s}s`);
                    stagedHint.textContent = `About ${parts.join(' ')} remaining…`;
                }

                // Rotate believable microcopy every ~2s
                if (now - (loader._lastMicroTs || 0) > 2000) {
                    loader._lastMicroTs = now;
                    if (stagedText) {
                        stagedText.textContent = micro[microIdx++ % micro.length];
                    }
                }

                // Checklist ticks
                const items = document.querySelectorAll('#loader-checklist li');
                items.forEach(li => {
                    const ms = parseInt(li.getAttribute('data-ms') || '0', 10);
                    if (elapsed >= ms) li.classList.add('done');
                });

                loader._trickleTimer = setTimeout(tick, 1000 + Math.random() * 400);
            };
            tick();
        }

        // Wire cancel once
        const cancelBtn = document.getElementById('loader-cancel');
        if (cancelBtn && !loader._cancelWired) {
            loader._cancelWired = true;
            cancelBtn.addEventListener('click', () => {
                stopPerceptualLoader(true); // cancel mode
                // Restore quiz UI
                resultsContainer.style.display = 'none';
                quizContainer.style.display = 'block';
                const nav = document.querySelector('.navigation');
                if (nav) nav.style.display = 'flex';
                const toggle = document.querySelector('.results-toggle-buttons');
                if (toggle) toggle.style.display = 'none';
            });
        }
    }

    function stopPerceptualLoader(wasCancelled = false) {
        if (!loader) return;

        // Clear timers
        clearTimeout(messageInterval);
        if (loader._stagedTimer) clearTimeout(loader._stagedTimer);
        if (loader._trickleTimer) clearTimeout(loader._trickleTimer);
        if (loader._beatTimers) loader._beatTimers.forEach(clearTimeout);

        // Persist actual duration for future ETA unless user cancelled
        if (!wasCancelled) {
            try {
                const HISTORY_KEY = 'qm_rec_durations';
                const read = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } };
                const write = (arr) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(-5))); } catch {} };
                const start = loader._startTs || Date.now();
                const dur = Date.now() - start;
                const arr = read();
                arr.push(dur);
                write(arr);
            } catch {}
        }

        // Finish animation and hide
        if (stagedText && !wasCancelled) stagedText.textContent = 'Ready!';
        if (stagedPct && !wasCancelled) stagedPct.textContent = '100%';
        if (stagedFill && !wasCancelled) stagedFill.style.width = '100%';

        setTimeout(() => {
            loader.style.display = 'none';
            if (stagedHint) stagedHint.textContent = '';
            document.querySelectorAll('#loader-checklist li').forEach(li => li.classList.remove('done'));
        }, wasCancelled ? 0 : 500);
    }

    // New premium, honest loader (indeterminate-first) and abortable fetch
    function startLoader() {
        if (!loader) return;
        loader.style.display = 'block';
        loader.classList.add('indeterminate');
        loader.classList.remove('determinate');

        // ARIA
        const bar = loader.querySelector('.bar');
        if (bar) {
            bar.setAttribute('aria-busy', 'true');
            bar.setAttribute('aria-valuetext', 'Preparing results');
        }

        // History-based typical duration (display only)
        const HISTORY_KEY = 'qm_rec_durations';
        const readHistory = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } };
        const median = (arr) => {
            if (!arr.length) return 0;
            const s = [...arr].sort((a,b)=>a-b);
            const mid = Math.floor(s.length/2);
            return s.length % 2 ? s[mid] : Math.round((s[mid-1] + s[mid]) / 2);
        };

        loader._startTs = Date.now();
        const typical = median(readHistory());
        if (stagedHint) {
            if (typical > 0) {
                const sec = Math.ceil(typical / 1000);
                const m = Math.floor(sec / 60), s = sec % 60;
                stagedHint.textContent = `Typically ${m ? m + 'm ' : ''}${s}s.`;
            } else {
                stagedHint.textContent = '';
            }
        }

        // Single copy scheduler
        if (loader._copyTimer) clearInterval(loader._copyTimer);
        let idx = 0;
        if (stagedText) stagedText.textContent = LOADER_CFG.copy[0];
        loader._copyTimer = setInterval(() => {
            if (stagedText) stagedText.textContent = LOADER_CFG.copy[++idx % LOADER_CFG.copy.length];
        }, 3000);

        // Slow network hint
        if (loader._slowTimer) clearTimeout(loader._slowTimer);
        loader._slowTimer = setTimeout(() => {
            if (stagedText) stagedText.textContent = 'Still working—network looks slow';
        }, LOADER_CFG.slowBeatMs);

        // Wire cancel to abort once (separate flag from legacy)
        const cancelBtn = document.getElementById('loader-cancel');
        if (cancelBtn && !loader._cancelWired2) {
            loader._cancelWired2 = true;
            cancelBtn.addEventListener('click', () => {
                try { abortController?.abort(); } catch {}
                stopLoader(true);
                // Restore quiz UI
                resultsContainer.style.display = 'none';
                quizContainer.style.display = 'block';
                const nav = document.querySelector('.navigation');
                if (nav) nav.style.display = 'flex';
                const toggle = document.querySelector('.results-toggle-buttons');
                if (toggle) toggle.style.display = 'none';
            });
        }
    }

    function stopLoader(wasCancelled = false) {
        if (!loader) return;

        const elapsed = Date.now() - (loader._startTs || Date.now());
        const waitMore = Math.max(0, LOADER_CFG.minShowMs - elapsed);

        // Timers
        if (loader._copyTimer) clearInterval(loader._copyTimer);
        if (loader._slowTimer) clearTimeout(loader._slowTimer);

        const finalize = () => {
            // Persist actual duration for future typical display unless cancelled
            if (!wasCancelled) {
                try {
                    const HISTORY_KEY = 'qm_rec_durations';
                    const read = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } };
                    const write = (arr) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(-5))); } catch {}
                    };
                    const arr = read();
                    arr.push(Date.now() - (loader._startTs || Date.now()));
                    write(arr);
                } catch {}
            }
            loader.style.display = 'none';
            if (stagedHint) stagedHint.textContent = '';
            loader.classList.remove('indeterminate', 'determinate');
            const bar = loader.querySelector('.bar');
            if (bar) {
                bar.setAttribute('aria-busy', 'false');
                bar.removeAttribute('aria-valuenow');
                bar.setAttribute('aria-valuetext', '');
            }
        };

        if (!wasCancelled && stagedText) stagedText.textContent = 'Ready!';
        setTimeout(finalize, waitMore + (wasCancelled ? 0 : 200));
    }

    submitBtn.addEventListener('click', () => {
        if (submitBtn.disabled) return;
        
        quizContainer.style.display = 'none';
        document.querySelector('.navigation').style.display = 'none';
        resultsContainer.style.display = 'block';

        const toggle = document.querySelector('.results-toggle-buttons');
        if (toggle) toggle.style.display = 'inline-flex';
        if (rtsBtn) rtsBtn.disabled = true;
        if (customBtn) customBtn.disabled = true;

        if (loader) loader.style.display = 'block';
        resultsGrid.style.display = 'none';

        startLoader();

        // Abortable fetch with hard timeout
        abortController = new AbortController();
        const hardTimeout = setTimeout(() => {
            abortController.abort();
        }, LOADER_CFG.hardTimeoutMs);

        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(answers),
            signal: abortController.signal
        })
        .then(response => {
            clearTimeout(hardTimeout);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            showFinalResults(data);
        })
        .catch(error => {
            clearTimeout(hardTimeout);
            const aborted = error.name === 'AbortError';
            console.error('Fetch Error:', error);
            if (stagedText) stagedText.textContent = aborted
                ? 'Cancelled. Your answers are safe.'
                : 'Sorry, something went wrong. Please try again later.';
            if (!aborted && stagedHint) stagedHint.textContent = 'Please try again.';
            setTimeout(() => {
                stopLoader(aborted ? true : false);
                if (aborted) {
                    // Restore quiz UI
                    resultsContainer.style.display = 'none';
                    quizContainer.style.display = 'block';
                    const nav = document.querySelector('.navigation');
                    if (nav) nav.style.display = 'flex';
                    const toggle2 = document.querySelector('.results-toggle-buttons');
                    if (toggle2) toggle2.style.display = 'none';
                } else {
                    // Show inline error and recovery option
                    resultsGrid.style.display = 'block';
                    resultsGrid.innerHTML = `
                        <div style="max-width:700px;margin:40px auto;color:#f5f5f7;">
                            <h3 style="margin-bottom:10px;">We couldn’t fetch recommendations</h3>
                            <p style="color:#8a8a8e;margin-bottom:20px;">Please check your connection and try again.</p>
                            <button id="retry-btn" style="background:#e53935;color:#fff;border:none;padding:12px 20px;border-radius:999px;font-weight:600;cursor:pointer;">Back to answers</button>
                        </div>
                    `;
                    const retry = document.getElementById('retry-btn');
                    if (retry) {
                        retry.addEventListener('click', () => {
                            resultsContainer.style.display = 'none';
                            quizContainer.style.display = 'block';
                            const nav = document.querySelector('.navigation');
                            if (nav) nav.style.display = 'flex';
                            const toggle2 = document.querySelector('.results-toggle-buttons');
                            if (toggle2) toggle2.style.display = 'none';
                        });
                    }
                }
            }, 300);
        });
    });

    function showFinalResults(recommendationData) {
        clearTimeout(messageInterval);
    
        setTimeout(() => {
            stopLoader();
            const toggle = document.querySelector('.results-toggle-buttons');
            if (toggle) toggle.style.display = 'inline-flex';
            if (rtsBtn) rtsBtn.disabled = false;
            if (customBtn) customBtn.disabled = false;
            resultsGrid.style.display = 'grid';
            try {
                let parsedData;
                let dataToParse = recommendationData;

                // Handle the case where the data is wrapped in an array
                if (Array.isArray(dataToParse) && dataToParse.length > 0) {
                    dataToParse = dataToParse[0];
                }

                if (typeof dataToParse === 'object' && dataToParse !== null && 'output' in dataToParse) {
                    if (typeof dataToParse.output === 'string') {
                        try {
                            // First, clean up the string by removing backticks and "json" identifier
                            const jsonString = dataToParse.output.replace(/```json\n|```/g, '');
                            parsedData = JSON.parse(jsonString);
                        } catch (e) {
                            // If parsing fails, log the error and the problematic string
                            console.error("Failed to parse JSON string:", e);
                            console.error("Problematic JSON string:", dataToParse.output);
                            throw new Error("Invalid JSON format in 'output' string.");
                        }
                    } else {
                        parsedData = dataToParse.output;
                    }
                } else {
                    parsedData = dataToParse;
                }
    
                if (parsedData && parsedData.RTS && parsedData.Custom) {
                    allRecommendations = parsedData;
                    displayResults();
                } else {
                    throw new Error("Parsed data does not contain 'RTS' and 'Custom' arrays.");
                }
    
            } catch (e) {
                console.error("Error processing recommendation data:", e);
                console.error("Received data:", JSON.stringify(recommendationData, null, 2));
                resultsGrid.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, we couldn't process the recommendations. The format of the data we received was unexpected. Please try again later.</p>`;
            }
        }, 500);
    }

    function displayResults() {
        const recs = allRecommendations[currentView];
        if (!recs || recs.length === 0) {
            resultsGrid.innerHTML = `<p style="text-align: center; color: #fff;">Sorry, no ${currentView} builds match your criteria. Try the other category!</p>`;
            document.getElementById('mobile-results-container').innerHTML = '';
            return;
        }

        if (window.innerWidth <= 767) {
            resultsGrid.style.display = 'none';
            document.getElementById('mobile-results-container').style.display = 'block';
            displayMobileSingleView(recs);
        } else {
            document.getElementById('mobile-results-container').style.display = 'none';
            resultsGrid.style.display = 'grid';
            displayDesktopGrid(recs);
        }
    }

    function displayDesktopGrid(recs) {
        resultsGrid.innerHTML = '';
        recs.forEach(pc => {
            const card = document.createElement('div');
            card.className = 'result-card';
            if (pc.recommendationLevel === 'Our Recommendation') card.classList.add('top-choice');
            else if (pc.recommendationLevel === 'Best Value') card.classList.add('best-value');
            else if (pc.recommendationLevel === 'Level Up') card.classList.add('level-up');

            const badgeHTML = `<div class="recommendation-badge">${pc.recommendationLevel}</div>`;
            const strikethroughHTML = pc.strikethroughPrice ? `<p class="strikethrough-price">${pc.strikethroughPrice}</p>` : '';
            const productUrl = pc.productUrl;
            const detailsHTML = Object.entries(pc.details).map(([key, value]) => `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`).join('');
            
            const priceHTML = currentView === 'RTS' 
                ? `<p class="price">${pc.price.replace('Starting From ', '')}</p>` 
                : `<p class="price">${pc.price}</p>`;

            const buttonHTML = currentView === 'RTS'
                ? `<a href="${productUrl}" target="_blank" class="buy-now-button-desktop">Buy Now</a>`
                : `<a href="${productUrl}" target="_blank" class="buy-now-button-desktop">Customise Now</a>`;

            card.innerHTML = `
                <a href="${productUrl}" target="_blank" class="result-image-link"><img src="${pc.imageUrl}" alt="${pc.name}" loading="lazy" decoding="async"></a>
                <div class="result-card-content">
                    ${badgeHTML}
                    <div class="title-container"><h3>${pc.name}</h3></div>
                    <div class="price-container">${priceHTML}${strikethroughHTML}</div>
                    ${buttonHTML}
                    <div class="details">${detailsHTML}</div>
                    <a href="${productUrl}" target="_blank" class="view-product-button">View Product</a>
                </div>`;
            resultsGrid.appendChild(card);
        }
    }

    function displayMobileSingleView(recs) {
        const mobileResultsContainer = document.getElementById('mobile-results-container');
        mobileResultsContainer.innerHTML = `
            <div class="mobile-results-card">
                <img src="" id="mobile-product-image" alt="Recommended PC" class="hero-image">
                <div class="product-info">
                    <div id="mobile-recommendation-badge" class="recommendation-badge"></div>
                    <h2 id="mobile-product-title"></h2>
                    <div class="price-container">
                        <p id="mobile-price-tag"></p>
                        <p class="monthly-price">or from $XX/mo</p>
                    </div>
                </div>
                <div id="mobile-recommendation-pills"></div>
                <div id="mobile-pagination-dots"></div>
                <div class="highlight-specs">
                    </div>
                <div class="full-specs">
                    <div class="specs-toggle">Full Specifications <i class="fas fa-chevron-down"></i></div>
                    <div id="mobile-product-specs" class="mobile-specs-block" style="display: none;"></div>
                </div>
                <div class="trust-microcopy">
                    </div>
            </div>
            <div class="sticky-buy-bar">
                <a href="#" id="mobile-buy-button" class="buy-button" target="_blank">Buy Now</a>
            </div>
        `;

        const pillsContainer = document.getElementById('mobile-recommendation-pills');
        const dotsContainer = document.getElementById('mobile-pagination-dots');
        const productView = document.querySelector('.mobile-product-view');
        pillsContainer.innerHTML = '';
        dotsContainer.innerHTML = '';

        const order = ['Best Value', 'Our Recommendation', 'Level Up'];
        const sortedPcs = [...recs].sort((a, b) => order.indexOf(a.recommendationLevel) - order.indexOf(b.recommendationLevel));
        
        let currentIndex = sortedPcs.findIndex(p => p.recommendationLevel === 'Our Recommendation');
        if (currentIndex === -1) currentIndex = 0;

        sortedPcs.forEach((pc, index) => {
            const pill = document.createElement('button');
            pill.className = 'mobile-pill';
            pill.textContent = pc.recommendationLevel;
            pill.dataset.index = index;
            pillsContainer.appendChild(pill);

            const dot = document.createElement('div');
            dot.className = 'pagination-dot';
            dot.dataset.index = index;
            dotsContainer.appendChild(dot);
        });

        function updateActive(index) {
            currentIndex = parseInt(index);
            updateMobileView(sortedPcs[currentIndex]);
            pillsContainer.querySelectorAll('.mobile-pill').forEach((p, i) => p.classList.toggle('active', i === currentIndex));
            dotsContainer.querySelectorAll('.pagination-dot').forEach((d, i) => d.classList.toggle('active', i === currentIndex));
        }

        updateActive(currentIndex);

        pillsContainer.addEventListener('click', (e) => {
            if (e.target.matches('.mobile-pill')) {
                updateActive(e.target.dataset.index);
            }
        });

        dotsContainer.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-dot')) {
                updateActive(e.target.dataset.index);
            }
        });

        const mobileResultsCard = document.querySelector('.mobile-results-card');
        let touchstartX = 0;
        let touchendX = 0;
        let touchstartY = 0;
        let touchendY = 0;

        function handleSwipe(e) {
            const deltaX = touchendX - touchstartX;
            const deltaY = touchendY - touchstartY;
            const minSwipeDistance = 50;

            if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
                if (e.cancelable) {
                    e.preventDefault();
                }
                if (deltaX < 0) { // Swiped left
                    if (currentIndex < sortedPcs.length - 1) {
                        updateActive(currentIndex + 1);
                    }
                } else { // Swiped right
                    if (currentIndex > 0) {
                        updateActive(currentIndex - 1);
                    }
                }
            }
        }

        if (mobileResultsCard) {
            mobileResultsCard.addEventListener('touchstart', e => {
                touchstartX = e.changedTouches[0].screenX;
                touchstartY = e.changedTouches[0].screenY;
            }, { passive: true });

            mobileResultsCard.addEventListener('touchend', e => {
                touchendX = e.changedTouches[0].screenX;
                touchendY = e.changedTouches[0].screenY;
                handleSwipe(e);
            }, { passive: false });
        }

        const specsToggle = document.querySelector('.specs-toggle');
        const specsContent = document.getElementById('mobile-product-specs');
        specsToggle.addEventListener('click', () => {
            const isVisible = specsContent.style.display === 'block';
            specsContent.style.display = isVisible ? 'none' : 'block';
            specsToggle.querySelector('i').classList.toggle('fa-chevron-down', isVisible);
            specsToggle.querySelector('i').classList.toggle('fa-chevron-up', !isVisible);
        });
    }

    function updateMobileView(pc) {
        if (!pc) return;
        const productUrl = pc.productUrl;
        document.getElementById('mobile-product-title').textContent = pc.name;
        document.getElementById('mobile-recommendation-badge').textContent = pc.recommendationLevel;

        const priceTag = document.getElementById('mobile-price-tag');
        const priceText = currentView === 'RTS' ? pc.price.replace('Starting From ', '') : pc.price;
        priceTag.innerHTML = pc.strikethroughPrice
            ? `${priceText} <span class="strikethrough-price">${pc.strikethroughPrice}</span>`
            : `${priceText}`;

        const buyButton = document.getElementById('mobile-buy-button');
        buyButton.href = productUrl;
        buyButton.textContent = currentView === 'RTS' ? 'Buy Now' : 'Customise Now';

        const mobileImg = document.getElementById('mobile-product-image');
        mobileImg.src = pc.imageUrl;

        const highlightSpecsContainer = document.querySelector('.highlight-specs');
        highlightSpecsContainer.innerHTML = ''; // Clear previous specs

        const specString = pc.details.KeySpecs;
        if (specString && typeof specString === 'string') {
            highlightSpecsContainer.innerHTML = `<p>${specString}</p>`;
        }
        
        const specsContainer = document.getElementById('mobile-product-specs');
        specsContainer.innerHTML = Object.entries(pc.details).map(([key, value]) =>
            `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`
        ).join('');

        const trustMicrocopyContainer = document.querySelector('.trust-microcopy');
        trustMicrocopyContainer.innerHTML = `
            <div class="trust-item">
                <i class="fas fa-truck"></i>
                <span>NEXT DAY DISPATCH AVAILABLE</span>
            </div>
            <div class="trust-item">
                <i class="fas fa-award"></i>
                <span>AWARD-WINNING CUSTOM PC COMPANY</span>
            </div>
            <div class="trust-item">
                <i class="fas fa-microchip"></i>
                <span>FULL TRANSPARENCY ON PC COMPONENTS</span>
            </div>
            <div class="trust-item">
                <i class="fas fa-headset"></i>
                <span>UNMATCHED SERVICE AND SUPPORT</span>
            </div>
            <div class="trust-item">
                <i class="fas fa-shield-alt"></i>
                <span>3 YEAR DESKTOP WARRANTY AND LIFETIME SUPPORT</span>
            </div>
        `;
    }

    rtsBtn.addEventListener('click', () => {
        if (currentView === 'RTS') return;
        currentView = 'RTS';
        rtsBtn.classList.add('active');
        customBtn.classList.remove('active');
        displayResults();
    });

    customBtn.addEventListener('click', () => {
        if (currentView === 'Custom') return;
        currentView = 'Custom';
        customBtn.classList.add('active');
        rtsBtn.classList.remove('active');
        displayResults();
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (Object.keys(allRecommendations).length > 0) {
                displayResults();
            }
        }, 250);
    });

    allSteps.forEach((step, index) => {
        if (index > 0) step.style.display = 'none';
    });
    determineStepOrder();
    updateButtons();
    document.querySelector('.results-toggle-buttons').style.display = 'none';

    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userEmail = emailInput.value;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
            alert('Please enter a valid email address.');
            return;
        }

        const sanitizedEmail = userEmail.replace(/[<>]/g, '');

        const params = new URLSearchParams({
            email: sanitizedEmail,
            answers: JSON.stringify(answers)
        });

        const urlWithParams = `${emailWebhookUrl}?${params.toString()}`;

        fetch(urlWithParams, {
            method: 'GET',
            mode: 'no-cors',
        })
        .then(() => {
            emailSuccessMessage.style.display = 'block';
            emailForm.style.display = 'none';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('There was a network issue submitting your email. Please try again.');
        });
    });
});
