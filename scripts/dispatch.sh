#!/bin/bash

curl -H "Authorization: token $GH_TOKEN" \
--request POST \
--data '{"event_type": "publish-engines", "client_payload": {"branch": "integration/new-engine", "commit": "43e73b6d61a0d707a4b605daa6169624acc33b74"}}' \
https://api.github.com/repos/prisma/engines-wrapper/dispatches
