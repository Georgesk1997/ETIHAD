// ==================== SYSTEM CONFIGURATION ====================
const SYSTEM_PASSWORD = "etihad2026";  // CHANGE THIS TO YOUR PASSWORD

// Category Configuration - Matches YOUR EXACT folder structure
const CATEGORY_CONFIG = {
    "Flight Plan": {
        icon: "fa-route",
        color: "#0056a6"
    },
    "IFR Comms": {
        icon: "fa-headset",
        color: "#28a745"
    },
    "Mass And Balance": {
        icon: "fa-weight-scale",
        color: "#dc3545"
    },
    "OPS": {
        icon: "fa-clipboard-check",
        color: "#6f42c1"
    },
    "Performance": {
        icon: "fa-chart-line",
        color: "#fd7e14"
    },
    "RNAV": {
        icon: "fa-satellite-dish",
        color: "#17a2b8"
    },
    "VFR Comms": {
        icon: "fa-tower-broadcast",
        color: "#20c997"
    }
};

// Application State
let allQuestions = [];
let currentCategory = "";
let categoryQuestions = [];
let currentQuestionIndex = 0;
let userScore = { correct: 0, attempted: 0 };
// Store shuffled state for each question
let questionShuffledState = new Map();

// ==================== ACCESS CONTROL ====================
function verifyAccess() {
    const password = document.getElementById('passwordField').value;
    const errorDiv = document.getElementById('loginError');
    
    if (password === SYSTEM_PASSWORD) {
        localStorage.setItem('aviation_access', 'granted');
        showMainApplication();
    } else {
        errorDiv.style.display = 'block';
        document.getElementById('passwordField').classList.add('is-invalid');
        setTimeout(() => {
            errorDiv.style.display = 'none';
            document.getElementById('passwordField').classList.remove('is-invalid');
        }, 2000);
    }
}

function exitSystem() {
    localStorage.removeItem('aviation_access');
    location.reload();
}

function showMainApplication() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    initializeSystem();
}

// Check for existing access
window.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('aviation_access') === 'granted') {
        showMainApplication();
    }
});

// ==================== SYSTEM INITIALIZATION ====================
async function initializeSystem() {
    console.log("Initializing system...");
    try {
        const response = await fetch('questions.csv');
        if (response.ok) {
            const csvData = await response.text();
            console.log("CSV loaded successfully");
            allQuestions = processCSV(csvData);
            console.log(`Processed ${allQuestions.length} questions`);
            updateQuestionCount();
            displayCategories();
        } else {
            console.log("CSV not found, loading sample data");
            loadSampleData();
        }
    } catch (error) {
        console.error("Error loading CSV:", error);
        console.log("Loading sample data as fallback");
        loadSampleData();
    }
}

function processCSV(csvText) {
    console.log("Processing CSV data...");
    const questions = [];
    const rows = csvText.split('\n');
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row || row === '') continue;
        
        try {
            // Simple CSV parsing - split by comma but handle quotes
            const columns = [];
            let current = '';
            let inQuotes = false;
            
            for (let char of row) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    columns.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            columns.push(current);
            
            // We need at least 7 columns (category, question, 4 answers, correct)
            if (columns.length >= 7) {
                // Parse correct answer (1-4 to 0-3)
                let correctIndex = parseInt(columns[6].trim()) - 1;
                if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
                    console.warn(`Invalid correct answer on line ${i}: ${columns[6]}`);
                    correctIndex = 0;
                }
                
                // Clean up image path
                let imagePath = '';
                if (columns.length > 7 && columns[7]) {
                    imagePath = columns[7].trim();
                    if (imagePath) {
                        // Ensure proper path format
                        if (!imagePath.startsWith('/')) {
                            imagePath = '/' + imagePath;
                        }
                    }
                }
                
                // Get explanation if exists
                let explanation = '';
                if (columns.length > 8 && columns[8]) {
                    explanation = columns[8].trim();
                }
                
                const question = {
                    id: `q${i}`, // Unique ID for each question
                    category: columns[0].trim(),
                    text: columns[1].trim(),
                    originalOptions: [
                        columns[2].trim(),
                        columns[3].trim(),
                        columns[4].trim(),
                        columns[5].trim()
                    ],
                    originalCorrect: correctIndex,
                    image: imagePath,
                    explanation: explanation,
                    // These will be updated when answers are shuffled
                    currentOptions: null,
                    currentCorrect: null
                };
                
                // Initialize with original order
                question.currentOptions = [...question.originalOptions];
                question.currentCorrect = question.originalCorrect;
                
                // Validate required fields
                if (question.text && question.originalOptions[0] && 
                    !isNaN(question.originalCorrect)) {
                    questions.push(question);
                } else {
                    console.warn(`Skipping invalid question on line ${i}`);
                }
            }
        } catch (e) {
            console.warn(`Error parsing line ${i}:`, e);
        }
    }
    
    console.log(`Successfully parsed ${questions.length} questions`);
    return questions;
}

function loadSampleData() {
    console.log("Loading sample questions...");
    allQuestions = [
        {
            id: "q1",
            category: "Flight Plan",
            text: "What does this flight planning chart show?",
            originalOptions: ["Standard instrument departure", "Enroute navigation chart", "Standard terminal arrival", "Weather minimums chart"],
            originalCorrect: 0,
            image: "/images/Flight Plan/site-1.jpg",
            explanation: "This is a Standard Instrument Departure (SID) chart.",
            currentOptions: null,
            currentCorrect: null
        },
        {
            id: "q2",
            category: "Flight Plan",
            text: "What is the minimum fuel required for an IFR flight?",
            originalOptions: ["Fuel to destination only", "Fuel to destination plus 30 minutes", "Fuel to alternate plus 30 minutes", "Fuel to destination plus alternate plus 45 minutes"],
            originalCorrect: 3,
            image: "",
            explanation: "FAR 91.167 requires fuel to destination, then to alternate, plus 45 minutes reserve.",
            currentOptions: null,
            currentCorrect: null
        },
        {
            id: "q3",
            category: "IFR Comms",
            text: "What phrase should be used to acknowledge an altitude assignment?",
            originalOptions: ["Roger, climbing", "Climbing to assigned altitude", "Cessna 123AB climbing to 5000", "Wilco, climbing"],
            originalCorrect: 2,
            image: "",
            explanation: "Always include aircraft identification when acknowledging assignments.",
            currentOptions: null,
            currentCorrect: null
        }
    ];
    
    // Initialize current options
    allQuestions.forEach(q => {
        q.currentOptions = [...q.originalOptions];
        q.currentCorrect = q.originalCorrect;
    });
    
    console.log(`Loaded ${allQuestions.length} sample questions`);
    updateQuestionCount();
    displayCategories();
}

// ==================== CATEGORY MANAGEMENT ====================
function displayCategories() {
    const container = document.getElementById('categoryGrid');
    container.innerHTML = '';
    
    // Count questions per category
    const categoryStats = {};
    allQuestions.forEach(q => {
        categoryStats[q.category] = (categoryStats[q.category] || 0) + 1;
    });
    
    console.log("Category stats:", categoryStats);
    
    // Create category cards
    Object.keys(CATEGORY_CONFIG).forEach(categoryName => {
        const config = CATEGORY_CONFIG[categoryName];
        const questionCount = categoryStats[categoryName] || 0;
        
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-icon" style="background: ${config.color};">
                <i class="fas ${config.icon}"></i>
            </div>
            <h5 class="fw-bold mb-2">${categoryName}</h5>
            <div class="mb-2">${questionCount} questions</div>
            <small class="text-muted">Click to start</small>
        `;
        
        card.onclick = () => startCategory(categoryName);
        container.appendChild(card);
    });
    
    // Update category count
    const categoryCount = Object.keys(CATEGORY_CONFIG).length;
    document.getElementById('categoryCount').textContent = categoryCount;
    console.log(`Displayed ${categoryCount} categories`);
}

// ==================== QUIZ FUNCTIONS ====================
function startCategory(categoryName) {
    console.log(`Starting category: ${categoryName}`);
    
    currentCategory = categoryName;
    categoryQuestions = allQuestions.filter(q => q.category === categoryName);
    currentQuestionIndex = 0;
    userScore = { correct: 0, attempted: 0 };
    questionShuffledState.clear();
    
    console.log(`Found ${categoryQuestions.length} questions for ${categoryName}`);
    
    // Shuffle questions AND shuffle answers for each question
    shuffleQuestionsAndAnswers();
    
    // Update UI
    document.getElementById('categorySection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('categoryNameDisplay').textContent = categoryName;
    
    // Load first question
    displayQuestion();
    updateProgress();
    updateScoreDisplay();
    
    showMessage(`Starting ${categoryName} - ${categoryQuestions.length} questions`, 'info');
}

function shuffleQuestionsAndAnswers() {
    if (!categoryQuestions.length) return;
    
    // 1. Shuffle the order of questions
    shuffleArray(categoryQuestions);
    
    // 2. Shuffle answers for EACH question independently
    categoryQuestions.forEach((question, index) => {
        shuffleQuestionAnswers(question);
    });
    
    console.log("Shuffled questions and answers");
}

function shuffleQuestionAnswers(question) {
    if (!question) return;
    
    // Save the correct answer text
    const correctAnswerText = question.originalOptions[question.originalCorrect];
    
    // Shuffle the original options
    const shuffledOptions = [...question.originalOptions];
    shuffleArray(shuffledOptions);
    
    // Find the new position of the correct answer
    const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);
    
    // Update question with shuffled state
    question.currentOptions = shuffledOptions;
    question.currentCorrect = newCorrectIndex;
    
    // Store in shuffled state map
    questionShuffledState.set(question.id, {
        options: [...shuffledOptions],
        correct: newCorrectIndex
    });
    
    return question;
}

function displayQuestion() {
    if (!categoryQuestions || categoryQuestions.length === 0) {
        console.error("No questions available!");
        document.getElementById('questionDisplay').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> No questions available for this category.
            </div>
        `;
        return;
    }
    
    const question = categoryQuestions[currentQuestionIndex];
    const container = document.getElementById('questionDisplay');
    
    console.log(`Displaying question ${currentQuestionIndex + 1}:`, question.text.substring(0, 50) + "...");
    console.log("Current options:", question.currentOptions);
    console.log("Correct answer index:", question.currentCorrect, "Answer:", question.currentOptions[question.currentCorrect]);
    
    let html = `
        <div class="question-box active-question">
            <h4 class="mb-3">${question.text}</h4>
    `;
    
    // Add image if available
    if (question.image && question.image.trim() !== '') {
        console.log(`Adding image: ${question.image}`);
        const encodedImage = encodeURI(question.image);
        html += `
            <div class="chart-image" onclick="viewImage('${encodedImage}')">
                <img src="${encodedImage}" alt="Aviation chart" 
                     onerror="handleImageError(this, '${encodedImage}')">
                <div class="image-label">Click to enlarge</div>
            </div>
        `;
    }
    
    // Add answer options (using CURRENT shuffled options)
    html += '<div class="mt-4">';
    question.currentOptions.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index);
        html += `
            <button class="answer-option" onclick="selectAnswer(${index})">
                <strong>${letter}.</strong> ${option}
            </button>
        `;
    });
    html += '</div></div>';
    
    container.innerHTML = html;
    
    // Update counters
    document.getElementById('questionCounter').textContent = currentQuestionIndex + 1;
    document.getElementById('totalCounter').textContent = categoryQuestions.length;
    
    // Update navigation buttons
    document.getElementById('prevButton').disabled = currentQuestionIndex === 0;
    const isLastQuestion = currentQuestionIndex === categoryQuestions.length - 1;
    const nextBtn = document.getElementById('nextButton');
    nextBtn.innerHTML = isLastQuestion 
        ? 'Finish <i class="fas fa-flag-checkered"></i>' 
        : 'Next <i class="fas fa-arrow-right"></i>';
    
    // Reset answer buttons
    resetAnswerButtons();
}

function handleImageError(img, imageUrl) {
    console.error(`Failed to load image: ${decodeURI(imageUrl)}`);
    img.src = 'https://via.placeholder.com/600x300/e0e7ff/0056a6?text=Chart+Not+Found';
    img.style.border = '2px dashed #0056a6';
    img.alt = 'Image not available';
    img.parentElement.querySelector('.image-label').innerHTML = 
        '<i class="fas fa-exclamation-triangle me-1"></i> Image not available';
}

function selectAnswer(selectedIndex) {
    const question = categoryQuestions[currentQuestionIndex];
    const buttons = document.querySelectorAll('.answer-option');
    
    console.log(`Selected answer ${selectedIndex}, correct is ${question.currentCorrect}`);
    console.log("Selected text:", question.currentOptions[selectedIndex]);
    console.log("Correct text:", question.currentOptions[question.currentCorrect]);
    
    // Disable all buttons
    buttons.forEach(btn => btn.disabled = true);
    
    // Mark correct and incorrect answers
    buttons.forEach((btn, index) => {
        if (index === question.currentCorrect) {
            btn.classList.add('answer-correct');
        }
        if (index === selectedIndex && index !== question.currentCorrect) {
            btn.classList.add('answer-incorrect');
        }
    });
    
    // Update score
    userScore.attempted++;
    if (selectedIndex === question.currentCorrect) {
        userScore.correct++;
        showMessage("Correct! ✓", "success");
    } else {
        showMessage("Incorrect ✗", "error");
    }
    
    updateScoreDisplay();
    updateStatistics();
    updateProgress();
}

function resetAnswerButtons() {
    const buttons = document.querySelectorAll('.answer-option');
    buttons.forEach(btn => {
        btn.classList.remove('answer-correct', 'answer-incorrect');
        btn.disabled = false;
    });
}

function nextQuestion() {
    if (currentQuestionIndex < categoryQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
        updateProgress();
    } else {
        showMessage("Category completed! Review your statistics.", "success");
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
        updateProgress();
    }
}

function backToCategories() {
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('categorySection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
    showMessage("Returned to category selection", "info");
}

// ==================== SHUFFLING FUNCTIONS ====================
function randomizeQuestions() {
    if (!categoryQuestions.length) return;
    
    // Shuffle questions AND reshuffle all answers
    shuffleQuestionsAndAnswers();
    currentQuestionIndex = 0;
    displayQuestion();
    showMessage("Questions and answers shuffled!", "info");
}

function randomizeAnswers() {
    if (!categoryQuestions.length) return;
    
    const question = categoryQuestions[currentQuestionIndex];
    
    // Reshuffle answers for this specific question
    shuffleQuestionAnswers(question);
    
    // Redisplay
    displayQuestion();
    showMessage("Answers shuffled for this question", "info");
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==================== IMAGE FUNCTIONS ====================
function viewImage(imageUrl) {
    const modal = new bootstrap.Modal(document.getElementById('imageViewer'));
    // Decode URL for display
    document.getElementById('enlargedImage').src = decodeURI(imageUrl);
    document.getElementById('enlargedImage').onerror = function() {
        this.src = 'https://via.placeholder.com/800x600/e0e7ff/0056a6?text=Image+Not+Available';
        this.alt = 'Image failed to load';
    };
    modal.show();
}

// ==================== UI UPDATES ====================
function updateProgress() {
    if (!categoryQuestions.length) return;
    
    const progress = ((currentQuestionIndex + 1) / categoryQuestions.length) * 100;
    document.getElementById('progressIndicator').style.width = `${progress}%`;
}

function updateScoreDisplay() {
    document.getElementById('scoreValue').textContent = 
        `${userScore.correct}/${userScore.attempted}`;
}

function updateStatistics() {
    document.getElementById('correctAnswers').textContent = userScore.correct;
    document.getElementById('incorrectAnswers').textContent = userScore.attempted - userScore.correct;
    document.getElementById('totalAnswered').textContent = userScore.attempted;
    
    const accuracy = userScore.attempted > 0 
        ? Math.round((userScore.correct / userScore.attempted) * 100) 
        : 0;
    document.getElementById('accuracyRate').textContent = `${accuracy}%`;
    
    if (userScore.attempted > 0) {
        document.getElementById('statsSection').style.display = 'block';
    }
}

function updateQuestionCount() {
    const totalQuestions = allQuestions.length;
    document.getElementById('questionCount').textContent = totalQuestions;
    console.log(`Total questions: ${totalQuestions}`);
}

// ==================== MESSAGING ====================
function showMessage(text, type = 'info') {
    // Remove existing messages
    const existing = document.querySelector('.system-message');
    if (existing) existing.remove();
    
    // Create message
    const message = document.createElement('div');
    message.className = 'system-message';
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : 
                     type === 'error' ? '#dc3545' : 
                     '#0056a6'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s;
        max-width: 300px;
    `;
    
    const icon = type === 'success' ? 'fa-check' : 
                 type === 'error' ? 'fa-times' : 'fa-info';
    message.innerHTML = `<i class="fas ${icon} me-2"></i>${text}`;
    
    document.body.appendChild(message);
    
    // Auto-remove
    setTimeout(() => {
        message.style.animation = 'slideOut 0.3s';
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 300);
    }, 3000);
}

// Add animation styles
if (!document.querySelector('#animations')) {
    const style = document.createElement('style');
    style.id = 'animations';
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
}

// Debug function - can be called from browser console
window.debugInfo = function() {
    console.log('=== DEBUG INFORMATION ===');
    console.log('Total questions:', allQuestions.length);
    console.log('Current category:', currentCategory);
    console.log('Category questions:', categoryQuestions.length);
    console.log('Current question index:', currentQuestionIndex);
    
    if (categoryQuestions.length > 0 && currentQuestionIndex < categoryQuestions.length) {
        const currentQ = categoryQuestions[currentQuestionIndex];
        console.log('Current question:', currentQ.text);
        console.log('Original options:', currentQ.originalOptions);
        console.log('Original correct index:', currentQ.originalCorrect, 'Answer:', currentQ.originalOptions[currentQ.originalCorrect]);
        console.log('Current options:', currentQ.currentOptions);
        console.log('Current correct index:', currentQ.currentCorrect, 'Answer:', currentQ.currentOptions[currentQ.currentCorrect]);
    }
    
    // Show in alert
    const categories = {};
    allQuestions.forEach(q => {
        categories[q.category] = (categories[q.category] || 0) + 1;
    });
    const message = `Loaded ${allQuestions.length} questions\n\n` +
                   Object.keys(categories).map(cat => `${cat}: ${categories[cat]} questions`).join('\n');
    alert(message);
};
