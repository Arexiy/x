javascript:(function() {
    // Конфигурация
    const API_KEY = "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";
    const MODEL = "qwen/qwen3-235b-a22b:free";
    
    // Создаем интерфейс помощника
    const helper = document.createElement('div');
    helper.id = 'exam-helper';
    helper.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 320px;
        max-height: 280px;
        background: rgba(255, 255, 255, 0.97);
        border-radius: 10px;
        z-index: 10000;
        padding: 15px;
        font-family: Arial, sans-serif;
        box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        border: 1px solid #ddd;
        font-size: 14px;
        overflow: auto;
        backdrop-filter: blur(4px);
        opacity: 0.98;
        transition: all 0.3s ease;
        display: block;
    `;
    
    helper.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; font-size: 16px; color: #2c3e50;">🤖 Экзамен Помощник</div>
            <div style="display: flex; gap: 8px;">
                <button id="min-btn" style="background:#f0f5ff; border:1px solid #d0d9ff; border-radius:5px; cursor:pointer; font-size:17px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; color:#4a6cf7;">−</button>
                <button id="close-btn" style="background:#fff0f0; border:1px solid #ffd0d0; border-radius:5px; cursor:pointer; font-size:17px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; color:#f74a4a;">×</button>
            </div>
        </div>
        <div id="helper-content" style="font-size: 14px; line-height: 1.5; color: #34495e; min-height: 70px; padding: 10px 0;">
            <div style="display:flex; align-items:center; gap:12px;">
                <div class="loader" style="border: 4px solid rgba(52, 152, 219, 0.2); border-top: 4px solid #3498db; border-radius: 50%; width: 28px; height: 28px; animation: spin 1s linear infinite;"></div>
                <div>Поиск вопросов на странице...</div>
            </div>
        </div>
        <div style="font-size: 12px; color: #7f8c8d; text-align: right; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f5f5f5;">
            Статус: <span id="status">инициализация</span> | Ctrl+Shift+X
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            #helper-content .answer-highlight {
                background-color: #e8f5e9;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: bold;
                color: #2e7d32;
            }
        </style>
    `;
    
    document.body.appendChild(helper);
    
    // Элементы управления
    const contentEl = document.getElementById('helper-content');
    const statusEl = document.getElementById('status');
    
    // Показать/скрыть по горячим клавишам
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'X') {
            helper.style.display = helper.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // Управление окном
    document.getElementById('close-btn').addEventListener('click', () => helper.remove());
    document.getElementById('min-btn').addEventListener('click', () => {
        helper.style.transform = helper.style.transform ? '' : 'translateY(calc(100% - 45px))';
    });
    
    // 1. Расширенный поиск вопросов
    function findQuestions() {
        statusEl.textContent = "поиск вопросов...";
        
        // Все возможные селекторы для вопросов
        const questionSelectors = [
            '.test-table', '.question', '.quiz-item', 
            '.exam-question', '.test-question', '.assessment-item',
            '[id*="question"]', '[class*="question"]', 
            '[id*="test"]', '[class*="test"]',
            '.question-container', '.question-wrapper'
        ];
        
        const questions = [];
        
        // Поиск по всем возможным селекторам
        questionSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                // Проверяем, содержит ли элемент текст вопроса
                const questionText = el.innerText.trim();
                if (questionText.length > 10 && !questions.some(q => q.element === el)) {
                    questions.push({
                        element: el,
                        text: questionText.substring(0, 300),
                        answers: []
                    });
                }
            });
        });
        
        // Если ничего не найдено, пробуем найти по структуре
        if (questions.length === 0) {
            statusEl.textContent = "анализ структуры...";
            
            // Поиск элементов, содержащих радиокнопки (варианты ответов)
            document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
                const container = input.closest('li, div, tr, .option, .answer');
                if (container) {
                    const questionContainer = container.closest('div, table, form, section');
                    if (questionContainer && !questions.some(q => q.element === questionContainer)) {
                        const questionText = questionContainer.innerText.substring(0, 300);
                        questions.push({
                            element: questionContainer,
                            text: questionText,
                            answers: []
                        });
                    }
                }
            });
        }
        
        return questions;
    }
    
    // 2. Сбор вариантов ответов для вопроса
    function findAnswers(questionElement) {
        const answers = [];
        
        // Поиск вариантов ответов внутри элемента вопроса
        const answerContainers = questionElement.querySelectorAll(
            '.test-answers, .answers, .options, .choices, .response-list, li, .option'
        );
        
        answerContainers.forEach(container => {
            // Поиск элементов ввода
            const inputs = container.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            
            inputs.forEach(input => {
                try {
                    // Поиск текста ответа
                    const textElement = input.closest('label') || 
                                      input.nextElementSibling ||
                                      input.parentNode;
                    
                    let answerText = textElement?.innerText.trim() || '';
                    
                    // Очистка текста
                    answerText = answerText
                        .replace(/^\s*[A-Za-z0-9][.)]\s*/, '')  // Удаление префиксов типа "A. "
                        .replace(/\s+/g, ' ')
                        .substring(0, 200);
                    
                    // Определение ключа (A, B, C...)
                    let key = '?';
                    const keyMatch = textElement?.innerText.match(/^\s*([A-Za-z0-9])[.)]/);
                    if (keyMatch) key = keyMatch[1].toUpperCase();
                    
                    answers.push({
                        key,
                        text: answerText,
                        element: container,
                        input
                    });
                } catch (e) {
                    console.error("Error parsing answer:", e);
                }
            });
        });
        
        return answers;
    }
    
    // 3. Определение активного вопроса
    function getCurrentQuestion() {
        try {
            // Поиск всех возможных вопросов
            const questions = findQuestions();
            if (questions.length === 0) return null;
            
            // Попробуем найти вопрос с классом "active"
            let activeQuestion = questions.find(q => 
                q.element.classList.contains('active') || 
                q.element.classList.contains('current')
            );
            
            // Если не нашли, возьмем первый вопрос в области видимости
            if (!activeQuestion) {
                statusEl.textContent = "поиск видимого вопроса...";
                const viewportHeight = window.innerHeight;
                
                for (const q of questions) {
                    const rect = q.element.getBoundingClientRect();
                    if (rect.top >= 0 && rect.bottom <= viewportHeight + 200) {
                        activeQuestion = q;
                        break;
                    }
                }
            }
            
            // Если все еще не нашли, возьмем первый вопрос
            if (!activeQuestion) {
                statusEl.textContent = "используем первый вопрос";
                activeQuestion = questions[0];
            }
            
            // Собираем ответы для найденного вопроса
            activeQuestion.answers = findAnswers(activeQuestion.element);
            
            return activeQuestion;
        } catch (error) {
            statusEl.textContent = "ошибка поиска";
            contentEl.innerHTML = `<div style="color:#e74c3c;">Ошибка: ${error.message}</div>`;
            return null;
        }
    }
    
    // 4. Функция запроса к ИИ
    async function getAIResponse(questionData) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
            statusEl.textContent = "запрос к ИИ...";
            contentEl.innerHTML = `<div style="display:flex;align-items:center;gap:12px;">
                <div class="loader" style="border:4px solid rgba(52,152,219,0.2);border-top:4px solid #3498db;border-radius:50%;width:28px;height:28px;animation:spin 1s linear infinite;"></div>
                <div>Отправка вопроса на анализ...</div>
            </div>`;
            
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [{
                        role: "user",
                        content: `Анализируй экзаменационный вопрос. Формат ответа:
1. Рекомендуемый вариант: [БУКВА]
2. Обоснование: [1 предложение]

Вопрос: ${questionData.text.substring(0, 1000)} 
Варианты: 
${questionData.answers.slice(0, 10).map(a => `[${a.key}] ${a.text.substring(0, 200)}`).join('\n')}`
                    }],
                    temperature: 0.2,
                    max_tokens: 150
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Ошибка API: ${response.status}`);
            }
            
            const data = await response.json();
            return data.choices[0]?.message?.content.trim();
            
        } catch (error) {
            clearTimeout(timeoutId);
            statusEl.textContent = "ошибка запроса";
            return getFallbackResponse(questionData);
        }
    }
    
    // 5. Главная функция обработки
    async function processQuestion() {
        try {
            const questionData = getCurrentQuestion();
            
            if (!questionData) {
                contentEl.innerHTML = `
                    <div style="background:#fff8e1; padding:15px; border-radius:8px; border-left:4px solid #ffc107;">
                        <h4 style="margin-top:0; color:#d35400;">Вопрос не обнаружен</h4>
                        <p>Попробуйте:</p>
                        <ul style="padding-left:20px;">
                            <li>Прокрутить страницу вниз</li>
                            <li>Перейти к следующему вопросу</li>
                            <li>Обновить страницу и активировать скрипт снова</li>
                        </ul>
                        <p style="margin-bottom:0;">Система будет автоматически перепроверять...</p>
                    </div>
                `;
                return;
            }
            
            // Обновление статуса
            statusEl.textContent = "обработка вопроса...";
            
            // Отправка запроса к ИИ
            const aiResponse = await getAIResponse(questionData);
            
            // Форматирование ответа
            let formattedResponse = aiResponse;
            const keyMatch = aiResponse.match(/Рекомендуемый вариант:\s*([A-Я0-9])/i);
            
            if (keyMatch) {
                formattedResponse = aiResponse.replace(
                    /(Рекомендуемый вариант:\s*)([A-Я0-9])/i, 
                    '$1<span class="answer-highlight">$2</span>'
                );
            }
            
            contentEl.innerHTML = formattedResponse.replace(/\n/g, '<br>');
            statusEl.textContent = "анализ завершен";
            
            // Автоматический выбор ответа
            if (keyMatch) {
                const answerKey = keyMatch[1];
                const answer = questionData.answers.find(a => a.key === answerKey);
                
                if (answer && answer.input) {
                    setTimeout(() => {
                        answer.input.click();
                        statusEl.textContent = "выбран ответ " + answerKey;
                        
                        // Пометка выбранного ответа
                        contentEl.innerHTML += `<div style="margin-top:10px; padding:8px; background:#e8f5e9; border-radius:5px; border-left:3px solid #4caf50;">
                            ✔️ Автоматически выбран вариант ${answerKey}
                        </div>`;
                    }, 2000);
                }
            }
            
        } catch (error) {
            contentEl.innerHTML = `<div style="color:#e74c3c; padding:10px; background:#fdefef; border-radius:5px;">Ошибка: ${error.message}</div>`;
            statusEl.textContent = "ошибка обработки";
        }
    }
    
    // 6. Инициализация и запуск
    console.log = function() {}; // Отключаем логи
    
    // Первый запуск
    processQuestion();
    
    // Периодическая проверка каждые 10 секунд
    let processInterval = setInterval(processQuestion, 10000);
    
    // Остановка при закрытии
    helper.querySelector('#close-btn').addEventListener('click', () => {
        clearInterval(processInterval);
    });
    
    // Автоскрытие при изменении видимости страницы
    document.addEventListener('visibilitychange', () => {
        helper.style.display = document.visibilityState === 'visible' ? 'block' : 'none';
    });
})();
