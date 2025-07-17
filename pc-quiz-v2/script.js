document.addEventListener('DOMContentLoaded', () => {
    const quizContent = document.getElementById('quiz-content');
    const thankYouMessage = document.getElementById('thank-you-message');
    const quiz = document.getElementById('quiz');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progress = document.getElementById('progress');
    const emailInput = document.getElementById('email-input');

    const webhookUrl = 'https://wxlls.app.n8n.cloud/webhook-test/4f551d35-2a2b-4b5b-98ae-9e351052d1e2';

    let currentStepIndex = 0;
    let stepHistory = [];
    let answers = {};
    let currentStepOrder = ['primaryUse'];

    const allSteps = Array.from(document.querySelectorAll('.step'));

    function determineStepOrder() {
        const primaryUse = answers.primaryUse || [];
        let conditionalSteps = [];
        
        if (primaryUse.includes('Gaming')) conditionalSteps.push('games', 'resolution', 'style');
        if (primaryUse.includes('Work')) conditionalSteps.push('work');
        if (primaryUse.includes('Study')) conditionalSteps.push('study');
        if (primaryUse.includes('Essentials')) conditionalSteps.push('essentials');
        
        const commonSteps = ['caseSize', 'peripherals', 'budget'];
        
        const uniqueConditionalSteps = [...new Set(conditionalSteps)];
        
        currentStepOrder = ['primaryUse', ...uniqueConditionalSteps, ...commonSteps, 'email'];
    }

    function showStep(stepId) {
        allSteps.forEach(step => {
            step.style.display = step.dataset.stepId === stepId ? 'block' : 'none';
        });
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

        let allRequiredAnswered = true;
        if (currentStepId === 'email') {
            allRequiredAnswered = emailInput.value.trim() !== '' && emailInput.checkValidity();
        } else {
            const questions = currentStepElement.querySelectorAll('.options-grid');
            questions.forEach(q => {
                const questionId = q.dataset.questionId;
                if (questionId !== 'games') {
                    if (!answers[questionId] || answers[questionId].length === 0) {
                        allRequiredAnswered = false;
                    }
                }
            });
        }

        const isLastStep = currentStepIndex === currentStepOrder.length - 1;

        nextBtn.style.display = !isLastStep ? 'inline-block' : 'none';
        submitBtn.style.display = isLastStep ? 'inline-block' : 'none';
        prevBtn.style.display = currentStepIndex > 0 ? 'inline-block' : 'none';
        
        nextBtn.disabled = !allRequiredAnswered;
        submitBtn.disabled = !allRequiredAnswered;
    }

    quiz.addEventListener('click', (e) => {
        const card = e.target.closest('.option-card');
        if (!card) return;

        const optionsGrid = card.closest('.options-grid');
        const questionId = optionsGrid.dataset.questionId;
        const selectType = optionsGrid.dataset.selectType;
        const value = card.dataset.value;

        if (!answers[questionId]) {
            answers[questionId] = [];
        }

        if (selectType === 'single-exclusive') {
            const isAlreadySelected = card.classList.contains('selected');
            const stepGrids = card.closest('.step').querySelectorAll(`.options-grid[data-question-id="${questionId}"]`);
            stepGrids.forEach(grid => {
                grid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
            });
            answers[questionId] = [];

            if (!isAlreadySelected) {
                card.classList.add('selected');
                answers[questionId].push(value);
            }
        } else {
            const exclusiveGrid = card.closest('.step').querySelector(`.options-grid[data-question-id="${questionId}"][data-select-type="single-exclusive"]`);
            if (exclusiveGrid) {
                exclusiveGrid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
            }

            if (selectType === 'single') {
                optionsGrid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                answers[questionId] = [value];
            } else { // multiple
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
        
        if (questionId === 'primaryUse') {
            determineStepOrder();
        }
        
        updateButtons();
    });
    
    emailInput.addEventListener('input', updateButtons);

    nextBtn.addEventListener('click', () => {
        if (currentStepIndex < currentStepOrder.length - 1) {
            stepHistory.push(currentStepIndex);
            currentStepIndex++;
            const nextStepId = currentStepOrder[currentStepIndex];
            showStep(nextStepId);
        }
    });

    prevBtn.addEventListener('click', () => {
        if (stepHistory.length > 0) {
            currentStepIndex = stepHistory.pop();
            const prevStepId = currentStepOrder[currentStepIndex];
            showStep(prevStepId);
        }
    });

    submitBtn.addEventListener('click', () => {
        if (emailInput.checkValidity()) {
            answers.email = emailInput.value;
            
            fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(answers),
            })
            .then(response => {
                if(response.ok) {
                    quizContent.style.display = 'none';
                    thankYouMessage.style.display = 'block';
                } else {
                    alert('Sorry, there was an error submitting your request. Please try again.');
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                alert('Sorry, there was an error submitting your request. Please try again.');
            });
        } else {
            alert('Please enter a valid email address.');
        }
    });

    // Initial setup
    determineStepOrder();
    showStep(currentStepOrder[0]);
});
