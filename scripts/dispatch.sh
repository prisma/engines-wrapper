#!/bin/bash

curl -H "Authorization: token $GH_TOKEN" \
--request POST \
--data '{"event_type": "publish-engines", "client_payload": {"branch": "master", "commit": "95b10778266ed1eb3013872ab5c09e460bd941fe"}}' \
https://api.github.com/repos/prisma/engines-wrapper/dispatches
