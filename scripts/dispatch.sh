#!/bin/bash

GH_TOKEN="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"

curl -H "Authorization: token $GH_TOKEN" \
--request POST \
--data '{"event_type": "publish-engines", "client_payload": {"branch": "main", "commit": "43aefb4a29db88d246ea74e047e05571b65aa86f"}}' \
https://api.github.com/repos/prisma/engines-wrapper/dispatches
