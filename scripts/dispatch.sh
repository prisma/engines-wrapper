#!/bin/bash

curl -H "Authorization: token $GH_TOKEN" \
--request POST \
--data '{"event_type": "publish-engines", "client_payload": {"branch": "master", "commit": "b2bef342956c5723ad14e18d8d1b6307aded7c1e"}}' \
https://api.github.com/repos/prisma/engines-wrapper/dispatches
