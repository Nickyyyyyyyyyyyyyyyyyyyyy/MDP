document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('taskList');
    const currentMonthYear = document.getElementById('currentMonthYear');
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const todayBtn = document.getElementById('todayBtn');
    const daysNav = document.querySelector('.days-nav');
    const selectedDateHeader = document.getElementById('selectedDateHeader');
    const categoryFilter = document.getElementById('categoryFilter');
    const completedTasksCount = document.getElementById('completedTasksCount');
    const totalTasksCount = document.getElementById('totalTasksCount');
    const clearCompletedBtn = document.getElementById('clearCompletedBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    // Модальне вікно та його елементи
    const taskModal = document.getElementById('taskModal'); // Змінив id
    const openAddTaskModalBtn = document.getElementById('openAddTaskModalBtn');
    const closeButton = document.querySelector('.close-button');
    const modalTitle = document.getElementById('modalTitle'); // Заголовок модального вікна
    const modalTaskName = document.getElementById('modalTaskName');
    const modalTaskTime = document.getElementById('modalTaskTime');
    const modalTaskDescription = document.getElementById('modalTaskDescription');
    const modalTaskCategory = document.getElementById('modalTaskCategory');
    const saveTaskBtn = document.getElementById('saveTaskBtn');

    let currentDay = new Date();
    let today = new Date();
    let tasks = JSON.parse(localStorage.getItem('dailyPlannerTasks')) || {};
    let currentFilterCategory = 'all';
    let editingTaskOriginalData = null; // Для зберігання даних завдання, що редагується

    const daysOfWeekNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const monthNames = [
        "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
        "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
    ];

    // --- Функції для дати та часу ---

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    function getCurrentTimeInMinutes() {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }

    function timeToMinutes(timeStr) {
        if (!timeStr) return -1; // Завдання без часу будуть йти після завдань з часом
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // --- Функції для UI календаря ---

    function updateMonthYearDisplay() {
        currentMonthYear.textContent = `${monthNames[currentDay.getMonth()]} ${currentDay.getFullYear()}`;
    }

    function renderDaysNav() {
        daysNav.innerHTML = '';
        const startDay = new Date(currentDay);
        startDay.setDate(currentDay.getDate() - 1); // 1 попередній, поточний, 2 наступні

        for (let i = 0; i < 4; i++) {
            const dayToDisplay = new Date(startDay);
            dayToDisplay.setDate(startDay.getDate() + i);

            const dayItem = document.createElement('div');
            dayItem.classList.add('day-item');
            dayItem.dataset.date = formatDate(dayToDisplay);

            const dayName = daysOfWeekNames[dayToDisplay.getDay()];
            const dayNumber = dayToDisplay.getDate();

            dayItem.innerHTML = `
                <span class="day-name">${dayName}</span>
                <span class="day-number">${dayNumber}</span>
            `;

            if (isSameDay(dayToDisplay, currentDay)) {
                dayItem.classList.add('active');
            }
            if (isSameDay(dayToDisplay, today)) {
                dayItem.classList.add('today');
            }

            dayItem.addEventListener('click', () => {
                currentDay = dayToDisplay;
                currentFilterCategory = 'all';
                categoryFilter.value = 'all';
                updateUI();
            });
            daysNav.appendChild(dayItem);
        }
    }

    // --- Функції для управління завданнями ---

    function renderTasksForCurrentDay() {
        taskList.innerHTML = '';
        const dateKey = formatDate(currentDay);
        let dailyTasks = tasks[dateKey] || [];

        selectedDateHeader.textContent = `Завдання на ${currentDay.getDate()} ${monthNames[currentDay.getMonth()]}`;

        updateCategoryFilter(dailyTasks);

        if (currentFilterCategory !== 'all') {
            dailyTasks = dailyTasks.filter(task =>
                task.category && task.category.toLowerCase() === currentFilterCategory.toLowerCase()
            );
        }

        // Сортування за часом
        dailyTasks.sort((a, b) => {
            const timeA = timeToMinutes(a.time);
            const timeB = timeToMinutes(b.time);

            if (timeA === -1 && timeB === -1) return 0; // Обидва без часу
            if (timeA === -1) return 1; // 'a' без часу, 'b' з часом -> 'b' раніше
            if (timeB === -1) return -1; // 'b' без часу, 'a' з часом -> 'a' раніше

            return timeA - timeB; // Сортування за часом
        });

        // Додаємо завдання в DOM, позначаючи "пройдені"
        const nowMinutes = getCurrentTimeInMinutes();
        const isCurrentDay = isSameDay(currentDay, today);
        let hasTasksBelowCurrentTime = false; // Перевіряємо, чи є завдання після поточного часу

        if (dailyTasks.length === 0) {
            const noTaskMessage = document.createElement('li');
            noTaskMessage.textContent = 'На цей день завдань немає. Додайте перше!';
            noTaskMessage.style.textAlign = 'center';
            noTaskMessage.style.fontStyle = 'italic';
            noTaskMessage.style.color = '#888';
            noTaskMessage.style.backgroundColor = 'transparent';
            noTaskMessage.style.border = 'none';
            noTaskMessage.style.boxShadow = 'none';
            taskList.appendChild(noTaskMessage);
        } else {
            dailyTasks.forEach(task => {
                const li = addTaskToDOM(task, false); // false, щоб не зберігати знову
                if (isCurrentDay && !task.completed) { // Приховуємо тільки невиконані завдання для поточного дня
                    const taskTimeMinutes = timeToMinutes(task.time);
                    if (taskTimeMinutes !== -1 && taskTimeMinutes < nowMinutes) {
                        li.classList.add('hidden');
                    } else {
                        hasTasksBelowCurrentTime = true; // Знайшли завдання, які ще не пройшли
                    }
                }
            });

            // Якщо всі завдання пройшли або їх немає, то приховані не показуємо
            if (!hasTasksBelowCurrentTime && isCurrentDay && dailyTasks.length > 0) {
                 // Всі завдання вже пройшли, або їх немає. Можна показати їх всі
                taskList.querySelectorAll('li.hidden').forEach(li => {
                    li.classList.remove('hidden');
                });
            }
        }
        updateTaskSummary();
    }

    // Функція для показу прихованих завдань при прокрутці вгору
    let lastScrollTop = 0;
    taskList.addEventListener('scroll', () => {
        const st = taskList.scrollTop || document.documentElement.scrollTop;
        // Якщо користувач прокручує вгору (swipe вниз)
        if (st < lastScrollTop) {
            taskList.querySelectorAll('li.hidden').forEach(li => {
                li.classList.remove('hidden');
            });
        }
        lastScrollTop = st <= 0 ? 0 : st; // Для mobile safari
    });


    // Додавання завдання в DOM (об'єкт taskData)
    function addTaskToDOM(taskData, saveAndRender = true) {
        const { id, text, time, description, category, completed } = taskData; // Додано id

        const li = document.createElement('li');
        li.dataset.taskId = id || Date.now(); // Використовуємо id або генеруємо новий
        li.classList.toggle('completed', completed);

        let detailsHTML = '';
        if (time || category || description) {
            detailsHTML += '<div class="task-details">';
            if (time) {
                detailsHTML += `<span class="time">${time}</span>`;
            }
            if (category) {
                detailsHTML += `<span class="category">${category}</span>`;
            }
            if (description) {
                detailsHTML += `<p class="description">${description}</p>`;
            }
            detailsHTML += '</div>';
        }

        li.innerHTML = `
            <div class="task-main-info">
                <span>${text}</span>
                <div class="task-actions">
                    <button class="edit-btn" title="Редагувати завдання"><i class="fas fa-edit"></i></button>
                    <button class="complete-btn" title="Позначити як виконане"><i class="fas fa-check"></i></button>
                    <button class="delete-btn" title="Видалити завдання"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
            ${detailsHTML}
        `;

        taskList.appendChild(li);

        // Слухачі подій для кнопок в кожному завданні
        li.querySelector('.complete-btn').addEventListener('click', () => {
            li.classList.toggle('completed');
            const dateKey = formatDate(currentDay);
            const taskInStorage = tasks[dateKey].find(t => String(t.id) === li.dataset.taskId);
            if (taskInStorage) {
                taskInStorage.completed = li.classList.contains('completed');
            }
            saveAllTasks();
            updateTaskSummary(); // Оновлення лічильника
        });

        li.querySelector('.delete-btn').addEventListener('click', () => {
            li.remove();
            const dateKey = formatDate(currentDay);
            tasks[dateKey] = tasks[dateKey].filter(t => String(t.id) !== li.dataset.taskId);
            saveAllTasks();
            renderTasksForCurrentDay(); // Перерендер, щоб оновити категорії фільтра
        });

        li.querySelector('.edit-btn').addEventListener('click', () => {
            // Заповнюємо модальне вікно даними поточного завдання
            modalTitle.textContent = 'Редагувати завдання';
            modalTaskName.value = text;
            modalTaskTime.value = time || '';
            modalTaskDescription.value = description || '';
            modalTaskCategory.value = category || '';
            editingTaskOriginalData = taskData; // Зберігаємо оригінальні дані для ідентифікації
            taskModal.style.display = 'flex';
            modalTaskName.focus();
        });

        if (saveAndRender) {
            const dateKey = formatDate(currentDay);
            if (!tasks[dateKey]) {
                tasks[dateKey] = [];
            }
            // Додаємо id до newTaskData перед збереженням
            taskData.id = taskData.id || Date.now();
            tasks[dateKey].push(taskData);
            saveAllTasks();
        }
        return li; // Повертаємо створений елемент li
    }

    function saveAllTasks() {
        localStorage.setItem('dailyPlannerTasks', JSON.stringify(tasks));
        updateTaskSummary();
    }

    // Оновлення лічильника виконаних/всіх завдань
    function updateTaskSummary() {
        const dateKey = formatDate(currentDay);
        const dailyTasks = tasks[dateKey] || [];
        const completed = dailyTasks.filter(task => task.completed).length;
        const total = dailyTasks.length;

        completedTasksCount.textContent = completed;
        totalTasksCount.textContent = total;

        // Показуємо/ховаємо кнопку очищення виконаних
        if (completed > 0) {
            clearCompletedBtn.style.display = 'flex'; // Flex, бо це button з іконкою
        } else {
            clearCompletedBtn.style.display = 'none';
        }
    }

    // Оновлення опцій фільтра категорій
    function updateCategoryFilter(dailyTasks) {
        const uniqueCategories = new Set();
        dailyTasks.forEach(task => {
            if (task.category) {
                uniqueCategories.add(task.category.toLowerCase());
            }
        });

        categoryFilter.innerHTML = '<option value="all">Всі категорії</option>';
        Array.from(uniqueCategories).sort().forEach(category => { // Сортування категорій
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categoryFilter.appendChild(option);
        });

        categoryFilter.value = currentFilterCategory;
    }

    // --- Загальне оновлення UI ---
    function updateUI() {
        updateMonthYearDisplay();
        renderDaysNav();
        renderTasksForCurrentDay(); // Ця функція також оновлює лічильник та фільтр категорій
    }

    // --- Функції для модального вікна ---

    openAddTaskModalBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Додати нове завдання';
        modalTaskName.value = '';
        modalTaskTime.value = '';
        modalTaskDescription.value = '';
        modalTaskCategory.value = '';
        editingTaskOriginalData = null; // Скидаємо, що ми не редагуємо
        taskModal.style.display = 'flex';
        modalTaskName.focus();
    });

    closeButton.addEventListener('click', () => {
        taskModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === taskModal) {
            taskModal.style.display = 'none';
        }
    });

    saveTaskBtn.addEventListener('click', () => {
        const taskName = modalTaskName.value.trim();
        const taskTime = modalTaskTime.value;
        const taskDescription = modalTaskDescription.value.trim();
        const taskCategory = modalTaskCategory.value.trim();

        if (taskName === '') {
            alert('Будь ласка, введіть назву завдання!');
            return;
        }

        const dateKey = formatDate(currentDay);

        if (editingTaskOriginalData) {
            // Редагування існуючого завдання
            const taskIndex = tasks[dateKey].findIndex(t => String(t.id) === String(editingTaskOriginalData.id));

            if (taskIndex !== -1) {
                tasks[dateKey][taskIndex] = {
                    id: editingTaskOriginalData.id, // Зберігаємо той самий ID
                    text: taskName,
                    time: taskTime,
                    description: taskDescription,
                    category: taskCategory,
                    completed: tasks[dateKey][taskIndex].completed // Зберігаємо поточний статус completed
                };
            }
            editingTaskOriginalData = null; // Скидаємо режим редагування
        } else {
            // Додавання нового завдання
            if (!tasks[dateKey]) {
                tasks[dateKey] = [];
            }
            tasks[dateKey].push({
                id: Date.now(), // Генеруємо новий унікальний ID
                text: taskName,
                time: taskTime,
                description: taskDescription,
                category: taskCategory,
                completed: false
            });
        }
        saveAllTasks();
        taskModal.style.display = 'none';
        renderTasksForCurrentDay(); // Перерендеримо список
    });

    // Enter key submit in modal
    document.querySelectorAll('#taskModal input, #taskModal textarea').forEach(input => {
        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') { // Enter не в textarea
                event.preventDefault();
                saveTaskBtn.click();
            }
        });
    });

    // --- Слухачі подій для навігації ---
    prevDayBtn.addEventListener('click', () => {
        currentDay.setDate(currentDay.getDate() - 1);
        updateUI();
    });

    nextDayBtn.addEventListener('click', () => {
        currentDay.setDate(currentDay.getDate() + 1);
        updateUI();
    });

    todayBtn.addEventListener('click', () => {
        currentDay = new Date();
        currentFilterCategory = 'all';
        categoryFilter.value = 'all';
        updateUI();
    });

    categoryFilter.addEventListener('change', (event) => {
        currentFilterCategory = event.target.value;
        renderTasksForCurrentDay();
    });

    // Очищення виконаних завдань
    clearCompletedBtn.addEventListener('click', () => {
        const dateKey = formatDate(currentDay);
        if (tasks[dateKey]) {
            const initialLength = tasks[dateKey].length;
            tasks[dateKey] = tasks[dateKey].filter(task => !task.completed);
            if (tasks[dateKey].length < initialLength) { // Якщо дійсно щось видалили
                saveAllTasks();
                renderTasksForCurrentDay();
            } else {
                alert('Немає виконаних завдань для очищення!');
            }
        }
    });

    // --- Зміна теми ---
    themeToggleBtn.addEventListener('click', () => {
        if (document.body.classList.contains('theme-light')) {
            document.body.classList.remove('theme-light');
            document.body.classList.add('theme-dark');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>'; // Змінити іконку на місяць
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('theme-dark');
            document.body.classList.add('theme-light');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>'; // Змінити іконку на сонце
            localStorage.setItem('theme', 'light');
        }
    });

    // Завантаження теми при старті
    function loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('theme-dark');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.body.classList.add('theme-light');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }


    // --- Сповіщення браузера (додаткова функція) ---
    function requestNotificationPermission() {
        if (!("Notification" in window)) {
            console.warn("Цей браузер не підтримує сповіщення.");
        } else if (Notification.permission === "granted") {
            console.log("Дозвіл на сповіщення надано.");
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("Дозвіл на сповіщення отримано!");
                    // Можна викликати функцію для планування сповіщень тут
                } else {
                    console.warn("Користувач відмовив у дозволі на сповіщення.");
                }
            });
        }
    }

    // Планування сповіщень (просте нагадування за 5 хвилин)
    function scheduleNotifications() {
        if (Notification.permission !== "granted") {
            return;
        }

        // Очистити будь-які попередні таймери, щоб уникнути дублювання
        // (Для простих таймерів це означає, що ми не можемо мати багато нагадувань одночасно,
        // для повноцінних потрібен Service Worker або логіка керування багатьма setTimeout)

        const dateKey = formatDate(today);
        const dailyTasks = tasks[dateKey] || [];
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        dailyTasks.forEach(task => {
            if (task.time && !task.completed) {
                const [taskHour, taskMinute] = task.time.split(':').map(Number);
                const taskDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), taskHour, taskMinute, 0);

                const timeDifferenceMs = taskDateTime.getTime() - now.getTime();
                const notificationTimeMs = timeDifferenceMs - (5 * 60 * 1000); // За 5 хвилин до

                if (notificationTimeMs > 0 && notificationTimeMs < (24 * 60 * 60 * 1000)) { // Якщо сповіщення в межах 24 годин
                    setTimeout(() => {
                        new Notification(`Нагадування: ${task.text}`, {
                            body: `Ваше завдання "${task.text}" розпочнеться о ${task.time}${task.category ? ' (Категорія: ' + task.category + ')' : ''}.`,
                            icon: 'https://cdn-icons-png.flaticon.com/512/2805/2805252.png' // Можна додати іконку
                        });
                    }, notificationTimeMs);
                }
            }
        });
    }

    // --- Ініціалізація ---
    loadTheme();
    updateUI();
    requestNotificationPermission(); // Запитуємо дозвіл на сповіщення
    // Плануємо сповіщення при завантаженні сторінки для поточного дня
    scheduleNotifications();
    // Переплановуємо сповіщення кожен ранок (наприклад, опціонально, якщо додаток залишається відкритим)
    // setInterval(scheduleNotifications, 24 * 60 * 60 * 1000); // Кожен день

});