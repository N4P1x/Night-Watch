from backend.utils.db import sanitize_search


class TestSanitizeSearch:
    def test_strips_wildcards(self):
        assert sanitize_search("hello%world_") == "helloworld"

    def test_no_change_without_wildcards(self):
        assert sanitize_search("hello world") == "hello world"

    def test_empty_string(self):
        assert sanitize_search("") == ""

    def test_only_wildcards(self):
        assert sanitize_search("%_%_") == ""
