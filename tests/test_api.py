import os
import sys
import tempfile
import pytest
from fastapi.testclient import TestClient

# Добавляем корень проекта в sys.path, чтобы импортировать app_main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app_main


@pytest.fixture
def client():
    # 1. Создаём временный файл для БД
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    # 2. Сохраняем оригинальный DATABASE_URL
    original_db_url = os.environ.get("DATABASE_URL")

    # 3. Устанавливаем новый URL для тестовой БД
    test_db_url = f"sqlite+aiosqlite:///{db_path}"
    os.environ["DATABASE_URL"] = test_db_url

    # 4. Перезагружаем модуль app_main, чтобы он создал НОВЫЙ движок и приложение
    import importlib
    importlib.reload(app_main)

    # 5. Получаем новое приложение
    app = app_main.app

    # 6. Запускаем TestClient — lifespan создаст таблицы
    with TestClient(app) as c:
        yield c

    # 7. Очищаем: восстанавливаем старый DATABASE_URL
    if original_db_url is not None:
        os.environ["DATABASE_URL"] = original_db_url
    else:
        os.environ.pop("DATABASE_URL", None)

    # 8. Удаляем временный файл
    try:
        os.unlink(db_path)
    except OSError:
        pass  # Игнорируем, если файл уже удалён


# ТЕСТЫ

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_service_success(client):
    payload = {
        "title": "Фотосессия в Москве",
        "details": "Съёмка в парке Горького",
        "service_type": "photo",
        "provider_name": "Vera",
        "phone": "+79931255265",
        "price": 150,
        "available_at": "2026-05-01T10:00:00Z"
    }
    response = client.post("/services", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["phone"] == "+79931255265"
    assert "id" in data


def test_create_service_invalid_phone(client):
    payload = {
        "title": "Фотосессия",
        "service_type": "photo",
        "provider_name": "Vera",
        "phone": "12345",
        "price": 100,
        "available_at": "2026-05-01T10:00:00Z"
    }
    response = client.post("/services", json=payload)
    assert response.status_code == 422
    assert any("Номер телефона должен быть в международном формате" in err.get("msg", "")
               for err in response.json().get("detail", []))


def test_create_service_past_date(client):
    payload = {
        "title": "Фотосессия",
        "service_type": "photo",
        "provider_name": "Vera",
        "phone": "+79001234567",
        "price": 100,
        "available_at": "2020-01-01T10:00:00Z"
    }
    response = client.post("/services", json=payload)
    assert response.status_code == 422
    assert any("не может быть в прошлом" in err.get("msg", "")
               for err in response.json().get("detail", []))


def test_get_service(client):
    payload = {
        "title": "Тестовая услуга",
        "service_type": "photo",
        "provider_name": "Vera",
        "phone": "+79161234567",
        "price": 200,
        "available_at": "2026-05-01T10:00:00Z"
    }
    create_resp = client.post("/services", json=payload)
    assert create_resp.status_code == 201
    service_id = create_resp.json()["id"]

    response = client.get(f"/services/{service_id}")
    assert response.status_code == 200
    assert response.json()["phone"] == "+79161234567"


def test_get_service_not_found(client):
    response = client.get("/services/999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Услуга не найдена"


def test_list_services(client):
    client.post("/services", json={
        "title": "Photosession", "service_type": "photo", "provider_name": "Vera",
        "phone": "+79001112233", "price": 100, "available_at": "2026-05-01T10:00:00Z"
    })
    client.post("/services", json={
        "title": "Photosession", "service_type": "photo", "provider_name": "Vera",
        "phone": "+79004445566", "price": 200, "available_at": "2026-05-01T10:00:00Z"
    })

    response = client.get("/services")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["price"] <= data[1]["price"]


def test_update_service(client):
    payload = {
        "title": "Photosession", "service_type": "photo", "provider_name": "Vera",
        "phone": "+79260001122", "price": 100, "available_at": "2026-05-01T10:00:00Z"
    }
    create_resp = client.post("/services", json=payload)
    assert create_resp.status_code == 201
    service_id = create_resp.json()["id"]

    response = client.patch(f"/services/{service_id}", json={"phone": "+79269998877"})
    assert response.status_code == 200
    assert response.json()["phone"] == "+79269998877"


def test_delete_service(client):
    payload = {
        "title": "To delete", "service_type": "photo", "provider_name": "Vera",
        "phone": "+79876543210", "price": 100, "available_at": "2026-05-01T10:00:00Z"
    }
    create_resp = client.post("/services", json=payload)
    assert create_resp.status_code == 201
    service_id = create_resp.json()["id"]

    response = client.delete(f"/services/{service_id}")
    assert response.status_code == 204

    response = client.get(f"/services/{service_id}")
    assert response.status_code == 404


def test_serve_index_html(client):
    static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "index.html")
    if not os.path.exists(static_path):
        os.makedirs(os.path.dirname(static_path), exist_ok=True)
        with open(static_path, "w", encoding="utf-8") as f:
            f.write("<html><head><title>Service PROvision</title></head><body>Добро пожаловать!</body></html>")

    response = client.get("/")
    assert response.status_code == 200
    assert "Service PROvision" in response.text