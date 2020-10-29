#!/bin/bash

curl -H "Authorization: token $GH_TOKEN" \
--request POST \
--data '{"event_type": "publish-engines", "client_payload": {"branch": "2.10.x", "commit": "9f0f427d33d54628b9df976d79afbff038c26b1b"}}' \
https://api.github.com/repos/prisma/engines-wrapper/dispatches
