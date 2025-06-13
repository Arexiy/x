// Экзаменационный помощник - полная версия
(function() {
    // Конфигурация
    const API_KEY = "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";
    const MODEL = "qwen/qwen3-235b-a22b:free";
    
    // Создаем интерфейс помощника
    const helper = document.createElement('div');
    helper.id = 'exam-helper';
    helper.style = `
        position: fixed;
        bottom: 15px;
        right: 15px;
        width: 280px;
        max-height: 200px;
        background: rgba(250, 250, 250, 0.92);
        border-radius: 8px;
        z-index: 10000;
        padding: 12px;
        font-family: Arial;
        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        border: 1px solid #eaeaea;
        font-size: 13px;
        overflow: auto;
        backdrop-filter: blur(2px);
        opacity: 0.9;
        transition: all 0.3s ease;
    `;
    
    helper.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-weight: bold; color: #444;">🤖 Экзамен Помощник</div>
            <div style="display: flex; gap: 5px;">
                <button id="min-btn" style="background:none; border:none; cursor:pointer; font-size:18px;">−</button>
                <button id="close-btn" style="background:none; border:none; cursor:pointer; font-size:18px;">×</button>
            </div>
        </div>
        <div id="helper-content" style="font-size: 13px; line-height: 1.4; color: #333;">
            Загрузка...
        </div>
        <div style="font-size: 10px; color: #999; text-align: right; margin-top: 5px;">
            Ctrl+Shift+X - скрыть
        </div>
    `;
    
    document.body.appendChild(helper);
    
    // Управление окном
    document.getElementById('close-btn').addEventListener('click', () => helper.remove());
    document.getElementById('min-btn').addEventListener('click', () => {
        helper.style.transform = helper.style.transform ? '' : 'translateY(calc(100% - 30px))';
    });
    
    // Горячие клавиши
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'X') {
            helper.style.display = helper.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // Функция обработки вопросов
    async function processQuestion() {
        try {
            // Поиск активного вопроса
            const questionElem = document.querySelector('.test-table.active');
            if (!questionElem) return;
            
            const questionText = questionElem.querySelector('.test-question')?.innerText;
            const answers = [];
            
            // Сбор вариантов ответов
            questionElem.querySelectorAll('.test-answers li').forEach(item => {
                const key = item.querySelector('.test-variant')?.innerText.trim();
                const text = item.querySelector('label').innerText.replace(key, '').trim();
                answers.push({key, text, element: item});
            });
            
            if (!questionText) return;
            
            // Отправка запроса к ИИ
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
                        content: `Дай ответ на экзаменационный вопрос максимально кратко, только букву правильного варианта и очень короткое объяснение (1 предложение).
Вопрос: ${questionText}
Варианты: ${answers.map(a => `${a.key}) ${a.text}`).join('; ')}`
                    }],
                    temperature: 0.1,
                    max_tokens: 100
                })
            });
            
            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            
            // Отображение ответа
            document.getElementById('helper-content').innerHTML = aiResponse;
            
            // Автоматический выбор ответа
            const keyMatch = aiResponse.match(/[A-Я]\)|\b([A-Я])\b/);
            if (keyMatch) {
                const answerKey = keyMatch[1] || keyMatch[0].charAt(0);
                const answer = answers.find(a => a.key === answerKey);
                if (answer) {
                    setTimeout(() => {
                        answer.element.querySelector('input[type="radio"]').click();
                    }, 1500);
                }
            }
        } catch (e) {
            document.getElementById('helper-content').innerHTML = "Ошибка подключения";
        }
    }
    
    // Запуск обработки
    processQuestion();
    
    // Периодическая проверка
    setInterval(processQuestion, 5000);
    
    // Скрытие консольных логов
    console.log = function(){};
    console.error = function(){};
})();
