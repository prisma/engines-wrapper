#!/bin/bash

curl -H "Authorization: token $GH_TOKEN" \
--request POST \
--data '{"event_type": "publish-engines", "client_payload": {"branch": "master", "commit": "0c2898954d761d1c92f304ff1b7917c601c2e3d8"}}' \
https://api.github.com/repos/prisma/engines-wrapper/dispatches
