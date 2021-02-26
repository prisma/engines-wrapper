#!/bin/bash

curl -H "Authorization: token $GH_TOKEN" \
--request POST \
--data '{"event_type": "publish-engines", "client_payload": {"branch": "master", "commit": "3138a37812de53df8f590343cb9b9fbbe2e33634"}}' \
https://api.github.com/repos/prisma/engines-wrapper/dispatches
