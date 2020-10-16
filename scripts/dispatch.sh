#!/bin/bash

curl -H "Authorization: token $GH_TOKEN" \
--request POST \
--data '{"event_type": "publish-engines", "client_payload": {"branch": "master", "commit": "5bea54a481a20125d6fa88ee7d7ef1ed1c4fb8a8"}}' \
https://api.github.com/repos/prisma/engines-wrapper/dispatches
