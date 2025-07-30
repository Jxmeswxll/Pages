document.addEventListener('DOMContentLoaded', () => {
    const quizForm = document.getElementById('quiz-form');
    const resultsContainer = document.getElementById('results-container');
    const resultsDiv = document.getElementById('results');

    const questions = [
        {
            question: "What is the primary use for your new PC?",
            key: "primaryUse",
            type: "checkbox",
            options: ["Gaming", "Work", "Study", "Everyday Essentials"]
        },
        {
            question: "What type of PC are you looking for?",
            key: "pcType",
            type: "radio",
            options: ["Desktop", "Laptop"]
        },
        {
            question: "What is your budget?",
            key: "budget",
            type: "radio",
            options: ["1500-2500", "2500-3500", "3500+"]
        },
        {
            question: "What resolution do you play at?",
            key: "resolution",
            type: "radio",
            options: ["1080p", "1440p", "4K"],
            condition: (answers) => answers.primaryUse && answers.primaryUse.includes('Gaming')
        },
        {
            question: "What kind of games do you play?",
            key: "games",
            type: "checkbox",
            options: ["Esports", "AAA Story"],
            condition: (answers) => answers.primaryUse && answers.primaryUse.includes('Gaming')
        },
        {
            question: "What kind of work do you do?",
            key: "work",
            type: "checkbox",
            options: ["Creative", "3D", "Coding", "Office Docs", "Adobe", "Blender"],
            condition: (answers) => answers.primaryUse && answers.primaryUse.includes('Work')
        },
        {
            question: "What case size do you prefer?",
            key: "caseSize",
            type: "radio",
            options: ["Small", "Medium", "Large", "Not Sure"],
            condition: (answers) => answers.pcType === 'Desktop'
        }
    ];

    let currentQuestionIndex = 0;
    let answers = {};

    function renderQuestion() {
        const question = questions[currentQuestionIndex];
        if (!question) {
            submitQuiz();
            return;
        }

        if (question.condition && !question.condition(answers)) {
            currentQuestionIndex++;
            renderQuestion();
            return;
        }

        let optionsHtml = '';
        question.options.forEach(option => {
            optionsHtml += `
                <label>
                    <input type="${question.type}" name="${question.key}" value="${option}">
                    ${option}
                </label><br>
            `;
        });

        quizForm.innerHTML = `
            <fieldset>
                <legend>${question.question}</legend>
                ${optionsHtml}
                <button type="button" id="next-btn">Next</button>
            </fieldset>
        `;

        document.getElementById('next-btn').addEventListener('click', handleNext);
    }

    function handleNext() {
        const question = questions[currentQuestionIndex];
        const inputs = quizForm.querySelectorAll(`input[name="${question.key}"]:checked`);
        if (inputs.length > 0) {
            if (question.type === 'checkbox') {
                answers[question.key] = Array.from(inputs).map(input => input.value);
            } else {
                answers[question.key] = inputs[0].value;
            }
            currentQuestionIndex++;
            renderQuestion();
        } else {
            alert('Please select an option.');
        }
    }

    async function submitQuiz() {
        quizForm.style.display = 'none';
        resultsContainer.style.display = 'block';
        resultsDiv.innerHTML = '<p>Loading recommendations...</p>';

        try {
            const response = await fetch('https://n8n.aftershock.com.au/webhook/alpha-quiz-webhook', { // Replace with your n8n webhook URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(answers)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            renderResults(data);
        } catch (error) {
            resultsDiv.innerHTML = `<p>Error fetching recommendations: ${error.message}</p>`;
        }
    }

    function renderResults(data) {
        let html = '';
        
        html += '<h3>Ready to Ship</h3>';
        if (data.RTS && data.RTS.length > 0) {
            data.RTS.forEach(pc => {
                html += `
                    <div class="pc-recommendation">
                        <h4>${pc.name} - ${pc.recommendationLevel}</h4>
                        <img src="${pc.imageUrl}" alt="${pc.name}" width="200">
                        <p>Price: ${pc.price} ${pc.strikethroughPrice ? `<s>${pc.strikethroughPrice}</s>` : ''}</p>
                        <a href="${pc.productUrl}" target="_blank">View Product</a>
                        <ul>
                            <li><strong>Graphics:</strong> ${pc.details.graphics}</li>
                            <li><strong>Processor:</strong> ${pc.details.processor}</li>
                            <li><strong>RAM:</strong> ${pc.details.ram}</li>
                            <li><strong>Storage:</strong> ${pc.details.storage}</li>
                            <li><strong>Style:</strong> ${pc.details.style}</li>
                            <li><strong>Key Specs:</strong> ${pc.details.keySpecs}</li>
                        </ul>
                    </div>
                `;
            });
        } else {
            html += '<p>No Ready to Ship PCs match your criteria.</p>';
        }

        html += '<h3>Custom Builds</h3>';
        if (data.Custom && data.Custom.length > 0) {
            data.Custom.forEach(pc => {
                html += `
                    <div class="pc-recommendation">
                        <h4>${pc.name} - ${pc.recommendationLevel}</h4>
                        <img src="${pc.imageUrl}" alt="${pc.name}" width="200">
                        <p>Price: ${pc.price}</p>
                        <a href="${pc.productUrl}" target="_blank">View Product</a>
                        <ul>
                            <li><strong>Graphics:</strong> ${pc.details.graphics}</li>
                            <li><strong>Processor:</strong> ${pc.details.processor}</li>
                            <li><strong>RAM:</strong> ${pc.details.ram}</li>
                            <li><strong>Storage:</strong> ${pc.details.storage}</li>
                            <li><strong>Style:</strong> ${pc.details.style}</li>
                            <li><strong>Key Specs:</strong> ${pc.details.keySpecs}</li>
                        </ul>
                    </div>
                `;
            });
        } else {
            html += '<p>No Custom PCs match your criteria.</p>';
        }

        resultsDiv.innerHTML = html;
    }

    renderQuestion();
});
