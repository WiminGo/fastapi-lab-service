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
            available_at: new Date(document.getElementById('available-at').value).toISOString()
        };

        try {
            await fetch(`${API_BASE}services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            loadServices(); // Обновляем список
            document.getElementById('create-form').reset();
        } catch (err) {
            alert('Ошибка при создании услуги');
            console.error(err);
        }
    });

    // Обработка сохранения изменений
    document.getElementById('save-update-btn').addEventListener('click', async () => {
        const id = document.getElementById('update-id').value;
        const formData = {};
        const fields = ['title', 'details', 'service_type', 'provider_name', 'phone', 'price', 'available_at'];
        fields.forEach(field => {
            const element = document.getElementById(`update-${field}`);
            let value = element.value;

            if (element.type === 'number') value = parseInt(value);
            if (element.type === 'textarea' && !value) value = null;
            if (field === 'available_at') value = new Date(value).toISOString();

            if (value !== '' && value != null) {
                formData[field.replace('_', '-')] = value; // чтобы соответствовало API
            }
        });

        try {
            await fetch(`${API_BASE}services/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            modal.hide();
            loadServices();
        } catch (err) {
            alert('Ошибка при обновлении услуги');
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
                const card = document.createElement('div');
                card.className = 'col-md-6 col-lg-4 mb-4';
                card.innerHTML = `
                    <div class="card h-100 shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title">${service.title}</h5>
                            <p class="card-text">${service.details || 'Нет описания'}</p>
                            <p><strong>Тип:</strong> ${service.service_type}</p>
                            <p><strong>Цена:</strong> ${service.price} руб.</p>
                            <p><strong>Исполнитель:</strong> ${service.provider_name}</p>
                            <p><strong>Телефон:</strong> ${service.phone}</p>
                            <p><strong>Доступно:</strong> ${new Date(service.available_at).toLocaleString()}</p>
                        </div>
                        <div class="card-footer d-flex justify-content-between">
                            <button class="btn btn-warning btn-sm edit-btn" data-id="${service.id}">Редактировать</button>
                            <button class="btn btn-danger btn-sm delete-btn" data-id="${service.id}">Удалить</button>
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
            document.getElementById('update-available-at').value = new Date(service.available_at).toISOString().slice(0, 16);

            const modal = new bootstrap.Modal(document.getElementById('editModal'));
            modal.show();
        })
        .catch(err => {
            alert('Ошибка при загрузке данных для редактирования');
            console.error(err);
        });
}