from types import SimpleNamespace

import pytest

from scripts.seed_demo import VERSION, catalog, guard


def test_demo_initializer_refuses_daily_and_production_databases(monkeypatch):
    monkeypatch.setenv('CAMPUSLOOP_DEMO_DATASET', VERSION)
    settings = SimpleNamespace(app_env='dev', database_url='postgresql://localhost/campusloop_demo', redis_url='redis://localhost/15')
    guard(settings)
    settings.database_url = 'postgresql://localhost/campusloop'
    with pytest.raises(RuntimeError):
        guard(settings)
    settings.database_url = 'postgresql://localhost/campusloop_demo'
    settings.app_env = 'prod'
    with pytest.raises(RuntimeError):
        guard(settings)
    settings.app_env = 'dev'
    settings.redis_url = 'redis://localhost/0'
    with pytest.raises(RuntimeError):
        guard(settings)
    settings.redis_url = 'redis://localhost/15'
    monkeypatch.delenv('CAMPUSLOOP_DEMO_DATASET')
    with pytest.raises(RuntimeError):
        guard(settings)


def test_demo_images_and_copy_are_verified():
    items = catalog()
    assert len({item['key'] for item in items}) == 25
    assert sum(len(item['images']) for item in items) == 81
    assert len({image for item in items for image in item['images']}) == 81
    assert sum(item['category'] == 'SPORTS' for item in items) >= 6
