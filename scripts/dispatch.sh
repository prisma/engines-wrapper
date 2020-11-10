#!/bin/bash

curl -H "Authorization: token $GH_TOKEN" \
--request POST \
--data '{"event_type": "publish-engines", "client_payload": {"branch": "query-engine/second_coming_of_reserved_words", "commit": "5f311a3c26309b4d6cd89438cb1527011ba02057"}}' \
https://api.github.com/repos/prisma/engines-wrapper/dispatches
