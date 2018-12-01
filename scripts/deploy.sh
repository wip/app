#!/bin/sh
set -e

now="npx now --debug --token=$NOW_TOKEN"

echo "$ now rm --safe --yes wip"
$now rm --safe --yes wip

echo "$ now"
$now

echo "$ now alias"
$now alias
