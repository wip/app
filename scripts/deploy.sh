#!/bin/sh
set -e

now="npx now --debug --token=$NOW_TOKEN"

echo "$ now rm --safe --yes wip"
$now rm --safe --yes wip

# https://github.com/zeit/now-cli/blob/master/errors/verification-timeout.md
echo "$ now --no-verify"
$now

echo "$ now alias"
$now alias
