// ===== CONFIG =====
const CONFIG = {
    MAX_PROMPT_LENGTH: 2000,      // Лимит символов в промте
    WARNING_THRESHOLD: 1800,      // Порог для предупреждения (цвет)
};

// ===== STATE =====
let currentSQL = '';
let currentResults = null;
let timerInterval = null;
let abortController = null;

// ===== ELEMENTS =====
const sqlEditor = document.getElementById('sqlEditor');
const promptInput = document.getElementById('promptInput');
const charCount = document.getElementById('charCount');
const btnGenerate = document.getElementById('btnGenerate');
const btnText = document.getElementById('btnText');
const btnArrow = document.getElementById('btnArrow');
const btnSpinner = document.getElementById('btnSpinner');
const sqlSection = document.getElementById('sqlSection');
const sqlCode = document.getElementById('sqlCode');
const confirmSection = document.getElementById('confirmSection');
const executingOverlay = document.getElementById('executingOverlay');
const resultsSection = document.getElementById('resultsSection');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const agentStatus = document.getElementById('agentStatus');
const agentStatusText = document.getElementById('agentStatusText');
const agentBanner = document.getElementById('agentBanner');
const btnExecute = document.getElementById('btnExecute');
const btnExecuteText = document.getElementById('btnExecuteText');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    checkAgentHealth();
    renderHistory();
});

// ===== SQL EDITOR INPUT HANDLER =====
if (sqlEditor) {
    sqlEditor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }
    });
}
// ===== CHAR COUNT =====
promptInput.addEventListener('input', () => {
    const len = promptInput.value.length;

    // Обновляем счётчик
    charCount.textContent = `${len} / ${CONFIG.MAX_PROMPT_LENGTH}`;

    // Меняем цвет при приближении к лимиту
    if (len > CONFIG.WARNING_THRESHOLD) {
        charCount.style.color = 'var(--s7-red)';
        charCount.style.fontWeight = '600'; // Дополнительно выделяем жирным
    } else {
        charCount.style.color = 'var(--s7-gray-light)';
        charCount.style.fontWeight = '400';
    }
});

// ===== HEALTHCHECK =====
async function checkAgentHealth() {
    agentStatus.className = 'agent-status checking';
    agentStatusText.textContent = 'Проверка...';

    try {
        const res = await fetch('/api/v1/agent/healthcheck', { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.status === 'ready') {
            agentStatus.className = 'agent-status online';
            agentStatusText.textContent = 'Агент активен';
            agentBanner.classList.remove('visible');
        } else {
            throw new Error(data.status);
        }
    } catch (err) {
        agentStatus.className = 'agent-status offline';
        agentStatusText.textContent = 'Агент недоступен';
        agentBanner.classList.add('visible');
        showToast('AI-агент недоступен', `Healthcheck: ${err.message}`, true);
    }
}

// ===== SUGGESTIONS =====
function useSuggestion(el) {
    const text = el.textContent.trim();
    promptInput.value = text;
    promptInput.dispatchEvent(new Event('input'));
    promptInput.focus();
    el.style.transform = 'scale(0.95)';
    setTimeout(() => el.style.transform = '', 150);
}

// ===== GENERATE SQL =====
async function generateSQL() {
    const prompt = promptInput.value.trim();
    if (!prompt) {
        promptInput.focus();
        promptInput.classList.add('error');
        setTimeout(() => promptInput.classList.remove('error'), 2000);
        showToast('Пустой запрос', 'Введите описание данных, которые хотите получить', true);
        return;
    }

    // Проверяем, есть ли этот промт в истории с сохранённым SQL
    const history = getHistory();
    const cached = history.find(h => h.prompt === prompt && h.sql);

    if (cached) {
        // Восстанавливаем из кэша — не дёргаем LLM
        restoreFromHistory(cached);
        showToast('Из кэша', 'SQL-запрос найден в истории — LLM не вызывалась');
        return;
    }

    // Loading state
    btnText.textContent = 'Генерация...';
    btnArrow.style.display = 'none';
    btnSpinner.style.display = 'block';
    btnGenerate.disabled = true;

    // Hide previous
    resultsSection.classList.remove('visible');
    sqlSection.classList.remove('visible');
    confirmSection.classList.remove('visible');
    confirmSection.style.display = 'none';
    executingOverlay.classList.remove('visible');

    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    try {
        abortController = new AbortController();
        const res = await fetch('/api/v1/agent/generate_sql_query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
            signal: abortController.signal
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw { status: res.status, detail: errData.detail || 'Ошибка генерации SQL' };
        }

        const data = await res.json();
        currentSQL = data.content || '';

        if (!currentSQL.trim()) {
            throw { status: 502, detail: 'AI вернул пустой SQL-запрос' };
        }

        showSQLAndConfirm(currentSQL);
        addToHistory(prompt, currentSQL);

        sqlSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (err) {
        if (err.name === 'AbortError') return;
        showToast(`Ошибка ${err.status || ''}`, err.detail || 'Не удалось сгенерировать SQL', true);
    } finally {
        btnText.textContent = 'Сгенерировать запрос';
        btnArrow.style.display = '';
        btnSpinner.style.display = 'none';
        btnGenerate.disabled = false;
    }
}

// ===== SHOW SQL + CONFIRM =====
function showSQLAndConfirm(sql) {
    currentSQL = sql;

    sqlSection.classList.add('visible');

    applySQLHighlight(sql);
    sqlEditor.classList.remove('edited');

    confirmSection.style.display = 'flex';
    setTimeout(() => confirmSection.classList.add('visible'), 10);
    startExecuteTimer();

    executingOverlay.classList.remove('visible');
    resultsSection.classList.remove('visible');
}

// ===== RESTORE FROM HISTORY =====
function restoreFromHistory(item) {
    // Скрываем результаты, показываем SQL
    resultsSection.classList.remove('visible');
    executingOverlay.classList.remove('visible');

    currentSQL = item.sql;

    sqlSection.classList.add('visible');

    applySQLHighlight(currentSQL);
    sqlEditor.classList.remove('edited');

    confirmSection.style.display = 'flex';
    setTimeout(() => confirmSection.classList.add('visible'), 10);
    startExecuteTimer();

    sqlSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ===== EXECUTE TIMER =====
function startExecuteTimer() {
    let seconds = 5;
    btnExecute.disabled = true;
    btnExecuteText.textContent = `Выполнить (${seconds})`;

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            btnExecute.disabled = false;
            btnExecuteText.textContent = 'Выполнить';
        } else {
            btnExecuteText.textContent = `Выполнить (${seconds})`;
        }
    }, 1000);
}

// ===== EXECUTE SQL =====
async function executeSQL() {
    // Используем актуальный SQL из редактора
    const sqlToExecute = sqlEditor.innerText.trim();
    if (!sqlToExecute) return;

    currentSQL = sqlToExecute; // Синхронизируем

    confirmSection.classList.remove('visible');
    confirmSection.style.display = 'none';
    executingOverlay.classList.add('visible');

    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    const startTime = performance.now();

    try {
        const res = await fetch('/api/v1/database/execute_sql_query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql_query: currentSQL })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw { status: res.status, detail: errData.detail || 'Ошибка выполнения запроса' };
        }

        const data = await res.json();
        const execTime = ((performance.now() - startTime) / 1000).toFixed(2);

        currentResults = data;
        executingOverlay.classList.remove('visible');
        showResults(data, execTime);

    } catch (err) {
        executingOverlay.classList.remove('visible');
        showToast(`Ошибка ${err.status || ''}`, err.detail || 'Не удалось выполнить SQL', true);
        // Show confirm again
        confirmSection.style.display = 'flex';
        setTimeout(() => confirmSection.classList.add('visible'), 10);
        startExecuteTimer();
    }
}

// ===== SHOW RESULTS =====
function showResults(data, execTime) {
    const { columns, rows_with_column_names } = data;
    const rows = rows_with_column_names || [];

    document.getElementById('statRows').textContent = rows.length;
    document.getElementById('statCols').textContent = columns.length;
    document.getElementById('statTime').textContent = execTime + 's';
    document.getElementById('resultsMeta').textContent =
        `Выполнено за ${execTime} сек • ${rows.length} строк • ${columns.length} колонок`;
    document.getElementById('tableFooterText').innerHTML =
        `Показано <strong>${rows.length}</strong> записей`;

    // Table head
    const thead = document.getElementById('tableHead');
    thead.innerHTML = '';
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Table body
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    rows.forEach((rowObj, idx) => {
        const tr = document.createElement('tr');
        if (idx < 10) tr.style.animationDelay = `${idx * 0.03}s`;
        columns.forEach(col => {
            const td = document.createElement('td');
            const val = rowObj[col];
            const strVal = val !== null && val !== undefined ? String(val) : 'NULL';

            if (strVal === 'NULL') {
                td.style.color = 'var(--s7-gray-light)';
                td.style.fontStyle = 'italic';
                td.textContent = 'NULL';
            } else if (/^-?\d+\.?\d*$/.test(strVal) || strVal.includes('₽')) {
                td.className = 'cell-number';
                td.textContent = strVal;
            } else {
                td.textContent = strVal;
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    resultsSection.classList.add('visible');
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// ===== CANCEL =====
function cancelExecution() {
    confirmSection.classList.remove('visible');
    setTimeout(() => {
        confirmSection.style.display = 'none';
    }, 300);
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    showToast('Отменено', 'Выполнение запроса отменено');
}

// ===== NEW QUERY =====
function newQuery() {
    promptInput.value = '';
    promptInput.dispatchEvent(new Event('input'));
    sqlSection.classList.remove('visible');
    resultsSection.classList.remove('visible');
    confirmSection.classList.remove('visible');
    confirmSection.style.display = 'none';
    executingOverlay.classList.remove('visible');
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    promptInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== COPY SQL =====
function copySQL() {
    const text = sqlEditor.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Скопировано', 'SQL-запрос скопирован в буфер обмена');
    });
}

// ===== EXPORT CSV =====
function exportCSV() {
    if (!currentResults) return;
    const { columns, rows_with_column_names } = currentResults;
    let csv = columns.join(',') + '\n';
    (rows_with_column_names || []).forEach(row => {
        csv += columns.map(col => {
            const val = row[col];
            const str = val !== null && val !== undefined ? String(val) : '';
            return `"${str.replace(/"/g, '""')}"`;
        }).join(',') + '\n';
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 's7_analytics_export.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Экспорт', 'CSV файл скачан');
}

// ===== TOAST =====
function showToast(title, message, isError = false) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;

    const iconPath = isError
        ? '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>'
        : '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>';

    toast.innerHTML = `
        <svg viewBox="0 0 24 24">${iconPath}</svg>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('visible'));
    });

    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

// ===== HISTORY (localStorage) =====
function getHistory() {
    try {
        return JSON.parse(localStorage.getItem('s7_analytics_history') || '[]');
    } catch { return []; }
}

function saveHistory(history) {
    try {
        localStorage.setItem('s7_analytics_history', JSON.stringify(history));
    } catch {}
}

function addToHistory(prompt, sql) {
    const history = getHistory();

    // Если такой промт уже есть — обновляем SQL и timestamp (перемещаем в начало)
    const existingIdx = history.findIndex(h => h.prompt === prompt);
    if (existingIdx !== -1) {
        history[existingIdx].sql = sql;
        history[existingIdx].time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        history[existingIdx].date = new Date().toLocaleDateString('ru-RU');
        history[existingIdx].timestamp = Date.now();
        // Перемещаем в начало
        const [item] = history.splice(existingIdx, 1);
        history.unshift(item);
    } else {
        history.unshift({
            prompt,
            sql,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString('ru-RU'),
            timestamp: Date.now()
        });
    }

    if (history.length > 10) history.pop();
    saveHistory(history);
    renderHistory();
}

function renderHistory() {
    const history = getHistory();
    if (history.length === 0) {
        historySection.style.display = 'none';
        return;
    }
    historySection.style.display = '';
    historyList.innerHTML = '';
    history.forEach((item) => {
        const el = document.createElement('div');
        el.className = 'history-item';

        // Показываем бейдж «Cached» если SQL сохранён
        const cachedBadge = item.sql
            ? `<span class="history-cached-badge">Cached</span>`
            : '';

        el.innerHTML = `
            <div class="history-item-icon">
                <svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28-2.54L12 8z"/></svg>
            </div>
            <span class="history-item-text">${item.prompt}</span>
            ${cachedBadge}
            <span class="history-item-time">${item.date} ${item.time}</span>
        `;

        el.onclick = () => {
            // Подставляем промт
            promptInput.value = item.prompt;
            promptInput.dispatchEvent(new Event('input'));

            // Если есть сохранённый SQL — сразу показываем его без вызова LLM
            if (item.sql) {
                restoreFromHistory(item);
                showToast('Из истории', `SQL восстановлен из кэша (${item.date} ${item.time})`);
            } else {
                // Старая запись без SQL — просто фокусируем
                promptInput.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        historyList.appendChild(el);
    });
}

// ===== KEYBOARD SHORTCUT =====
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        generateSQL();
    }
});

// ===== CLEAR HISTORY =====
function clearHistory() {
    const history = getHistory();
    if (history.length === 0) {
        showToast('История пуста', 'Нечего очищать');
        return;
    }

    if (!confirm('Вы действительно хотите очистить всю историю запросов? Это действие нельзя отменить.')) {
        return;
    }

    try {
        localStorage.removeItem('s7_analytics_history');
        renderHistory();
        showToast('История очищена', 'Все сохранённые запросы удалены');
    } catch (err) {
        showToast('Ошибка', 'Не удалось очистить историю', true);
        console.error('Clear history error:', err);
    }
}

// ===== UNIVERSAL SQL HIGHLIGHT =====
function applySQLHighlight(sqlText) {
    // 1. Сбрасываем состояние редактора
    sqlEditor.removeAttribute('data-highlighted');
    sqlEditor.removeAttribute('data-processed');
    sqlEditor.className = 'sql-editor';

    // 2. Подсвечиваем и вставляем результат
    const highlighted = hljs.highlight(sqlText, { language: 'sql' });
    sqlEditor.innerHTML = highlighted.value;

    // 3. Обновляем глобальную переменную
    currentSQL = sqlEditor.innerText;
}