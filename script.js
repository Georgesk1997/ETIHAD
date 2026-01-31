// ========== CONFIGURATION ==========
// CHANGE THIS PASSWORD to your desired password
const ACCESS_PASSWORD = "quiz2024";  // <-- CHANGE THIS!

// Your questions data (will be loaded from CSV)
let allQuestions = [];
let currentQuestions = [];
let currentCategory = "";
let currentQuestionIndex = 0;
let score = { correct: 0, total: 0 };

// ========== PASSWORD PROTECTION ==========
function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('passwordError');
    
    if (input === ACCESS_PASSWORD) {
        // Store in session (expires when browser closes)
        sessionStorage.setItem('quizAuthenticated', 'true');
        document.getElementById('passwordScreen').style.display = 'none';
        document.getElementById('quizInterface').style.display = 'block';
        loadQuestions(); // Load questions after successful login
    } else {
        errorDiv.style.display = 'block';
        document.getElementById('passwordInput').classList.add('is-invalid');
        setTimeout(() => {
            errorDiv.style.display = 'none';
            document.getElementById('passwordInput').classList.remove('is-invalid');
        }, 3000);
    }
}

function logout() {
    sessionStorage.removeItem('quizAuthenticated');
    location.reload();
}

// Check if already authenticated
window.onload = function() {
    if (sessionStorage.getItem('quizAuthenticated') === 'true') {
        document.getElementById('passwordScreen').style.display = 'none';
        document.getElementById('quizInterface').style.display = 'block';
        loadQuestions();
    }
};

// ========== QUESTION LOADING ==========
function loadQuestions() {
    // In real implementation, this would load from CSV
    // For now, using sample data
    
    allQuestions = [
        {
            category: "Math",
            question: "What is 2+2?",
            answers: ["3", "4", "5", "6"],
            correct: 1,
            explanation: "Basic addition gives 4"
        },
        {
            category: "Math",
            question: "What is 3×7?",
            answers: ["18", "21", "24", "28"],
            correct: 1,
            explanation: "3 times 7 equals 21"
        },
        {
            category: "Science",
            question: "What is H₂O?",
            answers: ["Oxygen", "Hydrogen", "Water", "Carbon Dioxide"],
            correct: 2,
            explanation: "H₂O is the chemical formula for water"
        },
        {
            category: "Science",
            question: "Which planet is known as the Red Planet?",
            answers: ["Venus", "Mars", "Jupiter", "Saturn"],
            correct: 1,
            explanation: "Mars appears red due to iron oxide on its surface"
        },
        {
            category: "History",
            question: "Who was the first president of the USA?",
            answers: ["Thomas Jefferson", "John Adams", "George Washington", "Abraham Lincoln"],
            correct: 2,
            explanation: "George Washington served from 1789 to 1797"
        }
    ];
    
    // Load categories
    loadCategories();
}

function loadCategories() {
    const categories = [...new Set(allQuestions.map(q => q.category))];
    const container = document.getElementById('categoryButtons');
    
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.innerHTML = `<i class="fas fa-folder-open"></i> ${category}`;
        button.onclick = () => selectCategory(category);
        container.appendChild(button);
    });
}

// ========== CATEGORY SELECTION ==========
function selectCategory(category) {
    currentCategory = category;
    currentQuestions = allQuestions.filter(q => q.category === category);
    currentQuestionIndex = 0;
    
    // Hide category selector, show quiz
    document.getElementById('categoryButtons').style.display = 'none';
    document.getElementById('quizArea').style.display = 'block';
    document.getElementById('currentCategory').textContent = `Category: ${category}`;
    
    // Shuffle questions initially
    shuffleArray(currentQuestions);
    loadQuestion();
    updateProgress();
    updateStatistics();
}

// ========== QUESTION DISPLAY ==========
function loadQuestion() {
    if (currentQuestions.length === 0) return;
    
    const question = currentQuestions[currentQuestionIndex];
    const container = document.getElementById('questionsContainer');
    
    // Clear previous question
    container.innerHTML = '';
    
    // Create question card
    const card = document.createElement('div');
    card.className = 'question-card active-question';
    card.innerHTML = `
        <h4>${question.question}</h4>
        <div class="answers mt-4">
            ${question.answers.map((answer, index) => `
                <button class="answer-btn" onclick="selectAnswer(${index})">
                    ${String.fromCharCode(65 + index)}) ${answer}
                </button>
            `).join('')}
        </div>
        <div id="explanation" class="explanation">
            <strong><i class="fas fa-lightbulb"></i> Explanation:</strong>
            <p class="mb-0 mt-2">${question.explanation}</p>
        </div>
    `;
    
    container.appendChild(card);
    
    // Update UI
    document.getElementById('currentQuestionNum').textContent = currentQuestionIndex + 1;
    document.getElementById('totalQuestions').textContent = currentQuestions.length;
    
    // Update navigation buttons
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    document.getElementById('nextBtn').disabled = currentQuestionIndex === currentQuestions.length - 1;
    
    // Reset answer selection
    resetAnswerButtons();
}

function selectAnswer(answerIndex) {
    const question = currentQuestions[currentQuestionIndex];
    const buttons = document.querySelectorAll('.answer-btn');
    const explanation = document.getElementById('explanation');
    
    // Mark correct/incorrect
    buttons.forEach((btn, index) => {
        if (index === question.correct) {
            btn.classList.add('correct');
        }
        if (index === answerIndex && index !== question.correct) {
            btn.classList.add('incorrect');
        }
        btn.disabled = true;
    });
    
    // Update score
    if (answerIndex === question.correct) {
        score.correct++;
        score.total++;
    } else if (answerIndex !== undefined) {
        score.total++;
    }
    
    // Show explanation
    explanation.style.display = 'block';
    
    // Update UI
    updateScoreDisplay();
    updateStatistics();
    updateProgress();
}

function resetAnswerButtons() {
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach(btn => {
        btn.classList.remove('correct', 'incorrect');
        btn.disabled = false;
    });
    document.getElementById('explanation').style.display = 'none';
}

// ========== NAVIGATION ==========
function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
        updateProgress();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
        updateProgress();
    }
}

// ========== SHUFFLING FUNCTIONS ==========
function shuffleQuestions() {
    shuffleArray(currentQuestions);
    currentQuestionIndex = 0;
    loadQuestion();
    showNotification('Questions shuffled!');
}

function shuffleAnswers() {
    const question = currentQuestions[currentQuestionIndex];
    
    // Store correct answer
    const correctAnswer = question.answers[question.correct];
    
    // Shuffle all answers
    const shuffledAnswers = [...question.answers];
    shuffleArray(shuffledAnswers);
    
    // Update question with shuffled answers and new correct index
    question.answers = shuffledAnswers;
    question.correct = shuffledAnswers.indexOf(correctAnswer);
    
    // Reload question
    loadQuestion();
    showNotification('Answers shuffled!');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ========== UI UPDATES ==========
function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
}

function updateScoreDisplay() {
    document.getElementById('scoreDisplay').textContent = `Score: ${score.correct}/${score.total}`;
}

function updateStatistics() {
    document.getElementById('correctCount').textContent = score.correct;
    document.getElementById('incorrectCount').textContent = score.total - score.correct;
    document.getElementById('answeredCount').textContent = score.total;
    
    const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    document.getElementById('percentage').textContent = `${percentage}%`;
    
    // Show statistics after first answer
    if (score.total > 0) {
        document.getElementById('statistics').style.display = 'block';
    }
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s;
    `;
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
