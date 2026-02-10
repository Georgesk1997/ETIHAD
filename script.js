// ==================== CATEGORY CONFIGURATION ====================
const CATEGORY_CONFIG = {
    "Flight Plan": {
        icon: "fa-route",
        color: "#0056a6",
        filename: "flight_plan.csv"
    },
    "IFR Comms": {
        icon: "fa-headset",
        color: "#28a745",
        filename: "ifr_comms.csv"
    },
    "Mass And Balance": {
        icon: "fa-weight-scale",
        color: "#dc3545",
        filename: "mass_and_balance.csv"
    },
    "OPS": {
        icon: "fa-clipboard-check",
        color: "#6f42c1",
        filename: "ops.csv"
    },
    "Performance": {
        icon: "fa-chart-line",
        color: "#fd7e14",
        filename: "performance.csv"
    },
    "RNAV": {
        icon: "fa-satellite-dish",
        color: "#17a2b8",
        filename: "rnav.csv"
    },
    "VFR Comms": {
        icon: "fa-tower-broadcast",
        color: "#20c997",
        filename: "vfr_comms.csv"
    }
};

// Application State
let allQuestions = []; // Only used for search now
let currentCategory = "";
let categoryQuestions = [];
let currentQuestionIndex = 0;
let userScore = { correct: 0, attempted: 0 };
let questionShuffledState = new Map();
let categoryQuestionCounts = {};

// ==================== INITIALIZATION ====================
window.addEventListener('DOMContentLoaded', function() {
    console.log("ETIHAD CP Aviation System Initializing...");
    initializeSystem();
});

// ==================== SYSTEM INITIALIZATION ====================
async function initializeSystem() {
    console.log("Loading system configuration...");
    
    // Load question counts for each category
    await loadCategoryCounts();
    
    displayCategories();
    showMessage("System ready. Select a category to begin.", "success");
}

// Load question counts for each category
async function loadCategoryCounts() {
    console.log("Loading category question counts...");
    categoryQuestionCounts = {};
    let totalQuestions = 0;
    
    // Load each category file to count questions
    for (const [categoryName, config] of Object.entries(CATEGORY_CONFIG)) {
        try {
            const response = await fetch(`./categories/${config.filename}`);
            if (response.ok) {
                const csvData = await response.text();
                const questions = processCSV(csvData);
                categoryQuestionCounts[categoryName] = questions.length;
                totalQuestions += questions.length;
            } else {
                categoryQuestionCounts[categoryName] = 0;
                console.warn(`Could not load ${categoryName} file`);
            }
        } catch (error) {
            categoryQuestionCounts[categoryName] = 0;
            console.warn(`Error loading ${categoryName}:`, error);
        }
    }
    
    // Update total count display
    document.getElementById('totalQuestionsCount').textContent = totalQuestions;
    document.getElementById('categoryCount').textContent = Object.keys(CATEGORY_CONFIG).length;
}

// ==================== CSV PROCESSING ====================
function processCSV(csvText) {
    const questions = [];
    const rows = csvText.split('\n');
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row || row === '') continue;
        
        // Simple CSV parsing - assumes no commas in content
        const columns = row.split(',');
        
        if (columns.length >= 7) {
            let correctIndex = parseInt(columns[6].trim()) - 1;
            if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
                correctIndex = 0;
            }
            
            let imagePath = '';
            if (columns.length > 7 && columns[7]) {
                imagePath = columns[7].trim();
                if (imagePath && !imagePath.startsWith('http') && !imagePath.startsWith('/') && !imagePath.startsWith('./')) {
                    imagePath = './' + imagePath;
                }
            }
            
            let explanation = '';
            if (columns.length > 8 && columns[8]) {
                explanation = columns[8].trim();
            }
            
            const question = {
                id: `q${i}`,
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
                currentOptions: null,
                currentCorrect: null
            };
            
            question.currentOptions = [...question.originalOptions];
            question.currentCorrect = question.originalCorrect;
            
            if (question.text && question.originalOptions[0]) {
                questions.push(question);
            }
        }
    }
    
    return questions;
}

// ==================== CATEGORY MANAGEMENT ====================
function displayCategories() {
    const container = document.getElementById('categoryGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(CATEGORY_CONFIG).forEach(categoryName => {
        const config = CATEGORY_CONFIG[categoryName];
        const questionCount = categoryQuestionCounts[categoryName] || 0;
        
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-icon" style="background: ${config.color};">
                <i class="fas ${config.icon}"></i>
            </div>
            <h5 class="fw-bold mb-2">${categoryName}</h5>
            <div class="mb-2">${questionCount} questions</div>
            <small class="text-muted">Click to start training</small>
        `;
        
        card.onclick = () => startCategory(categoryName);
        container.appendChild(card);
    });
}

// ==================== LOAD CATEGORY QUESTIONS ====================
async function startCategory(categoryName) {
    if (!categoryName || !CATEGORY_CONFIG[categoryName]) {
        showMessage("Invalid category selected", "error");
        return;
    }
    
    // Show loading state
    showLoading(true);
    
    try {
        const config = CATEGORY_CONFIG[categoryName];
        const response = await fetch(`./categories/${config.filename}`);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${categoryName} questions`);
        }
        
        const csvData = await response.text();
        categoryQuestions = processCSV(csvData);
        
        if (categoryQuestions.length === 0) {
            showMessage("No questions found in this category", "error");
            showLoading(false);
            return;
        }
        
        // Initialize quiz state
        currentCategory = categoryName;
        currentQuestionIndex = 0;
        userScore = { correct: 0, attempted: 0 };
        questionShuffledState.clear();
        
        // Update UI
        document.getElementById('categorySection').style.display = 'none';
        document.getElementById('quizSection').style.display = 'block';
        document.getElementById('statsSection').style.display = 'none';
        document.getElementById('categoryNameDisplay').textContent = categoryName;
        
        // Shuffle questions and display first one
        shuffleQuestionsAndAnswers();
        displayQuestion();
        updateProgress();
        updateScoreDisplay();
        
        showMessage(`Loaded ${categoryQuestions.length} ${categoryName} questions`, 'success');
        
    } catch (error) {
        console.error("Error loading category:", error);
        showMessage(`Error loading ${categoryName} questions: ${error.message}`, "error");
    } finally {
        showLoading(false);
    }
}

// ==================== LOADING STATE ====================
function showLoading(isLoading) {
    const loadingSection = document.getElementById('loadingSection');
    const categorySection = document.getElementById('categorySection');
    const quizSection = document.getElementById('quizSection');
    
    if (isLoading) {
        loadingSection.style.display = 'block';
        categorySection.style.display = 'none';
        quizSection.style.display = 'none';
    } else {
        loadingSection.style.display = 'none';
    }
}

// ==================== IMAGE HANDLING ====================
function extractImageName(imagePath) {
    if (!imagePath) return '';
    
    // Get just the filename from the path
    const fileName = imagePath.split('/').pop();
    
    // Remove file extension ONLY (keep everything else exactly as is)
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    
    // Return the exact name without extension
    return nameWithoutExt;
}

function handleImageError(img, imageUrl) {
    console.log('Image failed to load:', imageUrl);
    const imageName = extractImageName(decodeURIComponent(imageUrl));
    img.src = 'https://via.placeholder.com/600x300/e0e7ff/0056a6?text=Chart+Not+Found';
    img.style.border = '2px dashed #0056a6';
    img.alt = 'Image not available: ' + imageName;
    
    const label = img.parentElement.querySelector('.image-label');
    if (label) {
        label.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> Image not available';
    }
    
    // Update image name display even on error
    const imageNameElem = img.parentElement.querySelector('.image-name');
    if (imageNameElem && imageName) {
        imageNameElem.innerHTML = `<i class="fas fa-file-image me-1"></i> ${imageName}`;
    }
}

function viewImage(imageUrl) {
    const modal = new bootstrap.Modal(document.getElementById('imageViewer'));
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Extract image name
    const imageName = extractImageName(decodedUrl);
    
    // Try to load the image
    const img = document.getElementById('enlargedImage');
    img.src = decodedUrl;
    img.alt = imageName;
    
    // Update image name in modal footer
    const imageNameText = document.getElementById('imageNameText');
    if (imageNameText) {
        imageNameText.textContent = imageName;
    }
    
    // Set up error handling for modal image too
    img.onerror = function() {
        this.src = 'https://via.placeholder.com/800x600/e0e7ff/0056a6?text=Image+Not+Available';
        this.alt = 'Image not available';
        if (imageNameText) {
            imageNameText.textContent = imageName;
        }
    };
    
    modal.show();
}

// ==================== QUIZ FUNCTIONS ====================
function displayQuestion() {
    if (!categoryQuestions || categoryQuestions.length === 0) {
        document.getElementById('questionDisplay').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> No questions available for this category.
            </div>
        `;
        return;
    }
    
    const question = categoryQuestions[currentQuestionIndex];
    const container = document.getElementById('questionDisplay');
    
    let html = `
        <div class="question-box active-question">
            <h4 class="mb-3">${question.text}</h4>
    `;
    
    if (question.image && question.image.trim() !== '') {
        // Clean up the image path
        let imagePath = question.image.trim();
        
        // Extract image name without extension for display
        let imageName = extractImageName(imagePath);
        
        html += `
            <div class="chart-image">
                <img src="${imagePath}" alt="${imageName}" 
                     onerror="handleImageError(this, '${encodeURIComponent(imagePath)}')"
                     style="max-width: 100%; max-height: 300px; object-fit: contain;"
                     onclick="viewImage('${encodeURIComponent(imagePath)}')">
                <div class="image-label">Click to enlarge</div>
                ${imageName ? `
                <div class="image-name">
                    <i class="fas fa-file-image me-1"></i> ${imageName}
                </div>` : ''}
            </div>
        `;
    }
    
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
    
    document.getElementById('questionCounter').textContent = currentQuestionIndex + 1;
    document.getElementById('totalCounter').textContent = categoryQuestions.length;
    
    // Update navigation buttons
    document.getElementById('prevButton').disabled = currentQuestionIndex === 0;
    
    const isLastQuestion = currentQuestionIndex === categoryQuestions.length - 1;
    const nextBtn = document.getElementById('nextButton');
    
    // Remove any emphasis from previous wrong answer
    nextBtn.classList.remove('next-emphasis');
    
    // Reset Next button to normal state
    nextBtn.disabled = false;
    nextBtn.innerHTML = isLastQuestion 
        ? 'Finish <i class="fas fa-flag-checkered"></i>' 
        : 'Next <i class="fas fa-arrow-right"></i>';
    nextBtn.style.background = 'var(--primary-blue)';
    nextBtn.style.color = 'white';
    
    resetAnswerButtons();
}

function selectAnswer(selectedIndex) {
    const question = categoryQuestions[currentQuestionIndex];
    const buttons = document.querySelectorAll('.answer-option');
    const nextBtn = document.getElementById('nextButton');
    
    // Disable all answer buttons immediately
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
        
        // Visual feedback for correct answer
        const correctBtn = buttons[selectedIndex];
        correctBtn.classList.add('auto-advance');
        
        showMessage("Correct! ✓ Auto-advancing to next question...", "success");
        
        // AUTO-ADVANCE after 1.5 seconds for CORRECT answer
        setTimeout(() => {
            if (currentQuestionIndex < categoryQuestions.length - 1) {
                currentQuestionIndex++;
                displayQuestion();
                updateProgress();
            } else {
                // Last question completed
                showMessage("Category completed! Review your statistics.", "success");
                updateStatistics();
                // Change Next button to "Finish" if it's the last question
                nextBtn.innerHTML = 'Finish <i class="fas fa-flag-checkered"></i>';
            }
        }, 1500); // 1.5 second delay
        
    } else {
        // WRONG answer - highlight Next button and wait for click
        nextBtn.classList.add('next-emphasis');
        showMessage("Incorrect ✗ Click 'Next' to continue", "error");
        
        // Remove emphasis after 5 seconds if user doesn't click
        setTimeout(() => {
            nextBtn.classList.remove('next-emphasis');
        }, 5000);
    }
    
    updateScoreDisplay();
    updateStatistics();
    updateProgress();
}

function resetAnswerButtons() {
    const buttons = document.querySelectorAll('.answer-option');
    const nextBtn = document.getElementById('nextButton');
    
    buttons.forEach(btn => {
        btn.classList.remove('answer-correct', 'answer-incorrect', 'auto-advance');
        btn.disabled = false;
    });
    
    // Remove any emphasis from Next button
    nextBtn.classList.remove('next-emphasis');
}

function nextQuestion() {
    // Check if there are more questions
    if (currentQuestionIndex < categoryQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
        updateProgress();
    } else {
        // This is the last question
        showMessage("Category completed! Review your statistics.", "success");
        
        // Make sure statistics are visible
        updateStatistics();
        
        // Update Next button to show "Finish" state
        const nextBtn = document.getElementById('nextButton');
        nextBtn.innerHTML = 'Finish <i class="fas fa-flag-checkered"></i>';
        nextBtn.disabled = false;
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
    displayCategories();
    showMessage("Returned to category selection", "info");
}

// ==================== SHUFFLING FUNCTIONS ====================
function shuffleQuestionsAndAnswers() {
    if (!categoryQuestions.length) return;
    
    shuffleArray(categoryQuestions);
    
    categoryQuestions.forEach((question) => {
        shuffleQuestionAnswers(question);
    });
}

function shuffleQuestionAnswers(question) {
    if (!question) return;
    
    const correctAnswerText = question.originalOptions[question.originalCorrect];
    const shuffledOptions = [...question.originalOptions];
    shuffleArray(shuffledOptions);
    
    const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);
    
    question.currentOptions = shuffledOptions;
    question.currentCorrect = newCorrectIndex;
    
    questionShuffledState.set(question.id, {
        options: [...shuffledOptions],
        correct: newCorrectIndex
    });
    
    return question;
}

function randomizeQuestions() {
    if (!categoryQuestions.length) return;
    
    shuffleQuestionsAndAnswers();
    currentQuestionIndex = 0;
    displayQuestion();
    showMessage("Questions and answers shuffled!", "info");
}

function randomizeAnswers() {
    if (!categoryQuestions.length) return;
    
    const question = categoryQuestions[currentQuestionIndex];
    shuffleQuestionAnswers(question);
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

// ==================== UTILITY FUNCTIONS ====================
function refreshApp() {
    if (confirm("Refresh the application? This will reset your current progress.")) {
        location.reload();
    }
}

function showMessage(text, type = 'info') {
    const existing = document.querySelector('.system-message');
    if (existing) existing.remove();
    
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
