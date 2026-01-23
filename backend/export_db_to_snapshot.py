import os
import sys
from datetime import datetime
from typing import Any
CURRENT_DIR = os.path.dirname(__file__)
sys.path.insert(0, CURRENT_DIR)
from app.database import db  # type: ignore


def py_literal(value: Any) -> str:
    try:
        from bson import ObjectId  # type: ignore
    except Exception:
        ObjectId = None  # type: ignore

    if ObjectId is not None and isinstance(value, ObjectId):
        return f'ObjectId("{str(value)}")'
    if isinstance(value, datetime):
        return f'datetime.fromisoformat("{value.isoformat()}")'
    if isinstance(value, dict):
        items = []
        for k, v in value.items():
            items.append(f'{repr(k)}: {py_literal(v)}')
        return '{' + ', '.join(items) + '}'
    if isinstance(value, (list, tuple)):
        inner = ', '.join(py_literal(v) for v in value)
        open_b, close_b = ('[', ']') if isinstance(value, list) else ('(', ')')
        return f'{open_b}{inner}{close_b}'
    return repr(value)


def dump_collection(name: str) -> str:
    docs = list(db[name].find({}))
    return py_literal(docs)


def main() -> None:
    out_path = os.path.join(CURRENT_DIR, 'seed_snapshot.py')
    collections = [
        'categories',
        'citizens',
        'service_requests',
        'comments',
        'ratings',
        'performance_logs',
        'service_agents',
        'geo_feeds',
    ]

    header = (
        '"""\n'
        'Auto-generated snapshot of MongoDB to be used by seed_complete.py.\n'
        f'Generated at: {datetime.utcnow().isoformat()}Z\n'
        'Do not edit by hand. Re-generate using export_db_to_snapshot.py.\n'
        '"""\n'
        'from datetime import datetime\n'
        'from bson import ObjectId\n\n'
        'def get_seed_data():\n'
        '    return {\n'
    )

    body_parts = []
    for name in collections:
        data_literal = dump_collection(name)
        body_parts.append(f'        {repr(name)}: {data_literal}')

    footer = (
        '    }\n'
    )

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(header)
        f.write(',\n'.join(body_parts))
        f.write('\n')
        f.write(footer)

    print(f"✅ Snapshot written to {out_path}")


if __name__ == '__main__':
    main()
