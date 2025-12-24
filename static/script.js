const API_BASE = '/';

document.addEventListener('DOMContentLoaded', function () {
    loadServices();

    // Переключение формы добавления услуги
    document.getElementById('toggle-create-form').addEventListener('click', () => {
        document.getElementById('create-section').classList.toggle('d-none');
    });

    // Превью изображения при создании
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    if (imageUpload) {
        imageUpload.addEventListener('change', () => {
            const file = imageUpload.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                    imagePreview.src = e.target.result;
                    imagePreview.classList.remove('d-none');
                };
                reader.readAsDataURL(file);
            } else {
                imagePreview.classList.add('d-none');
            }
        });
    }

    // Превью изображения при редактировании
    const updateImageUpload = document.getElementById('update-image-upload');
    const updateImagePreview = document.getElementById('update-image-preview');
    if (updateImageUpload) {
        updateImageUpload.addEventListener('change', () => {
            const file = updateImageUpload.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => {
                    updateImagePreview.src = e.target.result;
                    updateImagePreview.classList.remove('d-none');
                };
                reader.readAsDataURL(file);
            } else {
                updateImagePreview.classList.add('d-none');
            }
        });
    }

    // Создание новой услуги с возможной загрузкой изображения
    document.getElementById('create-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        let image_url = null;
        const fileInput = document.getElementById('image-upload');
        if (fileInput.files[0]) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            try {
                const res = await fetch(`${API_BASE}upload-image`, { method: 'POST', body: formData });
                if (!res.ok) throw new Error('Не удалось загрузить изображение');
                image_url = (await res.json()).image_url;
            } catch (err) {
                alert('Ошибка загрузки изображения: ' + err.message);
                return;
            }
        }

        const data = {
            title: document.getElementById('title').value,
            details: document.getElementById('details').value || null,
            service_type: document.getElementById('service-type').value,
            provider_name: document.getElementById('provider-name').value,
            phone: document.getElementById('phone').value,
            price: parseInt(document.getElementById('price').value),
            available_at: new Date(document.getElementById('available-at').value).toISOString(),
            is_booked: false,
            image_url
        };

        try {
            await fetch(`${API_BASE}services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            loadServices();
            document.getElementById('create-form').reset();
            imagePreview.classList.add('d-none');
            document.getElementById('create-section').classList.add('d-none');
        } catch (err) {
            alert('Ошибка при создании услуги');
            console.error(err);
        }
    });

    // Обновление существующей услуги с поддержкой изображения
    document.getElementById('save-update-btn').addEventListener('click', async () => {
        const id = document.getElementById('update-id').value;
        let image_url = null;

        const fileInput = document.getElementById('update-image-upload');
        if (fileInput.files[0]) {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            try {
                const res = await fetch(`${API_BASE}upload-image`, { method: 'POST', body: formData });
                if (!res.ok) throw new Error('Не удалось загрузить изображение');
                image_url = (await res.json()).image_url;
            } catch (err) {
                alert('Ошибка загрузки изображения: ' + err.message);
                return;
            }
        }

        const fields = ['title', 'details', 'service_type', 'provider_name', 'phone', 'price', 'available_at'];
        const data = {};

        for (const field of fields) {
            const el = document.getElementById(`update-${field.replace('_', '-')}`);
            if (el && el.value !== '') {
                if (field === 'price') {
                    data[field] = parseInt(el.value);
                } else if (field === 'details') {
                    data[field] = el.value || null;
                } else if (field === 'available_at') {
                    data[field] = new Date(el.value).toISOString();
                } else {
                    data[field] = el.value;
                }
            }
        }

        // Обновляем image_url только если файл был выбран (включая удаление при пустом значении)
        if (fileInput.files.length > 0) {
            data.image_url = image_url;
        }

        try {
            const response = await fetch(`${API_BASE}services/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Ошибка сервера');
            }

            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            loadServices();
        } catch (err) {
            alert('Ошибка при обновлении: ' + err.message);
            console.error(err);
        }
    });
});

// Загрузка и отображение списка услуг
function loadServices() {
    fetch(`${API_BASE}services`)
        .then(response => response.json())
        .then(services => {
            const container = document.getElementById('services-list');
            container.innerHTML = '';

            services.forEach(service => {
                const isBooked = service.is_booked;
                const card = document.createElement('div');
                card.className = `col-md-6 col-lg-4 mb-4`;

                // Добавляем изображение, если оно есть
                const imgHtml = service.image_url
                    ? `<img src="${service.image_url}" class="card-img-top" style="height: 200px; object-fit: cover;" alt="Фото услуги">`
                    : '';

                card.innerHTML = `
                    <div class="card h-100 shadow-sm ${isBooked ? 'booked' : ''}" id="service-card-${service.id}">
                        ${imgHtml}
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title">${service.title}</h5>
                                <span class="booking-status ${isBooked ? 'status-booked' : 'status-available'}">
                                    ${isBooked ? 'Забронировано' : 'Свободно'}
                                </span>
                            </div>
                            <p class="card-text">${service.details || 'Нет описания'}</p>
                            <ul class="list-group list-group-flush mb-3">
                                <li class="list-group-item d-flex justify-content-between"><span>Тип:</span><strong>${service.service_type}</strong></li>
                                <li class="list-group-item d-flex justify-content-between"><span>Исполнитель:</span><span>${service.provider_name}</span></li>
                                <li class="list-group-item d-flex justify-content-between"><span>Телефон:</span><a href="tel:${service.phone}">${service.phone}</a></li>
                                <li class="list-group-item d-flex justify-content-between"><span>Цена:</span><strong>${service.price} ₽</strong></li>
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

            // Назначаем обработчики для всех кнопок
            document.querySelectorAll('.edit-btn').forEach(btn =>
                btn.addEventListener('click', () => openEditModal(btn.dataset.id))
            );
            document.querySelectorAll('.delete-btn').forEach(btn =>
                btn.addEventListener('click', () => deleteService(btn.dataset.id))
            );
            document.querySelectorAll('.book-btn').forEach(btn =>
                btn.addEventListener('click', () => bookService(btn.dataset.id))
            );
            document.querySelectorAll('.unbook-btn').forEach(btn =>
                btn.addEventListener('click', () => unbookService(btn.dataset.id))
            );
        })
        .catch(err => console.error('Ошибка загрузки услуг:', err));
}

// Удаление услуги
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

// Бронирование услуги
async function bookService(id) {
    try {
        const res = await fetch(`${API_BASE}services/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_booked: true })
        });
        if (res.ok) {
            updateServiceUI(id, true);
        } else {
            const err = await res.json();
            alert('Ошибка: ' + (err.detail || 'Не удалось забронировать услугу'));
        }
    } catch (err) {
        alert('Ошибка при бронировании');
        console.error(err);
    }
}

// Отмена бронирования
async function unbookService(id) {
    if (!confirm('Отменить бронирование?')) return;
    try {
        const res = await fetch(`${API_BASE}services/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_booked: false })
        });
        if (res.ok) {
            updateServiceUI(id, false);
        } else {
            const err = await res.json();
            alert('Ошибка: ' + (err.detail || 'Не удалось отменить бронь'));
        }
    } catch (err) {
        alert('Ошибка при отмене брони');
        console.error(err);
    }
}

// Обновление визуального состояния карточки услуги
function updateServiceUI(serviceId, isBooked) {
    const card = document.getElementById(`service-card-${serviceId}`);
    if (!card) return;

    card.classList.toggle('booked', isBooked);

    const status = card.querySelector('.booking-status');
    if (status) {
        status.textContent = isBooked ? 'Забронировано' : 'Свободно';
        status.className = `booking-status ${isBooked ? 'status-booked' : 'status-available'}`;
    }

    const bookBtn = card.querySelector('.book-btn');
    const unbookBtn = card.querySelector('.unbook-btn');
    if (bookBtn) {
        bookBtn.disabled = isBooked;
        bookBtn.textContent = isBooked ? '✅ Забронировано' : '📅 Забронировать';
    }
    if (unbookBtn) unbookBtn.disabled = !isBooked;
}

// Открытие модального окна редактирования
function openEditModal(id) {
    fetch(`${API_BASE}services/${id}`)
        .then(res => res.json())
        .then(service => {
            document.getElementById('update-id').value = service.id;
            document.getElementById('update-title').value = service.title || '';
            document.getElementById('update-details').value = service.details || '';
            document.getElementById('update-service-type').value = service.service_type || '';
            document.getElementById('update-provider-name').value = service.provider_name || '';
            document.getElementById('update-phone').value = service.phone || '';
            document.getElementById('update-price').value = service.price || '';
            document.getElementById('update-available-at').value = new Date(service.available_at).toISOString().slice(0, 16);

            // Устанавливаем превью изображения, если оно есть
            const preview = document.getElementById('update-image-preview');
            if (service.image_url) {
                preview.src = service.image_url;
                preview.classList.remove('d-none');
            } else {
                preview.classList.add('d-none');
            }
            document.getElementById('update-image-upload').value = '';

            new bootstrap.Modal(document.getElementById('editModal')).show();
        })
        .catch(err => {
            alert('Ошибка загрузки данных для редактирования');
            console.error(err);
        });
}

// Глобальные функции (для совместимости, если используются в HTML)
window.bookService = bookService;
window.unbookService = unbookService;
window.editService = openEditModal;
window.deleteService = deleteService;