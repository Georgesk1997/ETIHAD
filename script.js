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
    try {
        const response = await fetch('questions.csv');
        if (response.ok) {
            const csvData = await response.text();
            allQuestions = processCSV(csvData);
            updateQuestionCount();
            displayCategories();
        } else {
            loadSampleData();
        }
    } catch (error) {
        console.log("Loading sample data...");
        loadSampleData();
    }
}

function processCSV(csvText) {
    const questions = [];
    const rows = csvText.split('\n');
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;
        
        try {
            const columns = parseCSVRow(row);
            if (columns.length >= 7) {
                // Clean up image path - handle spaces
                let imagePath = columns[7] ? columns[7].trim() : "";
                if (imagePath) {
                    // Encode spaces for URL
                    imagePath = encodeURI(imagePath);
                }
                
                const question = {
                    category: columns[0].trim(),
                    text: columns[1].trim(),
                    options: [
                        columns[2].trim(),
                        columns[3].trim(),
                        columns[4].trim(),
                        columns[5].trim()
                    ],
                    correct: parseInt(columns[6]) - 1,
                    image: imagePath,
                    explanation: columns[8] ? columns[8].trim() : ""
                };
                
                // Validate question
                if (question.text && question.options[0] && 
                    !isNaN(question.correct) && question.correct >= 0 && question.correct <= 3) {
                    questions.push(question);
                }
            }
        } catch (e) {
            console.warn("Skipping invalid row:", row);
        }
    }
    
    return questions;
}

function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if ((char === '"' || char === "'") && (row[i-1] !== '\\')) {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuotes = false;
            } else {
                current += char;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last column
    result.push(current);
    
    // Clean up quotes
    return result.map(col => {
        col = col.trim();
        // Remove surrounding quotes
        if ((col.startsWith('"') && col.endsWith('"')) || 
            (col.startsWith("'") && col.endsWith("'"))) {
            col = col.substring(1, col.length - 1);
        }
        // Unescape double quotes
        col = col.replace(/""/g, '"');
        return col;
    });
}
function loadSampleData() {
    allQuestions = [
        {
            category: "Flight Plan",
            text: "Minimum IFR fuel includes:",
            options: ["Destination only", "Destination + 30min", "Destination + Alternate + 45min", "At pilot's discretion"],
            correct: 2,
            image: encodeURI("/images/Flight Plan/fuel-sample.png"),
            explanation: "FAR 91.167 requires fuel to destination, then alternate, plus 45 minutes reserve."
        },
        {
            category: "IFR Comms",
            text: "Read back is required for:",
            options: ["All transmissions", "Only clearances", "Altitude assignments", "Weather reports"],
            correct: 2,
            image: encodeURI("/images/IFR Comms/comms-sample.png"),
            explanation: "Always read back altitude assignments and runway assignments."
        }
    ];
    
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
    document.getElementById('categoryCount').textContent = Object.keys(CATEGORY_CONFIG).length;
}

// ==================== QUIZ FUNCTIONS ====================
function startCategory(categoryName) {
    currentCategory = categoryName;
    categoryQuestions = allQuestions.filter(q => q.category === categoryName);
    currentQuestionIndex = 0;
    userScore = { correct: 0, attempted: 0 };
    
    // Update UI
    document.getElementById('categorySection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('categoryNameDisplay').textContent = categoryName;
    
    // Randomize questions
    shuffleArray(categoryQuestions);
    
    // Load first question
    displayQuestion();
    updateProgress();
    updateScoreDisplay();
    
    showMessage(`Starting ${categoryName} training`, 'info');
}

function displayQuestion() {
    if (!categoryQuestions.length) return;
    
    const question = categoryQuestions[currentQuestionIndex];
    const container = document.getElementById('questionDisplay');
    
    let html = `
        <div class="question-box active-question">
            <h4 class="mb-3">${question.text}</h4>
    `;
    
    // Add image if available
    if (question.image) {
        // Decode for display but keep encoded for onclick
        const displayImage = decodeURI(question.image);
        html += `
            <div class="chart-image" onclick="viewImage('${question.image}')">
                <img src="${displayImage}" alt="Aviation chart" 
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/600x300/e0e7ff/0056a6?text=Chart+Not+Found'">
                <div class="image-label">Click to enlarge</div>
            </div>
        `;
    }
    
    // Add answer options
    html += '<div class="mt-4">';
    question.options.forEach((option, index) => {
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
    document.getElementById('nextButton').textContent = 
        currentQuestionIndex === categoryQuestions.length - 1 ? 'Finish' : 'Next';
}

function selectAnswer(selectedIndex) {
    const question = categoryQuestions[currentQuestionIndex];
    const buttons = document.querySelectorAll('.answer-option');
    
    // Disable all buttons
    buttons.forEach(btn => btn.disabled = true);
    
    // Mark correct and incorrect answers
    buttons.forEach((btn, index) => {
        if (index === question.correct) {
            btn.classList.add('answer-correct');
        }
        if (index === selectedIndex && index !== question.correct) {
            btn.classList.add('answer-incorrect');
        }
    });
    
    // Update score
    userScore.attempted++;
    if (selectedIndex === question.correct) {
        userScore.correct++;
        showMessage("Correct! ✓", "success");
    } else {
        showMessage("Incorrect ✗", "error");
    }
    
    updateScoreDisplay();
    updateStatistics();
    updateProgress();
}

function nextQuestion() {
    if (currentQuestionIndex < categoryQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
        updateProgress();
    } else {
        showMessage("Category completed!", "success");
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
    
    shuffleArray(categoryQuestions);
    currentQuestionIndex = 0;
    displayQuestion();
    showMessage("Questions randomized", "info");
}

function randomizeAnswers() {
    if (!categoryQuestions.length) return;
    
    const question = categoryQuestions[currentQuestionIndex];
    
    // Save correct answer
    const correctAnswer = question.options[question.correct];
    
    // Shuffle all options
    const shuffled = [...question.options];
    shuffleArray(shuffled);
    
    // Update question
    question.options = shuffled;
    question.correct = shuffled.indexOf(correctAnswer);
    
    // Redisplay
    displayQuestion();
    showMessage("Answers randomized", "info");
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
    document.getElementById('questionCount').textContent = allQuestions.length;
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
        setTimeout(() => message.remove(), 300);
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
