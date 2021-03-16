#!/bin/bash

curl -H "Authorization: token $GH_TOKEN" \
--request POST \
--data '{"event_type": "publish-engines", "client_payload": {"branch": "integration/napi-tests", "commit": "e2a0535824021eab0bd0154e6f757793f28492b9"}}' \
https://api.github.com/repos/prisma/engines-wrapper/dispatches
