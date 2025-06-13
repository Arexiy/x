javascript:(function() {
    // Конфигурация
    const API_KEY = "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";
    const MODEL = "qwen/qwen3-235b-a22b:free";
    
    // Создаем интерфейс помощника
    const helper = document.createElement('div');
    helper.id = 'exam-helper';
    helper.style.cssText = `
        position: fixed;
        bottom: 15px;
        right: 15px;
        width: 300px;
        max-height: 250px;
        background: rgba(250, 250, 250, 0.95);
        border-radius: 8px;
        z-index: 10000;
        padding: 15px;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        border: 1px solid #e0e0e0;
        font-size: 14px;
        overflow: auto;
        backdrop-filter: blur(3px);
        opacity: 0.95;
        transition: all 0.3s ease;
        display: block;
    `;
    
    helper.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; font-size: 15px; color: #333;">🤖 Экзамен Помощник</div>
            <div style="display: flex; gap: 6px;">
                <button id="min-btn" style="background:#f5f5f5; border:1px solid #ddd; border-radius:4px; cursor:pointer; font-size:16px; width:26px; height:26px; display:flex; align-items:center; justify-content:center;">−</button>
                <button id="close-btn" style="background:#f5f5f5; border:1px solid #ddd; border-radius:4px; cursor:pointer; font-size:16px; width:26px; height:26px; display:flex; align-items:center; justify-content:center;">×</button>
            </div>
        </div>
        <div id="helper-content" style="font-size: 14px; line-height: 1.5; color: #444; min-height: 60px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <div class="loader" style="border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div>
                <div>Анализ вопроса...</div>
            </div>
        </div>
        <div style="font-size: 11px; color: #777; text-align: right; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0;">
            Ctrl+Shift+X - показать/скрыть | Статус: <span id="status">активен</span>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
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
        helper.style.transform = helper.style.transform ? '' : 'translateY(calc(100% - 40px))';
    });
    
    // Улучшенная функция сбора вопроса
    function getCurrentQuestion() {
        try {
            // Альтернативные селекторы для разных LMS
            const questionElem = document.querySelector('.test-table.active, .question-container, .quiz-question') 
                || document.querySelector('[class*="question"]:not([style*="display:none"])');
            
            if (!questionElem) {
                statusEl.textContent = "вопрос не найден";
                return null;
            }
            
            // Поиск текста вопроса
            const questionText = questionElem.querySelector('.test-question, .question-text, .prompt')?.innerText 
                || questionElem.querySelector('[class*="question"]')?.innerText;
            
            if (!questionText) {
                statusEl.textContent = "текст вопроса пуст";
                return null;
            }
            
            // Сбор вариантов ответов
            const answers = [];
            const answerItems = questionElem.querySelectorAll('.test-answers li, .answer-option, .response-item');
            
            answerItems.forEach(item => {
                try {
                    const keyElement = item.querySelector('.test-variant, .option-key, .response-label');
                    const key = keyElement?.innerText.trim().replace(/[.:)]/g, '') || '?';
                    
                    const textElement = item.querySelector('label, .option-text, .response-text');
                    const text = textElement?.innerText.replace(keyElement?.innerText || '', '').trim() 
                        || item.innerText.replace(keyElement?.innerText || '', '').trim();
                    
                    answers.push({
                        key,
                        text,
                        element: item,
                        input: item.querySelector('input[type="radio"], input[type="checkbox"]')
                    });
                } catch (e) {
                    console.error("Error parsing answer:", e);
                }
            });
            
            return {
                question: questionText,
                answers,
                element: questionElem
            };
        } catch (error) {
            statusEl.textContent = "ошибка сбора данных";
            contentEl.innerHTML = `<div style="color:#d32f2f;">Ошибка: ${error.message}</div>`;
            return null;
        }
    }
    
    // Функция запроса к ИИ с таймаутом
    async function getAIResponse(questionData) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут
        
        try {
            statusEl.textContent = "запрос к ИИ...";
            
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
                        content: `Дай ответ на экзаменационный вопрос. Формат ответа:
1. Рекомендуемый вариант: [БУКВА]
2. Обоснование: [1 предложение]

Вопрос: ${questionData.question.substring(0, 1000)} 
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
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.choices[0]?.message?.content.trim();
            
        } catch (error) {
            clearTimeout(timeoutId);
            statusEl.textContent = "ошибка запроса";
            
            // Альтернативный метод, если API не работает
            return getFallbackResponse(questionData);
        }
    }
    
    // Резервный метод, если API недоступно
    function getFallbackResponse(questionData) {
        statusEl.textContent = "используется локальный анализ";
        
        // Простая эвристика для выбора ответа
        const keywords = ["верно", "правильно", "да", "true", "yes", "корректно", "является"];
        const answers = questionData.answers;
        
        // Попробуем найти ответы с ключевыми словами
        for (let i = 0; i < answers.length; i++) {
            if (keywords.some(kw => answers[i].text.toLowerCase().includes(kw))) {
                return `1. Рекомендуемый вариант: ${answers[i].key}\n2. Обоснование: Содержит ключевое слово в тексте ответа`;
            }
        }
        
        // Если не нашли - выбираем самый длинный ответ
        const longestAnswer = answers.reduce((longest, current) => 
            current.text.length > longest.text.length ? current : longest, answers[0]);
        
        return `1. Рекомендуемый вариант: ${longestAnswer.key}\n2. Обоснование: Самый подробный вариант ответа`;
    }
    
    // Главная функция обработки
    async function processQuestion() {
        statusEl.textContent = "поиск вопроса...";
        const questionData = getCurrentQuestion();
        
        if (!questionData || !questionData.answers || questionData.answers.length === 0) {
            contentEl.innerHTML = "<div>Вопрос не обнаружен. Прокрутите страницу вниз.</div>";
            return;
        }
        
        try {
            contentEl.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
                <div class="loader" style="border:3px solid #f3f3f3;border-top:3px solid #3498db;border-radius:50%;width:24px;height:24px;animation:spin 1s linear infinite;"></div>
                <div>Анализ вопроса...</div>
            </div>`;
            
            statusEl.textContent = "отправка запроса...";
            const aiResponse = await getAIResponse(questionData);
            
            // Форматирование ответа
            let formattedResponse = aiResponse;
            const keyMatch = aiResponse.match(/Рекомендуемый вариант:\s*([A-Я0-9])/i);
            
            if (keyMatch) {
                formattedResponse = aiResponse.replace(
                    /(Рекомендуемый вариант:\s*)([A-Я0-9])/i, 
                    '$1<span style="background-color:#e8f5e9; padding:2px 6px; border-radius:4px; font-weight:bold;">$2</span>'
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
                    }, 2000);
                }
            }
            
        } catch (error) {
            contentEl.innerHTML = `<div style="color:#d32f2f;">Ошибка: ${error.message}</div>`;
            statusEl.textContent = "ошибка обработки";
        }
    }
    
    // Скрытие консольных логов
    const originalConsole = { log: console.log, error: console.error };
    console.log = function() {};
    console.error = function() {};
    
    // Восстановление console при закрытии
    helper.querySelector('#close-btn').addEventListener('click', () => {
        console.log = originalConsole.log;
        console.error = originalConsole.error;
    });
    
    // Запуск обработки
    processQuestion();
    
    // Периодическая проверка
    let processInterval = setInterval(processQuestion, 10000);
    
    // Остановка при закрытии
    helper.querySelector('#close-btn').addEventListener('click', () => {
        clearInterval(processInterval);
    });
    
    // Автоскрытие при изменении видимости страницы
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            helper.style.display = 'none';
        } else {
            helper.style.display = 'block';
        }
    });
})();
