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

// ========== QUESTION LOADING FROM CSV ==========
async function loadQuestions() {
    try {
        console.log("Loading questions from CSV file...");
        
        // Load the CSV file
        const response = await fetch('questions.csv');
        if (!response.ok) {
            throw new Error(`Failed to load CSV: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log("CSV loaded successfully, parsing...");
        
        // Parse CSV to questions
        allQuestions = parseCSV(csvText);
        
        console.log(`Successfully loaded ${allQuestions.length} questions from CSV`);
        
        if (allQuestions.length === 0) {
            console.log("No questions loaded from CSV, using sample data");
            loadSampleQuestions();
        } else {
            // Load categories from CSV data
            loadCategories();
        }
    } catch (error) {
        console.error("Error loading CSV:", error);
        console.log("Using sample questions as fallback");
        // Fallback to sample questions
        loadSampleQuestions();
    }
}

// Function to parse CSV text
function parseCSV(csvText) {
    const questions = [];
    const lines = csvText.split('\n');
    
    console.log(`CSV has ${lines.length} lines`);
    
    // Skip header line (first line)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '' || line.startsWith('#') || line.startsWith('//')) {
            continue; // Skip empty lines and comments
        }
        
        try {
            // Parse the CSV line
            const columns = parseCSVLine(line);
            
            if (columns.length >= 7) {
                // Get correct answer index (1-based in CSV: 1=A, 2=B, 3=C, 4=D)
                // Convert to 0-based for JavaScript (0=A, 1=B, 2=C, 3=D)
                let correctIndex = parseInt(columns[5]) - 1;
                
                // If parsing failed or out of range, default to 0
                if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
                    console.warn(`Invalid correct answer for line ${i}: ${columns[5]}, defaulting to 0`);
                    correctIndex = 0;
                }
                
                // Create question object
                const question = {
                    category: columns[0] ? columns[0].trim() : "Uncategorized",
                    question: columns[1] ? columns[1].trim() : "",
                    answers: [
                        columns[2] ? columns[2].trim() : "",
                        columns[3] ? columns[3].trim() : "",
                        columns[4] ? columns[4].trim() : "",
                        columns[5] ? columns[5].trim() : ""
                    ],
                    correct: correctIndex,
                    explanation: columns[7] ? columns[7].trim() : "No explanation provided"
                };
                
                // Validate the question has all required fields
                if (question.question && question.answers[0] && question.answers[1]) {
                    questions.push(question);
                } else {
                    console.warn(`Skipping invalid question at line ${i}:`, question);
                }
            } else {
                console.warn(`Skipping line ${i} - not enough columns:`, columns);
            }
        } catch (error) {
            console.error(`Error parsing line ${i}: ${line}`, error);
        }
    }
    
    console.log(`Parsed ${questions.length} valid questions from CSV`);
    return questions;
}

// Helper function to parse CSV line correctly (handles commas in quotes)
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
    
    columns.push(current); // Add last column
    return columns;
}

// Keep the sample questions as fallback
function loadSampleQuestions() {
    console.log("Loading sample questions...");
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
    
    loadCategories();
}

// ========== CATEGORY MANAGEMENT ==========
function loadCategories() {
    // Get unique categories
    const categories = [...new Set(allQuestions.map(q => q.category))];
    const container = document.getElementById('categoryButtons');
    container.innerHTML = ''; // Clear existing buttons
    
    console.log(`Found ${categories.length} categories:`, categories);
    
    // Create button for each category
    categories.forEach(category => {
        // Count questions in this category
        const count = allQuestions.filter(q => q.category === category).length;
        
        // Create category button
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.innerHTML = `
            <i class="fas fa-folder-open"></i> ${category} 
            <span class="badge bg-light text-dark ms-2">${count}</span>
        `;
        button.onclick = () => selectCategory(category);
        container.appendChild(button);
    });
    
    // If no categories found, show message
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i> 
                No categories found. Check your CSV file format.
            </div>
        `;
    }
}

// ========== CATEGORY SELECTION ==========
function selectCategory(category) {
    console.log(`Selected category: ${category}`);
    currentCategory = category;
    
    // Filter questions for this category
    currentQuestions = allQuestions.filter(q => q.category === category);
    console.log(`Found ${currentQuestions.length} questions in ${category}`);
    
    // Reset to first question
    currentQuestionIndex = 0;
    
    // Hide category selector, show quiz area
    document.getElementById('categoryButtons').style.display = 'none';
    document.getElementById('quizArea').style.display = 'block';
    document.getElementById('currentCategory').textContent = `Category: ${category}`;
    
    // Shuffle questions initially
    shuffleArray(currentQuestions);
    
    // Load first question
    loadQuestion();
    
    // Update UI
    updateProgress();
    updateStatistics();
    
    // Show success message
    showNotification(`Loaded ${currentQuestions.length} questions from ${category}`);
}

// ========== QUESTION DISPLAY ==========
function loadQuestion() {
    if (currentQuestions.length === 0) {
        console.error("No questions to display!");
        document.getElementById('questionsContainer').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                No questions available for this category.
            </div>
        `;
        return;
    }
    
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
    
    // Update UI counters
    document.getElementById('currentQuestionNum').textContent = currentQuestionIndex + 1;
    document.getElementById('totalQuestions').textContent = currentQuestions.length;
    
    // Update navigation buttons
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    document.getElementById('nextBtn').textContent = 
        currentQuestionIndex === currentQuestions.length - 1 ? 
        'Finish <i class="fas fa-flag-checkered"></i>' : 
        'Next <i class="fas fa-arrow-right"></i>';
    
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
        showNotification('Correct! ✓', 'success');
    } else if (answerIndex !== undefined) {
        score.total++;
        showNotification('Incorrect ✗', 'error');
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
    const explanation = document.getElementById('explanation');
    if (explanation) {
        explanation.style.display = 'none';
    }
}

// ========== NAVIGATION ==========
function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
        updateProgress();
    } else {
        // Last question - show completion message
        showNotification('Quiz completed! Check your statistics below.', 'success');
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
    showNotification('Questions shuffled!', 'info');
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
    showNotification('Answers shuffled!', 'info');
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

// ========== NOTIFICATION SYSTEM ==========
function showNotification(message, type = 'info') {
    // Colors for different types
    const colors = {
        'success': '#28a745',
        'error': '#dc3545',
        'info': '#17a2b8',
        'warning': '#ffc107'
    };
    
    const color = colors[type] || colors['info'];
    
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s;
        max-width: 400px;
        font-weight: bold;
    `;
    
    // Icon based on type
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-times-circle',
        'info': 'fa-info-circle',
        'warning': 'fa-exclamation-circle'
    };
    
    const icon = icons[type] || icons['info'];
    notification.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ========== DEBUG FUNCTIONS ==========
function debugQuestions() {
    console.log("=== DEBUG INFORMATION ===");
    console.log(`Total questions loaded: ${allQuestions.length}`);
    console.log(`Current category: ${currentCategory}`);
    console.log(`Questions in current category: ${currentQuestions.length}`);
    console.log("All categories:", [...new Set(allQuestions.map(q => q.category))]);
    
    // Show in alert
    const categories = [...new Set(allQuestions.map(q => q.category))];
    const categoryCounts = categories.map(cat => {
        const count = allQuestions.filter(q => q.category === cat).length;
        return `${cat} (${count})`;
    });
    
    alert(`Loaded ${allQuestions.length} questions\n\nCategories:\n${categoryCounts.join('\n')}`);
}

// ========== EXPORT/IMPORT FUNCTIONS ==========
function exportQuestions() {
    // Convert questions to CSV format
    let csv = 'category,question,answer1,answer2,answer3,answer4,correct,explanation\n';
    
    allQuestions.forEach(q => {
        const row = [
            q.category,
            q.question,
            q.answers[0],
            q.answers[1],
            q.answers[2],
            q.answers[3],
            q.correct + 1, // Convert back to 1-based for CSV
            q.explanation
        ].map(field => `"${field.replace(/"/g, '""')}"`).join(',');
        
        csv += row + '\n';
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_backup_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Questions exported to CSV file!', 'success');
}

// ========== INITIALIZE CSS ANIMATIONS ==========
// Add CSS for notifications if not already present
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
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

// ========== ADMIN FUNCTIONS ==========
// To add an admin panel later, uncomment this:
// function showAdminPanel() {
//     // Add admin functions here
// }
