# FastAPI Service provision Lab

Простое приложение для размещения услуг на FastAPI с SQLite

## Запуск в Docker

1. Сборка образа

```bash
docker build -t service-provision .
```

3. Запуск контейнера (с сохранением данных)

```bash
docker run --rm -p 8000:8000 -v "${PWD}:/app" service-provision
```

## Запуск тестов

1. Установка зависимостей

```bash
pip install -r requirements.txt
```

2. Запуск(локально)

```bash
pytest
```