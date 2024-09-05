# pocketbase-logging
This project aims to provide an all-in-one kit to stand up your own log aggregator using [pocketbase](https://pocketbase.io/). The schema does not enforce any opinionated relationships to accommodate as many contexts as possible and being cheap on inserts and reads.


# Setup

- Quickstart
    1. Clone the project
    2. Run `docker compose up`
    3. Navigate to `http://0.0.0.0:8090/_`, create an account
    4. Go to Settings > Import collections and load `pb_schema`

# Usage
Example usage using custom endpoint (`0.0.0.0:8090`)
```
$ curl -X POST 0.0.0.0:8090/api/custom/log \
    -H "Content-Type: application/json" \
    -d '{
        "title": "Test Log",
        "detail": "This is a test log",
        "channel": "shell",
        "level": "info",
        "submitted_on": "2021-05-01T00:00:00Z",
        "source": {
            "source": "curl",
            "tenant": "admin"
        },
        "system": {
            "host": "macbook.local",
            "thread": "1"
        },
        "user": {
            "identifier": "user@example.com",
            "session": "test",
            "session_inc": 123,
            "platform": "macos"
        }
    }'
```

Example usage using Js SDK
```
const data = {
  "title": "Test Log",
  "detail": "This is a test log",
  "channel": "shell",
  "level": "info",
  "submitted_on": "2021-05-01T00:00:00Z",
  "session": "test",
  "session_inc": 123,
  "source": "sdk",
  "tenant": "admin"
  "host": "macbook.local",
  "thread": "1"
  "identifier": "user@example.com",
  "platform": "macos"
};

const record = await pb.collection('log').create(data);`
```

## Related Repositories

- [PocketBase](https://github.com/pocketbase/pocketbase)
- [pocketbase-docker](https://github.com/muchobien/pocketbase-docker)