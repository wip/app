#!/bin/sh
set -e

now="npx now --debug --token=$NOW_TOKEN"

echo "$ now rm --safe --yes wip-beta"
$now rm --safe --yes wip-beta

# https://github.com/zeit/now-cli/blob/master/errors/verification-timeout.md
echo "$ now --no-verify"
$now --no-verify

echo "$ now alias --no-verify"
$now alias --no-verify
