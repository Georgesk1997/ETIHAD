// ==================== CONFIGURATION ====================
const ACCESS_PASSWORD = "etihad2024";  // ← CHANGE THIS PASSWORD!

// Your categories and their icons
const CATEGORY_ICONS = {
    "Flight Plan": "fa-route",
    "IFR Comms": "fa-headset",
    "Mass And Balance": "fa-weight-hanging",
    "OPS": "fa-clipboard-check",
    "Performance": "fa-chart-line",
    "RNAV": "fa-satellite",
    "VFR Comms": "fa-tower-broadcast"
};

// Default icon for new categories (if you add more later)
const DEFAULT_ICON = "fa-folder";

// Your questions data
let allQuestions = [];
let currentQuestions = [];
let currentCategory = "";
let currentQuestionIndex = 0;
let score = { correct: 0, total: 0 };

// ==================== PASSWORD PROTECTION ====================
function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('passwordError');
    
    if (input === ACCESS_PASSWORD) {
        sessionStorage.setItem('quizAuthenticated', 'true');
        document.getElementById('passwordScreen').style.display = 'none';
        document.getElementById('quizInterface').style.display = 'block';
        loadQuestions();
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

// ==================== QUESTION LOADING ====================
async function loadQuestions() {
    try {
        console.log("Loading questions from CSV...");
        const response = await fetch('questions.csv');
        if (!response.ok) {
            throw new Error(`CSV not found: ${response.status}`);
        }
        
        const csvText = await response.text();
        allQuestions = parseCSV(csvText);
        
        console.log(`Loaded ${allQuestions.length} questions from CSV`);
        
        if (allQuestions.length === 0) {
            console.log("CSV is empty, loading sample questions...");
            loadSampleQuestions();
        } else {
            // Update total questions count in footer
            document.getElementById('totalQuestionsCount').textContent = allQuestions.length;
            loadCategories();
        }
    } catch (error) {
        console.error("Error loading CSV:", error);
        console.log("Loading sample questions as fallback...");
        loadSampleQuestions();
    }
}

function parseCSV(csvText) {
    const questions = [];
    const lines = csvText.split('\n');
    
    // Skip header line (first line)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '' || line.startsWith('//')) continue;
        
        try {
            const columns = parseCSVLine(line);
            
            // We need at least 7 columns (category, question, 4 answers, correct)
            if (columns.length >= 7) {
                // Parse correct answer (1=A, 2=B, 3=C, 4=D) → convert to 0-based
                let correctIndex = parseInt(columns[6]) - 1;
                
                // Validate correct index
                if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
                    console.warn(`Line ${i}: Invalid correct answer '${columns[6]}', defaulting to 0`);
                    correctIndex = 0;
                }
                
                // Get image URL (column 7) - optional
                let imageUrl = columns[7] ? columns[7].trim() : "";
                
                // Fix image URL if it's relative
                if (imageUrl && !imageUrl.startsWith('http') && imageUrl !== '') {
                    if (!imageUrl.startsWith('/')) {
                        imageUrl = '/' + imageUrl;
                    }
                }
                
                // Get explanation (column 8) - optional
                const explanation = columns[8] ? columns[8].trim() : "";
                
                const question = {
                    category: columns[0] ? columns[0].trim() : "General",
                    question: columns[1] ? columns[1].trim() : "",
                    answers: [
                        columns[2] ? columns[2].trim() : "",
                        columns[3] ? columns[3].trim() : "",
                        columns[4] ? columns[4].trim() : "",
                        columns[5] ? columns[5].trim() : ""
                    ],
                    correct: correctIndex,
                    imageUrl: imageUrl,
                    explanation: explanation
                };
                
                // Only add if we have a valid question
                if (question.question && question.answers[0]) {
                    questions.push(question);
                }
            }
        } catch (error) {
            console.error(`Error parsing line ${i}:`, error);
        }
    }
    
    return questions;
}

function parseCSVLine(line) {
    const columns = [];
    let current = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            columns.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last column
    columns.push(current);
    return columns;
}

// Sample questions for testing
function loadSampleQuestions() {
    console.log("Loading sample aviation questions...");
    
    allQuestions = [
        {
            category: "Flight Plan",
            question: "What is the minimum fuel required for an IFR flight?",
            answers: ["Fuel to destination", "Fuel to destination + 45 minutes", "Fuel to alternate + 45 minutes", "Fuel to destination + alternate + 45 minutes"],
            correct: 3,
            imageUrl: "",
            explanation: "FAR 91.167 requires fuel to fly to destination, then to alternate, plus 45 minutes reserve."
        },
        {
            category: "IFR Comms",
            question: "When should you read back a clearance?",
            answers: ["Only when requested", "Always for altitude assignments", "Only for route changes", "Always for all ATC instructions"],
            correct: 1,
            imageUrl: "/images/ifr-comms/clearance.png",
            explanation: "Always read back altitude assignments, headings, and runway assignments."
        },
        {
            category: "Mass And Balance",
            question: "What does the term 'arm' refer to in weight and balance?",
            answers: ["Weight of an item", "Distance from datum", "Moment divided by weight", "Center of gravity limit"],
            correct: 1,
            imageUrl: "",
            explanation: "Arm is the horizontal distance from the reference datum to the CG of an item."
        },
        {
            category: "OPS",
            question: "Minimum equipment for day VFR flight includes:",
            answers: ["Fuel gauge, oil pressure, altimeter", "Airspeed, altimeter, magnetic compass", "Tachometer, oil temp, ammeter", "All of the above"],
            correct: 3,
            imageUrl: "/images/ops/equipment.png",
            explanation: "FAR 91.205 specifies required instruments and equipment."
        },
        {
            category: "Performance",
            question: "What affects takeoff distance the most?",
            answers: ["Wind", "Temperature", "Pressure altitude", "All of the above"],
            correct: 3,
            imageUrl: "",
            explanation: "All these factors significantly impact takeoff performance."
        },
        {
            category: "RNAV",
            question: "What is RNP 0.3?",
            answers: ["RNAV approach", "Oceanic navigation", "Terminal procedure", "Enroute navigation"],
            correct: 0,
            imageUrl: "/images/rnav/approach.png",
            explanation: "RNP 0.3 is typically used for RNAV (RNP) approach procedures."
        },
        {
            category: "VFR Comms",
            question: "How do you report position in the traffic pattern?",
            answers: ["'Downwind'", "'Cessna 123AB downwind'", "'Traffic pattern downwind'", "'Position downwind'"],
            correct: 1,
            imageUrl: "",
            explanation: "Always include aircraft identification when reporting position."
        }
    ];
    
    // Update total count
    document.getElementById('totalQuestionsCount').textContent = allQuestions.length;
    loadCategories();
}

// ==================== CATEGORY MANAGEMENT ====================
function loadCategories() {
    // Get all unique categories from questions
    const categories = [...new Set(allQuestions.map(q => q.category))];
    const container = document.getElementById('categoryButtons');
    container.innerHTML = '';
    
    console.log(`Found ${categories.length} categories:`, categories);
    
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i> No categories found in questions.csv
            </div>
        `;
        return;
    }
    
    // Sort categories alphabetically
    categories.sort();
    
    // Create a button for each category
    categories.forEach(category => {
        // Count questions in this category
        const questionCount = allQuestions.filter(q => q.category === category).length;
        
        // Get icon for this category (or default)
        const icon = CATEGORY_ICONS[category] || DEFAULT_ICON;
        
        // Create button
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="category-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div>
                    <div class="fw-bold">${category}</div>
                    <small class="text-muted">${questionCount} questions</small>
                </div>
            </div>
        `;
        
        button.onclick = () => selectCategory(category);
        container.appendChild(button);
    });
}

// ==================== CATEGORY SELECTION ====================
function selectCategory(category) {
    console.log(`Selected category: ${category}`);
    
    currentCategory = category;
    
    // Filter questions for this category
    currentQuestions = allQuestions.filter(q => q.category === category);
    currentQuestionIndex = 0;
    
    // Reset score for new category
    score = { correct: 0, total: 0 };
    
    // Update UI
    document.getElementById('categorySection').style.display = 'none';
    document.getElementById('quizArea').style.display = 'block';
    document.getElementById('categoryName').textContent = category;
    document.getElementById('statistics').style.display = 'none';
    
    // Add CSS class for category-specific styling
    const categoryClass = category.toLowerCase().replace(/\s+/g, '-');
    document.getElementById('questionsContainer').className = categoryClass;
    
    // Shuffle questions initially
    shuffleArray(currentQuestions);
    
    // Load first question
    loadQuestion();
    updateProgress();
    updateStatistics();
    
    // Show notification
    showNotification(`Loaded ${currentQuestions.length} ${category} questions`, 'info');
}

// ==================== QUESTION DISPLAY ====================
function loadQuestion() {
    if (!currentQuestions || currentQuestions.length === 0) {
        document.getElementById('questionsContainer').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> No questions available for this category.
            </div>
        `;
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    const container = document.getElementById('questionsContainer');
    
    // Clear previous question
    container.innerHTML = '';
    
    const card = document.createElement('div');
    card.className = 'question-card active-question';
    
    // Build question HTML
    let questionHTML = `
        <h4 class="mb-3">
            <i class="fas fa-question-circle me-2" style="color: var(--primary-color);"></i>
            ${question.question}
        </h4>
    `;
    
    // Add image if exists
    if (question.imageUrl && question.imageUrl.trim() !== '') {
        questionHTML += `
            <div class="question-image" onclick="zoomImage('${question.imageUrl}')">
                <div class="image-badge">
                    <i class="fas fa-image me-1"></i> Chart
                </div>
                <img src="${question.imageUrl}" 
                     alt="Aviation chart or diagram" 
                     class="img-fluid"
                     onerror="handleImageError(this)">
                <div class="zoom-hint">
                    <i class="fas fa-search-plus me-1"></i> Click to enlarge image
                </div>
            </div>
        `;
    }
    
    // Add answers
    questionHTML += `
        <div class="answers mt-4">
            ${question.answers.map((answer, index) => `
                <button class="answer-btn" onclick="selectAnswer(${index})">
                    <span class="fw-bold me-2" style="color: var(--primary-color);">
                        ${String.fromCharCode(65 + index)})
                    </span>
                    <span>${answer}</span>
                </button>
            `).join('')}
        </div>
    `;
    
    card.innerHTML = questionHTML;
    container.appendChild(card);
    
    // Update navigation counters
    document.getElementById('currentQuestionNum').textContent = currentQuestionIndex + 1;
    document.getElementById('totalQuestions').textContent = currentQuestions.length;
    
    // Update navigation buttons
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    
    const isLastQuestion = currentQuestionIndex === currentQuestions.length - 1;
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.innerHTML = isLastQuestion 
        ? 'Finish Category <i class="fas fa-flag-checkered"></i>' 
        : 'Next <i class="fas fa-arrow-right"></i>';
    
    // Reset answer buttons
    resetAnswerButtons();
}

function handleImageError(img) {
    img.src = 'https://via.placeholder.com/600x300/e0e7ff/0056a6?text=Chart+Not+Available';
    img.style.border = '2px dashed #0056a6';
    img.parentElement.querySelector('.zoom-hint').innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> Image not available';
}

// ==================== ANSWER SELECTION ====================
function selectAnswer(answerIndex) {
    const question = currentQuestions[currentQuestionIndex];
    const buttons = document.querySelectorAll('.answer-btn');
    
    // Disable all buttons to prevent multiple clicks
    buttons.forEach(btn => btn.disabled = true);
    
    // Mark correct and incorrect answers
    buttons.forEach((btn, index) => {
        if (index === question.correct) {
            btn.classList.add('correct');
        }
        if (index === answerIndex && index !== question.correct) {
            btn.classList.add('incorrect');
        }
    });
    
    // Update score
    if (answerIndex === question.correct) {
        score.correct++;
        score.total++;
        showNotification('Correct! ✓', 'success');
    } else if (answerIndex !== undefined) {
        score.total++;
        showNotification('Incorrect ✗', 'error');
    }
    
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
}

// ==================== NAVIGATION ====================
function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
        updateProgress();
    } else {
        showNotification('Category completed! Review your performance statistics.', 'success');
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
        updateProgress();
    }
}

// ==================== SHUFFLING FUNCTIONS ====================
function shuffleQuestions() {
    if (currentQuestions.length === 0) return;
    
    shuffleArray(currentQuestions);
    currentQuestionIndex = 0;
    loadQuestion();
    showNotification('Questions shuffled!', 'info');
}

function shuffleAnswers() {
    const question = currentQuestions[currentQuestionIndex];
    
    // Store the correct answer text
    const correctAnswer = question.answers[question.correct];
    
    // Shuffle all answers
    const shuffledAnswers = [...question.answers];
    shuffleArray(shuffledAnswers);
    
    // Update question with shuffled answers
    question.answers = shuffledAnswers;
    
    // Find new position of correct answer
    question.correct = shuffledAnswers.indexOf(correctAnswer);
    
    // Reload the question
    loadQuestion();
    showNotification('Answers shuffled!', 'info');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==================== IMAGE FUNCTIONS ====================
function zoomImage(imageUrl) {
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    const modalImage = document.getElementById('modalImage');
    
    modalImage.src = imageUrl;
    modalImage.alt = "Aviation chart - enlarged view";
    
    modal.show();
}

// ==================== UI UPDATES ====================
function updateProgress() {
    if (currentQuestions.length === 0) return;
    
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
}

function updateScoreDisplay() {
    document.getElementById('scoreValue').textContent = `${score.correct}/${score.total}`;
}

function updateStatistics() {
    document.getElementById('correctCount').textContent = score.correct;
    document.getElementById('incorrectCount').textContent = score.total - score.correct;
    document.getElementById('answeredCount').textContent = score.total;
    
    const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    document.getElementById('percentage').textContent = `${percentage}%`;
    
    if (score.total > 0) {
        document.getElementById('statistics').style.display = 'block';
    }
}

// ==================== NOTIFICATION SYSTEM ====================
function showNotification(message, type = 'info') {
    const colors = {
        'success': '#28a745',
        'error': '#dc3545',
        'info': '#0056a6',
        'warning': '#ff9900'
    };
    
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-times-circle',
        'info': 'fa-info-circle',
        'warning': 'fa-exclamation-circle'
    };
    
    const color = colors[type] || colors['info'];
    const icon = icons[type] || icons['info'];
    
    // Remove existing notifications
    document.querySelectorAll('.custom-notification').forEach(el => el.remove());
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
        font-weight: 500;
        display: flex;
        align-items: center;
    `;
    
    notification.innerHTML = `
        <i class="fas ${icon} me-3" style="font-size: 20px;"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations to page
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ==================== BACK TO CATEGORIES ====================
function backToCategories() {
    document.getElementById('quizArea').style.display = 'none';
    document.getElementById('categorySection').style.display = 'block';
    document.getElementById('statistics').style.display = 'none';
    
    // Reset current category data
    currentQuestions = [];
    currentQuestionIndex = 0;
    score = { correct: 0, total: 0 };
    
    showNotification('Returned to category selection', 'info');
}

// Add this button to your quiz area if needed
// <button onclick="backToCategories()" class="btn btn-outline-secondary">
//     <i class="fas fa-arrow-left"></i> Back to Categories
// </button>
