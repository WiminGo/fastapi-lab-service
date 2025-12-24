const API_BASE = '/';

document.addEventListener('DOMContentLoaded', function () {
    loadServices();

    document.getElementById('toggle-create-form').addEventListener('click', () => {
        const createSection = document.getElementById('create-section');
        if (createSection) {
            createSection.classList.toggle('d-none');
        }
    });

    // Обработка формы создания
    document.getElementById('create-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            title: document.getElementById('title').value,
            details: document.getElementById('details').value || null,
            service_type: document.getElementById('service-type').value,
            provider_name: document.getElementById('provider-name').value,
            phone: document.getElementById('phone').value,
            price: parseInt(document.getElementById('price').value),
            available_at: new Date(document.getElementById('available-at').value).toISOString(),
            is_booked: false  // Новая услуга всегда не забронирована
        };

        try {
            await fetch(`${API_BASE}services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            loadServices(); // Обновляем список
            document.getElementById('create-form').reset();
            document.getElementById('create-section').classList.add('d-none');
        } catch (err) {
            alert('Ошибка при создании услуги');
            console.error(err);
        }
    });

    // Обработка сохранения изменений - ИСПРАВЛЕННЫЙ КОД
    document.getElementById('save-update-btn').addEventListener('click', async () => {
        const id = document.getElementById('update-id').value;
        const formData = {};
        const fields = ['title', 'details', 'service_type', 'provider_name', 'phone', 'price', 'available_at', 'is_booked'];

        fields.forEach(field => {
            const elementId = `update-${field.replace('_', '-')}`; // правильный ID элемента
            const element = document.getElementById(elementId);

            if (element) {
                let value = element.value;

                // Обработка разных типов полей
                if (field === 'price' && value !== '') {
                    value = parseInt(value);
                }
                if (field === 'details' && value === '') {
                    value = null;
                }
                if (field === 'available_at' && value !== '') {
                    value = new Date(value).toISOString();
                }
                if (field === 'is_booked' && element.type === 'checkbox') {
                    value = element.checked;
                }

                // Добавляем поле в formData только если значение не пустое
                if (value !== '' && value != null) {
                    formData[field] = value; // Используем оригинальное имя поля для API
                }
            }
        });

        try {
            const response = await fetch(`${API_BASE}services/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка сервера');
            }

            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            if (modal) {
                modal.hide();
            }
            loadServices();
        } catch (err) {
            alert('Ошибка при обновлении услуги: ' + err.message);
            console.error(err);
        }
    });
});

function loadServices() {
    fetch(`${API_BASE}services`)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('services-list');
            container.innerHTML = '';

            data.forEach(service => {
                const isBooked = service.is_booked || false;
                const card = document.createElement('div');
                card.className = 'col-md-6 col-lg-4 mb-4';
                card.innerHTML = `
                    <div class="card h-100 shadow-sm ${isBooked ? 'booked' : ''}" id="service-card-${service.id}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title">${service.title}</h5>
                                <span class="booking-status ${isBooked ? 'status-booked' : 'status-available'}">
                                    ${isBooked ? 'Забронировано' : 'Свободно'}
                                </span>
                            </div>
                            <p class="card-text">${service.details || 'Нет описания'}</p>
                            <ul class="list-group list-group-flush mb-3">
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Тип:</span>
                                    <strong>${service.service_type}</strong>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Исполнитель:</span>
                                    <span>${service.provider_name}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Телефон:</span>
                                    <a href="tel:${service.phone}">${service.phone}</a>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Цена:</span>
                                    <strong>${service.price} ₽</strong>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Доступно с:</span>
                                    <span>${new Date(service.available_at).toLocaleString('ru-RU')}</span>
                                </li>
                            </ul>
                        </div>
                        <div class="card-footer d-flex flex-wrap gap-2">
                            <button class="btn btn-warning btn-sm edit-btn" data-id="${service.id}">✏️ Редактировать</button>
                            <button class="btn btn-danger btn-sm delete-btn" data-id="${service.id}">🗑️ Удалить</button>
                            <button class="btn btn-success btn-sm book-btn" data-id="${service.id}" ${isBooked ? 'disabled' : ''}>
                                ${isBooked ? '✅ Забронировано' : '📅 Забронировать'}
                            </button>
                            <button class="btn btn-secondary btn-sm unbook-btn" data-id="${service.id}" ${!isBooked ? 'disabled' : ''}>
                                ❌ Отменить бронь
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });

            // Обработчики кнопок
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => openEditModal(btn.dataset.id));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteService(btn.dataset.id));
            });
            document.querySelectorAll('.book-btn').forEach(btn => {
                btn.addEventListener('click', () => bookService(btn.dataset.id));
            });
            document.querySelectorAll('.unbook-btn').forEach(btn => {
                btn.addEventListener('click', () => unbookService(btn.dataset.id));
            });
        })
        .catch(err => console.error('Ошибка загрузки услуг:', err));
}

async function deleteService(id) {
    if (!confirm('Вы уверены?')) return;

    try {
        await fetch(`${API_BASE}services/${id}`, { method: 'DELETE' });
        loadServices();
    } catch (err) {
        alert('Ошибка при удалении услуги');
        console.error(err);
    }
}

async function bookService(id) {
    try {
        const response = await fetch(`${API_BASE}services/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_booked: true })
        });

        if (response.ok) {
            updateServiceUI(id, true);
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.detail || 'Не удалось забронировать услугу'}`);
        }
    } catch (err) {
        alert('Ошибка при бронировании услуги');
        console.error(err);
    }
}

async function unbookService(id) {
    if (!confirm('Отменить бронирование?')) return;

    try {
        const response = await fetch(`${API_BASE}services/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_booked: false })
        });

        if (response.ok) {
            updateServiceUI(id, false);
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.detail || 'Не удалось отменить бронирование'}`);
        }
    } catch (err) {
        alert('Ошибка при отмене бронирования');
        console.error(err);
    }
}

function updateServiceUI(serviceId, isBooked) {
    const cardElement = document.getElementById(`service-card-${serviceId}`);
    if (!cardElement) return;

    // Обновляем класс карточки
    if (isBooked) {
        cardElement.classList.add('booked');
    } else {
        cardElement.classList.remove('booked');
    }

    // Находим элементы внутри карточки
    const statusBadge = cardElement.querySelector('.booking-status');
    const bookBtn = cardElement.querySelector('.book-btn');
    const unbookBtn = cardElement.querySelector('.unbook-btn');

    // Обновляем статус
    if (statusBadge) {
        if (isBooked) {
            statusBadge.textContent = 'Забронировано';
            statusBadge.className = 'booking-status status-booked';
        } else {
            statusBadge.textContent = 'Свободно';
            statusBadge.className = 'booking-status status-available';
        }
    }

    // Обновляем кнопки
    if (bookBtn) {
        bookBtn.disabled = isBooked;
        bookBtn.textContent = isBooked ? '✅ Забронировано' : '📅 Забронировать';
    }

    if (unbookBtn) {
        unbookBtn.disabled = !isBooked;
    }
}

function openEditModal(id) {
    fetch(`${API_BASE}services/${id}`)
        .then(response => response.json())
        .then(service => {
            document.getElementById('update-id').value = service.id;
            document.getElementById('update-title').value = service.title || '';
            document.getElementById('update-details').value = service.details || '';
            document.getElementById('update-service-type').value = service.service_type || '';
            document.getElementById('update-provider-name').value = service.provider_name || '';
            document.getElementById('update-phone').value = service.phone || '';
            document.getElementById('update-price').value = service.price || '';
            // Преобразуем дату для datetime-local поля
            const availableAt = new Date(service.available_at);
            const formattedDate = availableAt.toISOString().slice(0, 16);
            document.getElementById('update-available-at').value = formattedDate;

            // Для поля is_booked можно добавить checkbox в модалку, если нужно
            // Но пока его нет в форме, так что не добавляем

            const modal = new bootstrap.Modal(document.getElementById('editModal'));
            modal.show();
        })
        .catch(err => {
            alert('Ошибка при загрузке данных для редактирования');
            console.error(err);
        });
}

// Делаем функции глобальными для использования в inline обработчиках
window.bookService = bookService;
window.unbookService = unbookService;
window.editService = openEditModal;
window.deleteService = deleteService;