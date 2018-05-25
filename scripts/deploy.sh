#!/bin/sh

now="npx now --debug --token=$NOW_TOKEN"

echo "$ now rm --safe --yes wip"
$now rm --safe --yes wip

echo "$ now --public"
$now --public

echo "$ now alias"
$now alias
