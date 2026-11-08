from contextlib import contextmanager

from scripts import seed


def test_local_seed_only_initializes_an_empty_database(monkeypatch):
    calls = []

    class Session:
        user_id = 123

        def scalar(self, statement):
            return self.user_id

    session = Session()

    @contextmanager
    def scope():
        yield session

    monkeypatch.setattr(seed, "session_scope", scope)
    monkeypatch.setattr(seed, "run_seed", lambda *args: calls.append("seed"))
    monkeypatch.setattr(seed, "seed_images", lambda *args: calls.append("images"))
    monkeypatch.setattr(seed, "snapshot_counts", lambda *args: {})
    monkeypatch.setattr("sys.argv", ["seed.py", "--if-empty", "--check"])
    assert seed.main() == 0
    assert calls == []

    session.user_id = None
    assert seed.main() == 0
    assert calls == ["seed", "images", "seed", "images"]
