#!/bin/sh

now="npx now --debug --token=$NOW_TOKEN"

echo "$ now rm --safe --yes wip-bot"
$now rm --safe --yes wip-bot

echo "$ now --public"
$now --public

echo "$ now alias"
$now alias
